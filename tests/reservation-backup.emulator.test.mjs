import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import ExcelJS from "exceljs"

import { getDb } from "@/server/firebase/firestore"
import { runReservationBackup } from "@/server/reservations/backup"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"
import { addIsoDays } from "@/lib/reservations/backup-workbook"

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Estas pruebas solo corren dentro del emulador.")
assert.equal(process.env.GCLOUD_PROJECT, "demo-piu-pizza")
assert.notEqual(process.env.GCLOUD_PROJECT, "piu-pizza-cl")

const now = new Date("2026-11-19T15:00:00.000Z")
const today = todayIsoInSantiago(now)
const tomorrow = addIsoDays(today, 1)

test("el emulador arma el Excel de hoy y mañana sin tocar las reservas", async () => {
  const db = getDb()
  const batch = db.batch()
  for (let index = 0; index < 90; index += 1) {
    const hour = 12 + Math.floor(index / 60)
    const minute = index % 60
    batch.set(db.collection("reservations").doc(`backup-${index}`), {
      date: today,
      preferredTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      status: index === 0 ? "cancelled" : "confirmed",
      customerName: index === 1 ? "=HIPERVINCULO()" : `Cliente ${index}`,
      customerPhone: "+56 9 1111 2222",
      customerEmail: "secreto@correo.cl",
      marketingConsent: true,
      partySize: 2,
      preferredZone: "salon",
      referenceCode: `PIU-${1000 + index}`,
      notes: "Nota",
    })
  }
  batch.set(db.collection("reservations").doc("backup-manana"), {
    date: tomorrow,
    preferredTime: "13:00",
    status: "pending",
    customerName: "Mañana Ada",
    partySize: 3,
    preferredZone: "terrace",
    referenceCode: "PIU-3001",
  })
  batch.set(db.collection("reservations").doc("backup-despues"), {
    date: addIsoDays(tomorrow, 3),
    preferredTime: "20:00",
    status: "pending",
    customerName: "Otra fecha",
    referenceCode: "PIU-4001",
  })
  await batch.commit()

  const directory = await mkdtemp(join(tmpdir(), "piu-backup-"))
  const file = join(directory, "PIU_Respaldo_Reservas.xlsx")
  const logs = []
  const log = {
    info: (message) => logs.push(message),
    error: (message) => logs.push(message),
  }
  const result = await runReservationBackup(db, file, now, log)
  assert.equal(result.ok, true)
  assert.equal(result.today, 89)
  assert.equal(result.tomorrow, 1)
  assert.equal(result.pending, 1)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(file)
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Hoy", "Mañana", "Pendientes"])
  const text = JSON.stringify(workbook.getWorksheet("Hoy").getSheetValues())
  assert.equal(text.includes("secreto@correo.cl"), false)
  assert.equal(text.includes("marketingConsent"), false)
  assert.equal(text.includes("Cliente 2"), true)
  assert.equal(text.includes("'=HIPERVINCULO()"), true)
  assert.equal(JSON.stringify(logs).includes("secreto@correo.cl"), false)
  assert.equal(JSON.stringify(logs).includes("+56"), false)
  assert.equal((await db.collection("reservations").doc("backup-1").get()).exists, true)

  const broken = {
    collection() {
      return {
        where() {
          return this
        },
        orderBy() {
          return this
        },
        limit() {
          return this
        },
        get() {
          return Promise.reject(new Error("firestore down"))
        },
      }
    },
  }
  const failed = await runReservationBackup(broken, file, now, log)
  assert.equal(failed.ok, false)
  assert.equal(failed.alert, "read_failed")
  assert.equal((await readFile(file)).byteLength > 100, true)
})
