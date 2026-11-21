import {
  addIsoDays,
  backupReadLimit,
  parseBackupReservation,
  planReservationBackup,
  renderBackupWorkbook,
  type BackupAlert,
} from "@/lib/reservations/backup-workbook"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"

const reservationsCollection = "reservations"

type BackupSnapshot = {
  size: number
  docs: Array<{ id: string; data: () => Record<string, unknown> }>
}

type BackupDatabase = {
  collection: (name: string) => {
    where: (field: string, op: string, value: string) => {
      orderBy: (field: string) => {
        limit: (count: number) => {
          get: () => Promise<BackupSnapshot>
        }
      }
    }
  }
}

type BuiltBackup =
  | { ok: true; bytes: Buffer; total: number; today: number; tomorrow: number; pending: number }
  | BackupAlert

async function readDay(db: BackupDatabase, date: string) {
  return db.collection(reservationsCollection).where("date", "==", date).orderBy("preferredTime").limit(backupReadLimit).get()
}

async function buildReservationBackup(db: BackupDatabase, now = new Date()): Promise<BuiltBackup> {
  const today = todayIsoInSantiago(now)
  const tomorrow = addIsoDays(today, 1)
  const [todaySnap, tomorrowSnap] = await Promise.all([readDay(db, today), readDay(db, tomorrow)])
  if (todaySnap.size >= backupReadLimit || tomorrowSnap.size >= backupReadLimit) {
    return { ok: false, alert: "incomplete_read", count: todaySnap.size + tomorrowSnap.size }
  }
  const rows = [...todaySnap.docs, ...tomorrowSnap.docs].flatMap((doc) => {
    const parsed = parseBackupReservation(doc.id, doc.data())
    return parsed ? [parsed] : []
  })
  const plan = planReservationBackup(rows, now)
  if (!plan.ok) return plan
  const bytes = await renderBackupWorkbook(plan, now)
  if (bytes.byteLength < 64) return { ok: false, alert: "write_failed", count: plan.total }
  return { ok: true, bytes, total: plan.total, today: plan.today.length, tomorrow: plan.tomorrow.length, pending: plan.pending.length }
}

export { buildReservationBackup }
export type { BackupDatabase, BuiltBackup }
