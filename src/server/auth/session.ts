import "server-only"

import { getAuth } from "firebase-admin/auth"
import { cookies } from "next/headers"

import { readStaffRole, type StaffSession } from "@/lib/auth/roles"
import { getAdminApp } from "@/server/firebase/admin"

const sessionCookieName = "piu_session"
const sessionMs = 5 * 24 * 60 * 60 * 1000

function adminAuth() {
  return getAuth(getAdminApp())
}

/** Crea la cookie solo si el token ya trae un rol de personal. Un cliente no puede entrar por aquí. */
async function createStaffSession(idToken: string): Promise<StaffSession> {
  const decoded = await adminAuth().verifyIdToken(idToken, true)
  const role = readStaffRole(decoded.role)
  if (!role) {
    throw new Error("La cuenta no tiene un rol de personal.")
  }

  const value = await adminAuth().createSessionCookie(idToken, { expiresIn: sessionMs })
  const jar = await cookies()
  jar.set(sessionCookieName, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionMs / 1000,
  })

  return { uid: decoded.uid, role }
}

async function readStaffSession(): Promise<StaffSession | null> {
  const jar = await cookies()
  const value = jar.get(sessionCookieName)?.value
  if (!value) return null

  try {
    const decoded = await adminAuth().verifySessionCookie(value, true)
    const role = readStaffRole(decoded.role)
    if (!role) return null
    return { uid: decoded.uid, role }
  } catch {
    return null
  }
}

async function clearStaffSession() {
  const jar = await cookies()
  jar.delete(sessionCookieName)
}

export { clearStaffSession, createStaffSession, readStaffSession, sessionCookieName }
