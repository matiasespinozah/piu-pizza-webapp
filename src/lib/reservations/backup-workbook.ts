import { copyFile, rename, unlink, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"

import ExcelJS from "exceljs"

import { todayIsoInSantiago } from "@/lib/reservations/schedule"

const backupCapacity = 200
const backupReadLimit = 250

const operationalStatuses = new Set(["pending", "confirmed", "arrived", "completed", "reschedule_requested"])
const pendingStatuses = new Set(["pending", "reschedule_requested"])

const headers = ["Fecha", "Hora", "Cliente", "Teléfono", "Personas", "Zona", "Mesa", "Estado", "Código", "Observaciones"]

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  arrived: "En atención",
  completed: "Finalizada",
  reschedule_requested: "Cambio propuesto",
}

const zoneLabel: Record<string, string> = {
  salon: "Salón",
  terrace: "Terraza",
}

type BackupReservation = {
  id: string
  date: string
  preferredTime: string
  customerName: string
  customerPhone: string
  partySize: number | null
  preferredZone: "salon" | "terrace" | null
  tableLabel: string
  status: "pending" | "confirmed" | "arrived" | "completed" | "reschedule_requested"
  referenceCode: string
  notes: string
}

type BackupSheets = {
  ok: true
  today: BackupReservation[]
  tomorrow: BackupReservation[]
  pending: BackupReservation[]
  total: number
}

type BackupAlert = {
  ok: false
  alert: "over_capacity" | "incomplete_read" | "read_failed" | "write_failed"
  count: number | null
}

function addIsoDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function displayDate(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return ""
  return `${match[3]}-${match[2]}-${match[1]}`
}

function plainText(value: string) {
  const text = value.replace(/\r?\n/g, " ").trim()
  if (/^[=+\-@\t\r]/.test(text)) return `'${text}`
  return text
}

function parseBackupReservation(id: string, data: Record<string, unknown>): BackupReservation | null {
  const date = typeof data.date === "string" ? data.date : ""
  const status = typeof data.status === "string" ? data.status : ""
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !operationalStatuses.has(status)) return null
  const zone = data.preferredZone === "salon" || data.preferredZone === "terrace" ? data.preferredZone : null
  return {
    id,
    date,
    preferredTime: typeof data.preferredTime === "string" ? data.preferredTime : "",
    customerName: typeof data.customerName === "string" ? data.customerName : "",
    customerPhone: typeof data.customerPhone === "string" ? data.customerPhone : "",
    partySize: Number.isInteger(data.partySize) ? (data.partySize as number) : null,
    preferredZone: zone,
    tableLabel: typeof data.tableLabel === "string" ? data.tableLabel : "",
    status: status as BackupReservation["status"],
    referenceCode: typeof data.referenceCode === "string" ? data.referenceCode : "",
    notes: typeof data.notes === "string" ? data.notes : "",
  }
}

function byVisit(left: BackupReservation, right: BackupReservation) {
  return left.date.localeCompare(right.date) || left.preferredTime.localeCompare(right.preferredTime) || left.id.localeCompare(right.id)
}

function planReservationBackup(reservations: BackupReservation[], now = new Date()): BackupSheets | BackupAlert {
  const today = todayIsoInSantiago(now)
  const tomorrow = addIsoDays(today, 1)
  const active = reservations.filter((item) => operationalStatuses.has(item.status))
  const todayRows = active.filter((item) => item.date === today).sort(byVisit)
  const tomorrowRows = active.filter((item) => item.date === tomorrow).sort(byVisit)
  const pending = [...todayRows, ...tomorrowRows].filter((item) => pendingStatuses.has(item.status)).sort(byVisit)
  const total = new Set([...todayRows, ...tomorrowRows].map((item) => item.id)).size
  if (total > backupCapacity) return { ok: false, alert: "over_capacity", count: total }
  return { ok: true, today: todayRows, tomorrow: tomorrowRows, pending, total }
}

function generatedLabel(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ""
  return `Generado el ${value("day")}-${value("month")}-${value("year")} ${value("hour")}:${value("minute")} (America/Santiago)`
}

function addSheet(workbook: ExcelJS.Workbook, name: string, rows: BackupReservation[], now: Date) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 2 }] })
  const widths = [14, 10, 28, 18, 12, 12, 16, 20, 14, 42]
  sheet.columns = widths.map((width) => ({ width }))
  sheet.mergeCells(1, 1, 1, headers.length)
  const stamp = sheet.getCell(1, 1)
  stamp.value = generatedLabel(now)
  stamp.font = { italic: true, color: { argb: "FF3E4B24" } }
  const header = sheet.getRow(2)
  headers.forEach((label, index) => {
    const cell = header.getCell(index + 1)
    cell.value = label
    cell.font = { bold: true, color: { argb: "FFF6F1E4" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3E4B24" } }
  })
  header.height = 22
  for (const item of rows) {
    const row = sheet.addRow([
      displayDate(item.date),
      plainText(item.preferredTime),
      plainText(item.customerName),
      plainText(item.customerPhone),
      item.partySize,
      item.preferredZone ? zoneLabel[item.preferredZone] : "",
      plainText(item.tableLabel),
      statusLabel[item.status],
      plainText(item.referenceCode),
      plainText(item.notes),
    ])
    row.getCell(4).numFmt = "@"
  }
  if (rows.length === 0) sheet.addRow(["Sin reservas en esta hoja."])
  const last = Math.max(sheet.rowCount, 2)
  sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: last, column: headers.length } }
}

async function renderBackupWorkbook(sheets: BackupSheets, now = new Date()) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "PIÙ Pizza & Dolce"
  workbook.created = now
  addSheet(workbook, "Hoy", sheets.today, now)
  addSheet(workbook, "Mañana", sheets.tomorrow, now)
  addSheet(workbook, "Pendientes", sheets.pending, now)
  const bytes = await workbook.xlsx.writeBuffer()
  return Buffer.from(bytes)
}

async function replaceBackupFile(filePath: string, bytes: Buffer) {
  const temporary = `${filePath}.tmp`
  const previous = `${filePath}.anterior`
  await writeFile(temporary, bytes)
  try {
    if (existsSync(filePath)) await copyFile(filePath, previous)
    await unlink(filePath).catch(() => undefined)
    await rename(temporary, filePath)
  } catch (error) {
    await unlink(temporary).catch(() => undefined)
    if (!existsSync(filePath) && existsSync(previous)) await copyFile(previous, filePath)
    throw error
  }
}

export {
  addIsoDays,
  backupCapacity,
  backupReadLimit,
  generatedLabel,
  parseBackupReservation,
  planReservationBackup,
  renderBackupWorkbook,
  replaceBackupFile,
}
export type { BackupAlert, BackupReservation, BackupSheets }
