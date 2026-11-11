import { readFileSync } from "node:fs"
import { after, before, beforeEach, test } from "node:test"
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing"
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore"

let env
let anon
let guest
let admin
let superadmin

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-piu-pizza",
    firestore: {
      rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
    },
  })
  anon = env.unauthenticatedContext().firestore()
  guest = env.authenticatedContext("guest-user").firestore()
  admin = env.authenticatedContext("admin-user", { role: "admin" }).firestore()
  superadmin = env.authenticatedContext("owner-user", { role: "superadmin" }).firestore()
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, "products/visible"), { isVisible: true, name: "Margherita", priceClp: 12990 })
    await setDoc(doc(db, "products/hidden"), { isVisible: false, name: "Borrador", priceClp: 1000 })
    await setDoc(doc(db, "categories/pizzas"), { isVisible: true, name: "Pizzas", sortOrder: 1 })
    await setDoc(doc(db, "reservations/one"), { customerName: "Ada", customerPhone: "+56911111111" })
    await setDoc(doc(db, "tables/mesa"), { label: "1", blocked: false })
    await setDoc(doc(db, "staff/staff-user"), { email: "ada@example.com" })
    await setDoc(doc(db, "invitations/one"), { email: "ada@example.com" })
    await setDoc(doc(db, "invitationRate/hour"), { count: 1 })
    await setDoc(doc(db, "restaurantSettings/operations"), { timeZone: "America/Santiago" })
    await setDoc(doc(db, "auditLogs/log"), { summary: "ensayo" })
    await setDoc(doc(db, "staffNotifications/one"), { title: "Nueva reserva" })
  })
})

after(async () => {
  await env.cleanup()
})

test("un visitante no lee ni escribe reservas", async () => {
  await assertFails(getDoc(doc(anon, "reservations/one")))
  await assertFails(setDoc(doc(anon, "reservations/two"), { status: "confirmed" }))
})

test("una cuenta sin rol no lee reservas", async () => {
  await assertFails(getDoc(doc(guest, "reservations/one")))
})

test("admin y superadmin no modifican reservas desde el cliente", async () => {
  await assertFails(setDoc(doc(admin, "reservations/one"), { status: "confirmed" }))
  await assertFails(getDoc(doc(superadmin, "reservations/one")))
  await assertFails(setDoc(doc(superadmin, "products/visible"), { isVisible: false, name: "x", priceClp: 1 }))
})

test("nadie lee personal, mesas, ajustes ni auditoría", async () => {
  await assertFails(getDoc(doc(anon, "staff/staff-user")))
  await assertFails(getDoc(doc(superadmin, "invitations/one")))
  await assertFails(setDoc(doc(admin, "invitations/one"), { email: "ada@example.com" }))
  await assertFails(getDoc(doc(guest, "invitationRate/hour")))
  await assertFails(getDoc(doc(admin, "tables/mesa")))
  await assertFails(getDoc(doc(superadmin, "restaurantSettings/operations")))
  await assertFails(getDoc(doc(guest, "auditLogs/log")))
  await assertFails(getDoc(doc(admin, "staffNotifications/one")))
  await assertFails(setDoc(doc(superadmin, "staffNotifications/one"), { title: "Nueva reserva" }))
})

test("la carta visible se puede leer, con límite", async () => {
  await assertSucceeds(getDoc(doc(anon, "products/visible")))
  await assertSucceeds(getDoc(doc(anon, "categories/pizzas")))
  await assertSucceeds(getDocs(query(collection(anon, "products"), where("isVisible", "==", true), limit(20))))
})

test("un plato oculto y una lista sin límite no se leen", async () => {
  await assertFails(getDoc(doc(anon, "products/hidden")))
  await assertFails(getDocs(query(collection(anon, "products"), limit(20))))
  await assertFails(getDocs(query(collection(anon, "products"), where("isVisible", "==", true), limit(51))))
})

test("nadie lee cupos, límites ni el historial de una reserva", async () => {
  await assertFails(getDoc(doc(anon, "reservationHolds/2026-11-09_salon")))
  await assertFails(getDoc(doc(admin, "reservationRate/hour")))
  await assertFails(getDoc(doc(superadmin, "reservations/one/events/created")))
  await assertFails(setDoc(doc(anon, "reservations/one/events/fake"), { action: "confirm" }))
  await assertFails(getDoc(doc(anon, "reservationAccess/hash")))
  await assertFails(getDoc(doc(admin, "reservationStatusRate/hour")))
  await assertFails(setDoc(doc(superadmin, "reservationAccess/hash"), { reservationId: "x" }))
})

test("nadie publica un plato desde el navegador", async () => {
  await assertFails(setDoc(doc(anon, "products/nuevo"), { isVisible: true, name: "Nuevo", priceClp: 1 }))
  await assertFails(setDoc(doc(admin, "products/nuevo"), { isVisible: true, name: "Nuevo", priceClp: 1 }))
})
