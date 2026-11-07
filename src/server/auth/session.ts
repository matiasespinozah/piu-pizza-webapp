import "server-only"

import { getAuth } from "firebase-admin/auth"
import { cookies } from "next/headers"

import { decideStaffSession, staffFromVerified } from "@/lib/auth/staff-session"
import type { StaffSession } from "@/lib/auth/roles"
import {
  sessionCookieName,
  sessionIsExpired,
  sessionMaxAgeMs,
} from "@/lib/auth/session-policy"
import { StaffAccessError } from "@/server/auth/authorization"
import { getAdminApp } from "@/server/firebase/admin"

function adminAuth() {
  return getAuth(getAdminApp())
}

/**
 * Crea la cookie solo si el token es reciente y ya trae un rol de personal.
 * No consulta Firestore y no usa PIU_FIREBASE_DATA.
 */
async function createStaffSession(idToken: string): Promise<StaffSession> {
  const decoded = await adminAuth().verifyIdToken(idToken, true)
  const decision = decideStaffSession(decoded)
  if (!decision.ok) {
    if (decision.reason === "forbidden") throw new StaffAccessError()
    throw new Error("La sesión de inicio ya no es válida.")
  }

  const value = await adminAuth().createSessionCookie(idToken, { expiresIn: sessionMaxAgeMs })
  const jar = await cookies()
  const emulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST)
  jar.set(sessionCookieName, value, {
    httpOnly: true,
    // En producción la cookie solo viaja por HTTPS. El emulador local es HTTP:
    // App Hosting no define FIREBASE_AUTH_EMULATOR_HOST.
    secure: process.env.NODE_ENV === "production" && !emulator,
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAgeMs / 1000,
  })

  return decision.session
}

async function readStaffSession(): Promise<StaffSession | null> {
  const jar = await cookies()
  const value = jar.get(sessionCookieName)?.value
  if (!value) return null

  try {
    const decoded = await adminAuth().verifySessionCookie(value, true)
    if (sessionIsExpired(decoded.exp, Date.now())) return null
    return staffFromVerified(decoded)
  } catch {
    return null
  }
}

async function readStaffGate(): Promise<
  { status: 401 } | { status: 403 } | { status: 200; session: StaffSession }
> {
  const jar = await cookies()
  const value = jar.get(sessionCookieName)?.value
  if (!value) return { status: 401 }

  try {
    const decoded = await adminAuth().verifySessionCookie(value, true)
    if (sessionIsExpired(decoded.exp, Date.now())) return { status: 401 }
    const session = staffFromVerified(decoded)
    if (!session) return { status: 403 }
    return { status: 200, session }
  } catch {
    return { status: 401 }
  }
}

async function clearStaffSession() {
  const jar = await cookies()
  jar.delete(sessionCookieName)
}

export { clearStaffSession, createStaffSession, readStaffGate, readStaffSession }
