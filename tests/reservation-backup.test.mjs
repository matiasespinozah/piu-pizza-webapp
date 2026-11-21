import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { readFileSync } from "node:fs"

import ExcelJS from "exceljs"

import {
  backupCapacity,
  generatedLabel,
  parseBackupReservation,
  planReservationBackup,
  renderBackupWorkbook,
  replaceBackupFile,
} from "@/lib/reservations/backup-workbook"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"

const now = new Date("2026-11-20T02:30:00.000Z")
const today = todayIsoInSantiago(now)

function reservation(overrides) {
  return {
    id: "id-1",
    date: today,
    preferredTime: "20:00",
    customerName: "Ana Soto",
    customerPhone: "+56 9 2887 3619",
    partySize: 4,
    preferredZone: "salon",
    tableLabel: "Mesa 1",
    status: "confirmed",
    referenceCode: "PIU-2044",
    notes: "Coche de bebé",
    ...overrides,
  }
}

async function sheetRows(bytes, name) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(bytes)
  const sheet = workbook.getWorksheet(name)
  assert.ok(sheet)
  return sheet.getSheetValues().slice(1).map((row) => (Array.isArray(row) ? row.slice(1) : []))
}

test("hoy y mañana usan el día de Chile y separan los estados", async () => {
  assert.equal(today, "2026-11-19")
  const tomorrow = "2026-11-20"
  const plan = planReservationBackup(
    [
      reservation({ id: "tarde", preferredTime: "21:00" }),
      reservation({ id: "llegada", preferredTime: "19:00", status: "arrived", tableLabel: "Mesa 2" }),
      reservation({ id: "lista", preferredTime: "18:00", status: "pending", referenceCode: "PIU-1001" }),
      reservation({ id: "hecha", preferredTime: "17:30", status: "completed" }),
      reservation({ id: "cambio", date: tomorrow, preferredTime: "13:30", status: "reschedule_requested" }),
      reservation({ id: "manana", date: tomorrow, preferredTime: "14:00", status: "confirmed" }),
      reservation({ id: "fuera", date: "2026-11-21", status: "pending" }),
      reservation({ id: "no", status: "cancelled" }),
      reservation({ id: "rechazo", status: "rejected" }),
    ],
    now,
  )
  assert.equal(plan.ok, true)
  assert.deepEqual(plan.today.map((item) => item.id), ["hecha", "lista", "llegada", "tarde"])
  assert.deepEqual(plan.tomorrow.map((item) => item.id), ["cambio", "manana"])
  assert.deepEqual(plan.pending.map((item) => item.id), ["lista", "cambio"])
  const bytes = await renderBackupWorkbook(plan, now)
  const hoy = await sheetRows(bytes, "Hoy")
  assert.equal(hoy[0][0], generatedLabel(now))
  assert.equal(hoy[1][0], "Fecha")
  assert.equal(hoy[2][7], "Finalizada")
  assert.equal(hoy[3][7], "Pendiente")
  assert.equal(hoy[4][7], "En atención")
  assert.equal(hoy[5][7], "Confirmada")
  assert.equal(hoy.some((row) => row.includes("Cancelada") || row.includes("Rechazada")), false)
  const pending = await sheetRows(bytes, "Pendientes")
  assert.deepEqual(
    pending.slice(2).map((row) => row[8]),
    ["PIU-1001", "PIU-2044"],
  )
  const joined = JSON.stringify(hoy)
  assert.equal(joined.includes("ana.soto@"), false)
  assert.equal(joined.includes("marketing"), false)
})

test("más de 80 reservas de hoy entran y 201 no reemplazan el archivo", async () => {
  const many = Array.from({ length: 90 }, (_, index) =>
    reservation({ id: `m-${index}`, preferredTime: `${String(12 + Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}`, referenceCode: `PIU-${index}` }),
  )
  const plan = planReservationBackup(many, now)
  assert.equal(plan.ok, true)
  assert.equal(plan.today.length, 90)
  const overflow = planReservationBackup(
    Array.from({ length: backupCapacity + 1 }, (_, index) => reservation({ id: `x-${index}`, preferredTime: "20:00" })),
    now,
  )
  assert.equal(overflow.ok, false)
  assert.equal(overflow.alert, "over_capacity")
  assert.equal(overflow.count, 201)
  const directory = await mkdtemp(join(tmpdir(), "piu-backup-"))
  const file = join(directory, "PIU_Respaldo_Reservas.xlsx")
  await writeFile(file, Buffer.from("copia-valida"))
  assert.equal(overflow.ok, false)
  assert.equal(await readFile(file, "utf8"), "copia-valida")
})

test("un campo vacío no rompe la fila y un texto con fórmula no se ejecuta", async () => {
  const sparse = parseBackupReservation("hueco", { date: today, status: "confirmed" })
  assert.equal(sparse.customerName, "")
  assert.equal(sparse.partySize, null)
  assert.equal(parseBackupReservation("mail", { date: today, status: "confirmed", customerEmail: "ana@correo.cl", marketingConsent: true }).customerName, "")
  const plan = planReservationBackup(
    [reservation({ id: "formula", customerName: "=1+1", notes: "+suma", customerPhone: "@telefono" })],
    now,
  )
  const hoy = await sheetRows(await renderBackupWorkbook(plan, now), "Hoy")
  assert.equal(hoy[2][2], "'=1+1")
  assert.equal(hoy[2][9], "'+suma")
  assert.equal(hoy[2][3], "'@telefono")
  const service = readFileSync(new URL("../src/server/reservations/service.ts", import.meta.url), "utf8")
  assert.equal(service.includes("backup-workbook"), false)
  assert.equal(service.includes("runReservationBackup"), false)
})

test("reemplazar el archivo conserva la copia anterior y un fallo no la borra", async () => {
  const directory = await mkdtemp(join(tmpdir(), "piu-backup-"))
  const file = join(directory, "PIU_Respaldo_Reservas.xlsx")
  await writeFile(file, Buffer.from("anterior"))
  await replaceBackupFile(file, Buffer.from("nuevo"))
  assert.equal(await readFile(file, "utf8"), "nuevo")
  assert.equal(await readFile(`${file}.anterior`, "utf8"), "anterior")
  await assert.rejects(() => replaceBackupFile(join(directory, "no-existe", "PIU_Respaldo_Reservas.xlsx"), Buffer.from("roto")))
  assert.equal(await readFile(file, "utf8"), "nuevo")
})
