import "server-only"

import type { StaffSession } from "@/lib/auth/roles"
import { auditLogSchema, collections } from "@/lib/firebase/model"
import { assertStaff } from "@/server/auth/authorization"
import { assertFirebaseDataEnabled } from "@/server/firebase/guard"
import { getDb } from "@/server/firebase/firestore"

type AuditInput = {
  action: string
  targetPath: string
  summary: string
}

/** El resumen no debe incluir teléfono, nombre del cliente ni otros datos personales. */
async function appendAuditLog(session: StaffSession, input: AuditInput) {
  assertFirebaseDataEnabled()
  assertStaff(session, ["superadmin", "admin"])

  const entry = auditLogSchema.parse({
    ...input,
    actorUid: session.uid,
    at: new Date().toISOString(),
  })

  await getDb().collection(collections.auditLogs).add(entry)
}

export { appendAuditLog }
