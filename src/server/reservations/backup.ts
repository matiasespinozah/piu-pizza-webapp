import "server-only"

import { replaceBackupFile, type BackupAlert } from "@/lib/reservations/backup-workbook"
import { buildReservationBackup, type BackupDatabase } from "@/lib/reservations/backup-source"

type BackupLog = {
  info: (message: string) => void
  error: (message: string) => void
}

type BackupRun = { ok: true; total: number; today: number; tomorrow: number; pending: number } | BackupAlert

function report(result: BackupRun, log: BackupLog) {
  const line = JSON.stringify(
    result.ok
      ? { event: "reservation_backup", ok: true, total: result.total, today: result.today, tomorrow: result.tomorrow, pending: result.pending }
      : { event: "reservation_backup", ok: false, alert: result.alert, count: result.count },
  )
  if (result.ok) log.info(line)
  else log.error(line)
}

async function runReservationBackup(db: BackupDatabase, filePath: string, now = new Date(), log: BackupLog = console): Promise<BackupRun> {
  let result: BackupRun
  try {
    const built = await buildReservationBackup(db, now)
    if (!built.ok) result = built
    else {
      try {
        await replaceBackupFile(filePath, built.bytes)
        result = { ok: true, total: built.total, today: built.today, tomorrow: built.tomorrow, pending: built.pending }
      } catch {
        result = { ok: false, alert: "write_failed", count: built.total }
      }
    }
  } catch {
    result = { ok: false, alert: "read_failed", count: null }
  }
  report(result, log)
  return result
}

export { runReservationBackup }
export type { BackupRun }
