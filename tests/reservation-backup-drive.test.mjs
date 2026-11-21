import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { buildReservationBackup } from "@/lib/reservations/backup-source"
import { backupDriveClient } from "@/lib/reservations/backup-drive-client"
import {
  backupDriveId,
  backupFileName,
  backupPreviousName,
  backupServiceAccount,
  publishReservationWorkbook,
  runReservationDriveBackup,
} from "@/lib/reservations/backup-drive"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"

function workbook(label) {
  return Buffer.from(label.padEnd(96, "."))
}

const now = new Date("2026-11-19T15:00:00.000Z")
const today = todayIsoInSantiago(now)
const secretPhone = "+56 9 2887 3619"
const secretEmail = "ana.soto@correo.cl"

function database(rows) {
  return {
    collection() {
      return {
        where(_field, _op, date) {
          return {
            orderBy() {
              return {
                limit() {
                  return {
                    async get() {
                      const docs = rows.filter((row) => row.date === date)
                      return {
                        size: docs.length,
                        docs: docs.map((row) => ({ id: row.id, data: () => row })),
                      }
                    },
                  }
                },
              }
            },
          }
        },
      }
    },
  }
}

function reservation(id) {
  return {
    id,
    date: today,
    preferredTime: "20:00",
    status: "confirmed",
    customerName: "Ana Soto",
    customerPhone: secretPhone,
    customerEmail: secretEmail,
    marketingConsent: true,
    partySize: 2,
    preferredZone: "salon",
    referenceCode: "PIU-2044",
    notes: "Ventana",
  }
}

function memoryDrive() {
  const calls = []
  const files = new Map()
  let sequence = 0
  const drive = {
    calls,
    files,
    async list(name) {
      calls.push(["list", name])
      return [...files.values()].filter((file) => file.name === name)
    },
    async create(name, bytes) {
      calls.push(["create", name, bytes.byteLength])
      sequence += 1
      const file = { id: `file-${sequence}`, name, createdTime: `2026-11-19T00:00:0${sequence}Z`, bytes }
      files.set(file.id, file)
      return file
    },
    async update(id, bytes) {
      calls.push(["update", id])
      const file = files.get(id)
      if (!file) throw Object.assign(new Error("missing"), { status: 404 })
      file.bytes = Buffer.from(bytes)
    },
    async download(id) {
      calls.push(["download", id])
      const file = files.get(id)
      if (!file) throw Object.assign(new Error("missing"), { status: 404 })
      return Buffer.from(file.bytes)
    },
  }
  return drive
}

test("la primera corrida crea el archivo y la segunda actualiza el mismo id", async () => {
  const drive = memoryDrive()
  const bytes = workbook("primera-version")
  const created = await publishReservationWorkbook(drive, bytes)
  assert.equal(created.ok, true)
  assert.equal(created.created, true)
  const next = workbook("segunda-version")
  const updated = await publishReservationWorkbook(drive, next)
  assert.equal(updated.ok, true)
  assert.equal(updated.created, false)
  assert.equal(updated.fileId, created.fileId)
  assert.equal(drive.files.get(created.fileId).bytes.toString(), next.toString())
  const previous = [...drive.files.values()].find((file) => file.name === backupPreviousName)
  assert.equal(previous.bytes.toString(), bytes.toString())
  assert.equal(drive.calls.filter((call) => call[0] === "create" && call[1] === backupFileName).length, 1)
})

test("un respaldo incompleto o un fallo de Drive no reemplaza el archivo válido", async () => {
  const drive = memoryDrive()
  const original = workbook("archivo-valido")
  await publishReservationWorkbook(drive, original)
  const short = await publishReservationWorkbook(drive, Buffer.from("corto"))
  assert.equal(short.ok, false)
  assert.equal(short.alert, "generation_failed")
  assert.equal(drive.files.get("file-1").bytes.toString(), original.toString())

  drive.download = async () => {
    throw Object.assign(new Error("denied"), { code: 403 })
  }
  const denied = await publishReservationWorkbook(drive, workbook("nueva-version"))
  assert.equal(denied.alert, "permission_denied")
  assert.equal(drive.files.get("file-1").bytes.toString(), original.toString())

  const offline = memoryDrive()
  await publishReservationWorkbook(offline, original)
  offline.list = async (name) => {
    if (name === backupPreviousName) throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })
    return [...offline.files.values()].filter((file) => file.name === name)
  }
  const disconnected = await publishReservationWorkbook(offline, workbook("otra-version"))
  assert.equal(disconnected.alert, "connection_failed")
  assert.equal(offline.files.get("file-1").bytes.toString(), original.toString())
})

test("dos corridas seguidas actualizan el mismo archivo y un fallo deja la copia recuperable", async () => {
  const drive = memoryDrive()
  const first = workbook("primera-version")
  const created = await publishReservationWorkbook(drive, first)
  assert.equal(created.ok, true)
  assert.equal(created.created, true)
  const second = workbook("segunda-version")
  const updated = await publishReservationWorkbook(drive, second)
  assert.equal(updated.ok, true)
  assert.equal(updated.created, false)
  assert.equal(updated.fileId, created.fileId)
  const previous = [...drive.files.values()].find((file) => file.name === backupPreviousName)
  assert.equal(previous.bytes.toString(), first.toString())
  assert.equal(drive.files.get(created.fileId).bytes.toString(), second.toString())

  const originalUpdate = drive.update.bind(drive)
  drive.update = async (id, bytes) => {
    if (id === created.fileId) throw Object.assign(new Error("write"), { status: 500 })
    await originalUpdate(id, bytes)
  }
  const failed = await publishReservationWorkbook(drive, workbook("tercera-version"))
  assert.equal(failed.ok, false)
  assert.equal(failed.alert, "connection_failed")
  assert.equal(drive.files.get(created.fileId).bytes.toString(), second.toString())
  assert.equal(previous.bytes.toString(), second.toString())
})

