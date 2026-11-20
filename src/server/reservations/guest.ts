import "server-only"

import type { Firestore } from "firebase-admin/firestore"

import { collections } from "@/lib/firebase/model"
import { guestDocumentId, guestSecretMinLength } from "@/lib/reservations/guest-id"
import type { ReservationListItem } from "@/lib/reservations/views"

function reservationGuestSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.PIU_RESERVATION_GUEST_SECRET?.trim()
  if (!secret || secret.length < guestSecretMinLength) return null
  return secret
}

function countOf(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null
}

async function withRequestCounts(db: Firestore, items: ReservationListItem[]) {
  const secret = reservationGuestSecret()
  const emails = [...new Set(items.flatMap((item) => (item.customerEmail ? [item.customerEmail] : [])))]
  if (!secret || emails.length === 0) return items
  const snaps = await db.getAll(...emails.map((email) => db.collection(collections.reservationGuests).doc(guestDocumentId(email, secret))))
  const counts = new Map<string, number>()
  snaps.forEach((snap, index) => {
    const count = countOf(snap.get("requestCount"))
    const email = emails[index]
    if (count != null && email) counts.set(email, count)
  })
  return items.map((item) => (item.customerEmail ? { ...item, requestCount: counts.get(item.customerEmail) ?? null } : item))
}

async function requestCountFor(db: Firestore, email: string | null) {
  const secret = reservationGuestSecret()
  if (!secret || !email) return null
  const snap = await db.collection(collections.reservationGuests).doc(guestDocumentId(email, secret)).get()
  return countOf(snap.get("requestCount"))
}

export { guestDocumentId, guestSecretMinLength, requestCountFor, reservationGuestSecret, withRequestCounts }
