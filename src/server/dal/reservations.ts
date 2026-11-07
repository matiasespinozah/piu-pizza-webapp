import "server-only"

import type { StaffSession } from "@/lib/auth/roles"
import { collections, reservationSchema } from "@/lib/firebase/model"
import { assertStaff } from "@/server/auth/authorization"
import { assertFirebaseDataEnabled } from "@/server/firebase/guard"
import { getDb } from "@/server/firebase/firestore"

const pageSize = 20

type ReservationRecord = ReturnType<typeof reservationSchema.parse> & { id: string }

/**
 * Lectura de personal. No está conectada a ninguna página.
 * El Admin SDK no consulta las reglas: la autorización de arriba es la que manda.
 */
async function listReservations(session: StaffSession | null): Promise<ReservationRecord[]> {
  assertFirebaseDataEnabled()
  assertStaff(session, ["superadmin", "admin"])

  const snap = await getDb().collection(collections.reservations).orderBy("date").limit(pageSize).get()

  return snap.docs.map((item) => {
    const parsed = reservationSchema.safeParse(item.data())
    if (!parsed.success) {
      throw new Error("Documento de reserva inválido.")
    }
    return { id: item.id, ...parsed.data }
  })
}

export { listReservations }