test("Firestore simulado arma el Excel y el registro no lleva datos del cliente", async () => {
  const drive = memoryDrive()
  const logs = []
  const log = {
    info: (message) => logs.push(message),
    error: (message) => logs.push(message),
  }
  const rows = [reservation("a"), reservation("b")]
  rows.push({ ...reservation("fuera"), date: "2026-11-25", status: "pending" })
  const result = await runReservationDriveBackup(database(rows), drive, now, log)
  assert.equal(result.ok, true)
  assert.equal(result.total, 2)
  assert.equal(result.created, true)
  const text = logs.join("\n")
  assert.equal(text.includes(secretPhone), false)
  assert.equal(text.includes(secretEmail), false)
  assert.equal(text.includes("Ana Soto"), false)
  assert.equal(text.includes("Ventana"), false)

  const overflow = await runReservationDriveBackup(
    database(Array.from({ length: 201 }, (_, index) => ({ ...reservation(`n-${index}`) }))),
    drive,
    now,
    log,
  )
  assert.equal(overflow.ok, false)
  assert.equal(overflow.alert, "over_capacity")
  assert.equal(drive.files.size, 1)

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
          return Promise.reject(Object.assign(new Error("down"), { code: "ECONNRESET" }))
        },
      }
    },
  }
  const failed = await runReservationDriveBackup(broken, drive, now, log)
  assert.equal(failed.alert, "read_failed")
  assert.equal(drive.files.get("file-1").name, backupFileName)
})

test("el cliente de Drive pide la unidad compartida y conserva el id", async () => {
  const stored = []
  const google = {
    files: {
      async list(params) {
        assert.equal(params.supportsAllDrives, true)
        assert.equal(params.includeItemsFromAllDrives, true)
        assert.equal(params.corpora, "drive")
        assert.equal(params.driveId, backupDriveId)
        assert.match(params.q, new RegExp(backupDriveId))
        const name = params.q.includes(backupPreviousName) ? backupPreviousName : backupFileName
        return { data: { files: stored.filter((file) => file.name === name) } }
      },
      async create(params) {
        assert.equal(params.supportsAllDrives, true)
        assert.deepEqual(params.requestBody.parents, [backupDriveId])
        const file = { id: `g-${stored.length + 1}`, name: params.requestBody.name, createdTime: "2026-11-19T00:00:00Z" }
        stored.push({ ...file, bytes: params.media.body })
        return { data: file }
      },
      async update(params) {
        assert.equal(params.supportsAllDrives, true)
        assert.equal(JSON.stringify(params).includes("If-Match"), false)
        const file = stored.find((item) => item.id === params.fileId)
        file.bytes = params.media.body
      },
      async get(params) {
        assert.equal(params.supportsAllDrives, true)
        assert.equal(params.alt, "media")
        return { data: Buffer.from("contenido-previo".padEnd(96, ".")) }
      },
    },
  }
  const client = backupDriveClient(google)
  const first = await publishReservationWorkbook(client, workbook("contenido-inicial"))
  const second = await publishReservationWorkbook(client, workbook("contenido-siguiente"))
  assert.equal(second.fileId, first.fileId)
  assert.equal(stored.filter((file) => file.name === backupFileName).length, 1)
})

test("la función programada no entra en la web publicada", () => {
  const root = new URL("..", import.meta.url)
  const source = readFileSync(new URL("./functions/src/index.ts", root), "utf8")
  const firebase = readFileSync(new URL("./firebase.json", root), "utf8")
  const hosting = readFileSync(new URL("./apphosting.yaml", root), "utf8")
  const config = JSON.parse(firebase)
  assert.match(source, /onSchedule/)
  assert.match(source, /every 1 hours/)
  assert.match(source, /America\/Santiago/)
  assert.match(source, /us-central1/)
  assert.match(source, /serviceAccount: backupServiceAccount/)
  assert.equal(backupServiceAccount, "piu-respaldo-reservas@piu-pizza-cl.iam.gserviceaccount.com")
  const library = readFileSync(new URL("./src/lib/reservations/backup-drive.ts", root), "utf8")
  const client = readFileSync(new URL("./src/lib/reservations/backup-drive-client.ts", root), "utf8")
  assert.match(library, /0AOGhjSyhqHexUk9PVA/)
  assert.match(client, /supportsAllDrives: true/)
  assert.equal(client.includes("If-Match"), false)
  assert.match(source, /maxInstances: 1/)
  assert.match(source, /concurrency: 1/)
  const sourceReader = readFileSync(new URL("./src/lib/reservations/backup-source.ts", root), "utf8")
  const model = readFileSync(new URL("./src/lib/firebase/model.ts", root), "utf8")
  assert.match(sourceReader, /const reservationsCollection = "reservations"/)
  assert.match(model, /reservations: "reservations"/)
  assert.equal(source.includes("keyFilename"), false)
  assert.equal(source.includes("private_key"), false)
  assert.equal(source.includes("client_secret"), false)
  assert.equal(config.functions.source, "functions")
  assert.equal(config.functions.runtime, "nodejs24")
  assert.equal(config.firestore.location, "us-central1")
  assert.equal(config.emulators.firestore.port, 8080)
  assert.match(hosting, /minInstances: 0/)
  assert.equal(hosting.includes("reservationBackup"), false)
  assert.equal(hosting.includes("0AOGhjSyhqHexUk9PVA"), false)
  const built = buildReservationBackup
  assert.equal(typeof built, "function")
})
