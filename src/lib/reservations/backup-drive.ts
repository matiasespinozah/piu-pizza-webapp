import type { BuiltBackup } from "@/lib/reservations/backup-source"
import { buildReservationBackup, type BackupDatabase } from "@/lib/reservations/backup-source"

const backupDriveId = "0AOGhjSyhqHexUk9PVA"
const backupServiceAccount = "piu-respaldo-reservas@piu-pizza-cl.iam.gserviceaccount.com"
const backupFileName = "PIU_Respaldo_Reservas.xlsx"
const backupPreviousName = "PIU_Respaldo_Reservas.anterior.xlsx"
const spreadsheetMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

type DriveFile = {
  id: string
  name?: string
  createdTime?: string
}

type BackupDrive = {
  list: (name: string) => Promise<DriveFile[]>
  create: (name: string, bytes: Buffer) => Promise<DriveFile>
  update: (id: string, bytes: Buffer) => Promise<void>
  download: (id: string) => Promise<Buffer>
}

type DrivePublishAlert = "permission_denied" | "connection_failed" | "concurrent_update" | "not_found" | "write_failed" | "generation_failed"

type DrivePublishResult = { ok: true; fileId: string; created: boolean; duplicate: boolean } | { ok: false; alert: DrivePublishAlert }

type BackupLog = {
  info: (message: string) => void
  error: (message: string) => void
}

type DriveBackupResult =
  | { ok: true; total: number; today: number; tomorrow: number; pending: number; fileId: string; created: boolean; duplicate: boolean }
  | { ok: false; alert: string; count: number | null }

function driveNameQuery(name: string, parentId: string) {
  const safeName = name.replaceAll("\\", "\\\\").replaceAll("'", "\\'")
  const safeParent = parentId.replaceAll("'", "\\'")
  return `name = '${safeName}' and trashed = false and '${safeParent}' in parents`
}

function statusOf(error: unknown) {
  if (typeof error !== "object" || error == null) return null
  const record = error as { status?: unknown; code?: unknown; response?: { status?: unknown } }
  if (typeof record.status === "number") return record.status
  if (typeof record.code === "number") return record.code
  if (typeof record.response?.status === "number") return record.response.status
  return null
}

function networkCode(error: unknown) {
  if (typeof error !== "object" || error == null) return null
  const code = (error as { code?: unknown }).code
  return typeof code === "string" ? code : null
}

function publishAlert(error: unknown): DrivePublishAlert {
  const status = statusOf(error)
  const code = networkCode(error)
  if (status === 401 || status === 403) return "permission_denied"
  if (status === 412 || status === 409) return "concurrent_update"
  if (status === 404) return "not_found"
  if (status === 429 || (status != null && status >= 500)) return "connection_failed"
  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "ECONNREFUSED") return "connection_failed"
  return "write_failed"
}

function oldest(files: DriveFile[]) {
  return [...files].sort((left, right) => (left.createdTime ?? "").localeCompare(right.createdTime ?? "") || left.id.localeCompare(right.id))[0]
}

async function keepPreviousCopy(drive: BackupDrive, current: DriveFile) {
  const bytes = await drive.download(current.id)
  if (bytes.byteLength < 64) throw Object.assign(new Error("drive_request_failed"), { status: 502 })
  const previous = await drive.list(backupPreviousName)
  if (previous.length === 0) {
    await drive.create(backupPreviousName, bytes)
    return
  }
  const target = oldest(previous)
  if (!target) throw Object.assign(new Error("drive_request_failed"), { status: 502 })
  await drive.update(target.id, bytes)
}

async function publishReservationWorkbook(drive: BackupDrive, bytes: Buffer): Promise<DrivePublishResult> {
  if (bytes.byteLength < 64) return { ok: false, alert: "generation_failed" }
  let files: DriveFile[]
  try {
    files = await drive.list(backupFileName)
  } catch (error) {
    return { ok: false, alert: publishAlert(error) }
  }
  if (files.length === 0) {
    try {
      const created = await drive.create(backupFileName, bytes)
      if (!created.id) return { ok: false, alert: "write_failed" }
      return { ok: true, fileId: created.id, created: true, duplicate: false }
    } catch (error) {
      return { ok: false, alert: publishAlert(error) }
    }
  }
  const current = oldest(files)
  if (!current) return { ok: false, alert: "write_failed" }
  try {
    await keepPreviousCopy(drive, current)
    await drive.update(current.id, bytes)
  } catch (error) {
    return { ok: false, alert: publishAlert(error) }
  }
  return { ok: true, fileId: current.id, created: false, duplicate: files.length > 1 }
}

function backupLogLine(result: DriveBackupResult) {
  if (result.ok) {
    return JSON.stringify({
      event: "reservation_backup",
      ok: true,
      total: result.total,
      today: result.today,
      tomorrow: result.tomorrow,
      pending: result.pending,
      created: result.created,
      duplicate: result.duplicate,
    })
  }
  return JSON.stringify({ event: "reservation_backup", ok: false, alert: result.alert, count: result.count })
}

async function runReservationDriveBackup(db: BackupDatabase, drive: BackupDrive, now = new Date(), log: BackupLog = console): Promise<DriveBackupResult> {
  let built: BuiltBackup
  try {
    built = await buildReservationBackup(db, now)
  } catch {
    built = { ok: false, alert: "read_failed", count: null }
  }
  if (!built.ok) {
    const failed = { ok: false as const, alert: built.alert, count: built.count }
    log.error(backupLogLine(failed))
    return failed
  }
  const published = await publishReservationWorkbook(drive, built.bytes)
  if (!published.ok) {
    const failed = { ok: false as const, alert: published.alert, count: built.total }
    log.error(backupLogLine(failed))
    return failed
  }
  const result = {
    ok: true as const,
    total: built.total,
    today: built.today,
    tomorrow: built.tomorrow,
    pending: built.pending,
    fileId: published.fileId,
    created: published.created,
    duplicate: published.duplicate,
  }
  const line = backupLogLine(result)
  if (result.duplicate) log.error(line)
  else log.info(line)
  return result
}

export {
  backupDriveId,
  backupFileName,
  backupLogLine,
  backupPreviousName,
  backupServiceAccount,
  driveNameQuery,
  publishReservationWorkbook,
  runReservationDriveBackup,
  spreadsheetMime,
}
export type { BackupDrive, BackupLog, DriveBackupResult, DriveFile, DrivePublishResult }
