import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { planReservationBackup, renderBackupWorkbook } from "@/lib/reservations/backup-workbook"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"

const now = new Date("2026-11-19T23:40:00.000Z")
const today = todayIsoInSantiago(now)
const tomorrow = "2026-11-20"

function row(overrides) {
  return {
    id: "ejemplo",
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

const plan = planReservationBackup(
  [
    row({ id: "1", preferredTime: "17:30", status: "completed", customerName: "Luis Pérez", partySize: 2, tableLabel: "Mesa 4", referenceCode: "PIU-1008", notes: "" }),
    row({ id: "2", preferredTime: "19:00", status: "pending", customerName: "Camila González", customerPhone: "+56 9 5555 0101", partySize: 3, preferredZone: "terrace", tableLabel: "", referenceCode: "PIU-2044", notes: "Cumpleaños" }),
    row({ id: "3", preferredTime: "20:00", status: "arrived", customerName: "=1+1", partySize: 4, tableLabel: "Mesa 2", referenceCode: "PIU-2100", notes: "Cerca de la ventana" }),
    row({ id: "4", preferredTime: "21:30", status: "confirmed", customerName: "Diego Ruiz", partySize: 2, preferredZone: null, tableLabel: "", referenceCode: "PIU-2112", notes: "" }),
    row({ id: "5", date: tomorrow, preferredTime: "13:30", status: "reschedule_requested", customerName: "Marta Vidal", customerPhone: "+56 9 4444 8899", partySize: 5, preferredZone: "salon", tableLabel: "", referenceCode: "PIU-3001", notes: "Pidió cambiar a la terraza" }),
    row({ id: "6", date: tomorrow, preferredTime: "20:00", status: "confirmed", customerName: "Ada Lagos", partySize: 2, tableLabel: "Mesa 6", referenceCode: "PIU-3010", notes: "" }),
    row({ id: "7", status: "cancelled", customerName: "No debe aparecer", referenceCode: "PIU-0001" }),
    row({ id: "8", date: "2026-11-26", status: "pending", customerName: "Semana siguiente", referenceCode: "PIU-9001" }),
  ],
  now,
)

if (!plan.ok) throw new Error(plan.alert)
const bytes = await renderBackupWorkbook(plan, now)
const file = join(dirname(fileURLToPath(import.meta.url)), "..", "ejemplos", "PIU_Respaldo_Reservas.xlsx")
await mkdir(dirname(file), { recursive: true })
await writeFile(file, bytes)
console.log(file)
