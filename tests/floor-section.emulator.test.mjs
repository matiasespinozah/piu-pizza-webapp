import test from "node:test"
import assert from "node:assert/strict"

import { collections, settingsDocId } from "@/lib/firebase/model"
import { defaultOperationRules, operationsDocument, readOperationRules } from "@/lib/reservations/operations"
import { getDb } from "@/server/firebase/firestore"
import { saveFloor } from "@/server/operations/service"

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Estas pruebas solo corren dentro del emulador.")
assert.equal(process.env.GCLOUD_PROJECT, "demo-piu-pizza")
assert.notEqual(process.env.GCLOUD_PROJECT, "piu-pizza-cl")

const owner = { uid: "staff-owner", role: "superadmin", email: "felipe@example.test", displayName: "Felipe" }

function payload(rules) {
  return {
    serviceMinutes: rules.serviceMinutes,
    receptionPaused: rules.receptionPaused,
    fullNotice: rules.notices.full.text,
    pausedNotice: rules.notices.paused.text,
    closedDayNotice: rules.notices.closedDay.text,
    venueClosedNotice: rules.notices.venueClosed.text,
    sectors: rules.sectors,
    week: rules.week,
  }
}

test("guardar zonas no pisa el horario que guardó otra sesión", async () => {
  const base = defaultOperationRules()
  const db = getDb()
  await db.collection(collections.restaurantSettings).doc(settingsDocId).set(operationsDocument(base))

  const hours = defaultOperationRules()
  hours.week = { ...hours.week, mon: { ...hours.week.mon, opensAt: "12:00", closesAt: "16:00" } }
  await saveFloor(owner, payload(hours), "hours")

  const stale = defaultOperationRules()
  stale.sectors = { ...stale.sectors, salon: { total: stale.sectors.salon.total, web: 3 } }
  await saveFloor(owner, payload(stale), "zones")

  const stored = readOperationRules((await db.collection(collections.restaurantSettings).doc(settingsDocId).get()).data())
  assert.ok(stored)
  assert.equal(stored.week.mon.opensAt, "12:00")
  assert.equal(stored.sectors.salon.web, 3)
  assert.equal(stored.serviceMinutes, base.serviceMinutes)
})
