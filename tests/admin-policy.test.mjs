import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"

import { canViewSection } from "../src/lib/auth/permissions.ts"
import { readStaffRole } from "../src/lib/auth/roles.ts"
import {
  authTimeIsFresh,
  requestIsTrusted,
  safeAdminRedirect,
  sessionIsExpired,
  sessionMaxAgeMs,
} from "../src/lib/auth/session-policy.ts"
import { decideStaffSession } from "../src/lib/auth/staff-session.ts"

const root = fileURLToPath(new URL("..", import.meta.url))

function text(path) {
  return readFileSync(join(root, path), "utf8")
}

const now = Date.parse("2026-11-06T12:00:00.000Z")

test("el ingreso reciente se acepta y el viejo no", () => {
  assert.equal(authTimeIsFresh(now / 1000, now), true)
  assert.equal(authTimeIsFresh(now / 1000 - 301, now), false)
  assert.equal(authTimeIsFresh(now / 1000 + 30, now), false)
  assert.equal(authTimeIsFresh("ahora", now), false)
})

test("una sesión vencida no se considera vigente", () => {
  assert.equal(sessionMaxAgeMs, 8 * 60 * 60 * 1000)
  assert.equal(sessionIsExpired(now / 1000 - 1, now), true)
  assert.equal(sessionIsExpired(now / 1000 + 60, now), false)
  assert.equal(sessionIsExpired(undefined, now), true)
})

test("sin rol no hay sesión, aunque el token sea reciente", () => {
  const decision = decideStaffSession(
    { uid: "abc1234567", email: "equipo@example.test", role: "cliente", auth_time: now / 1000 },
    now
  )
  assert.deepEqual(decision, { ok: false, reason: "forbidden" })
  assert.equal(readStaffRole("cliente"), null)
})

test("admin y superadmin salen del token, no de un dato aparte", () => {
  const admin = decideStaffSession(
    { uid: "abc1234567", email: "equipo@example.test", name: "Ana", role: "admin", auth_time: now / 1000 },
    now
  )
  const owner = decideStaffSession(
    { uid: "abc1234567", role: "superadmin", auth_time: now / 1000 },
    now
  )
  assert.equal(admin.ok && admin.session.role, "admin")
  assert.equal(admin.ok && admin.session.email, "equipo@example.test")
  assert.equal(admin.ok && admin.session.displayName, "Ana")
  assert.equal(owner.ok && owner.session.role, "superadmin")
})

test("un token reciente con rol, pero de un ingreso viejo, no crea sesión", () => {
  const decision = decideStaffSession(
    { uid: "abc1234567", role: "admin", auth_time: now / 1000 - 301 },
    now
  )
  assert.deepEqual(decision, { ok: false, reason: "stale" })
})

test("el rol admin no ve personal ni configuración", () => {
  assert.equal(canViewSection("admin", "inicio"), true)
  assert.equal(canViewSection("admin", "reservas"), true)
  assert.equal(canViewSection("admin", "personal"), false)
  assert.equal(canViewSection("admin", "configuracion"), false)
  assert.equal(canViewSection("superadmin", "personal"), true)
  assert.equal(canViewSection("superadmin", "configuracion"), true)
})

test("la cookie solo se crea si el pedido viene del propio sitio", () => {
  const ok = {
    origin: "https://piu.example",
    host: "interno",
    forwardedHost: "piu.example",
    requestedWith: "admin-login",
  }
  assert.equal(requestIsTrusted(ok), true)
  assert.equal(requestIsTrusted({ ...ok, requestedWith: null }), false)
  assert.equal(requestIsTrusted({ ...ok, origin: "https://evil.example" }), false)
  assert.equal(requestIsTrusted({ ...ok, origin: null }), false)
  assert.equal(requestIsTrusted({ ...ok, origin: "javascript:alert(1)" }), false)
  assert.equal(
    requestIsTrusted({ origin: "http://localhost:3000", host: "localhost:3000", forwardedHost: null, requestedWith: "admin-login" }),
    true
  )
})

test("ningún parámetro de retorno sale del panel", () => {
  assert.equal(safeAdminRedirect("https://evil.example"), "/admin")
  assert.equal(safeAdminRedirect("//evil.example"), "/admin")
  assert.equal(safeAdminRedirect("/admin/personal"), "/admin")
  assert.equal(safeAdminRedirect(undefined), "/admin")
})

test("las rutas del panel exigen sesión y la sección que corresponde", () => {
  const layout = text("src/app/admin/(panel)/layout.tsx")
  assert.match(layout, /redirect\("\/admin\/login"\)/)
  const pages = {
    "src/app/admin/(panel)/page.tsx": "inicio",
    "src/app/admin/(panel)/reservas/page.tsx": "reservas",
    "src/app/admin/(panel)/mesas/page.tsx": "mesas",
    "src/app/admin/(panel)/carta/page.tsx": "carta",
    "src/app/admin/(panel)/configuracion/page.tsx": "configuracion",
    "src/app/admin/(panel)/personal/page.tsx": "personal",
  }
  for (const [path, section] of Object.entries(pages)) {
    assert.match(text(path), new RegExp(`requireSection\\("${section}"\\)`))
  }
})

test("el ingreso no guarda secretos ni ofrece crear cuenta", () => {
  const form = text("src/components/features/admin/login-form.tsx")
  assert.match(form, /inMemoryPersistence/)
  assert.match(form, /signOut/)
  assert.doesNotMatch(form, /localStorage/)
  assert.doesNotMatch(form, /Crear cuenta/)
  assert.doesNotMatch(form, /sessionStorage/)
})

test("la cookie es httpOnly y el panel no se cachea", () => {
  const session = text("src/server/auth/session.ts")
  assert.match(session, /httpOnly: true/)
  assert.match(session, /sameSite: "lax"/)
  assert.match(session, /NODE_ENV === "production" && !emulator/)
  assert.match(session, /FIREBASE_AUTH_EMULATOR_HOST/)
  assert.match(session, /verifyIdToken\(idToken, true\)/)
  assert.match(session, /verifySessionCookie\(value, true\)/)
  assert.match(session, /decideStaffSession/)
  const headers = text("next.config.ts")
  assert.match(headers, /\/admin\/:path\*/)
  assert.match(headers, /private, no-store/)
})

test("el endpoint no acepta rol ni un destino en la URL", () => {
  const route = text("src/app/admin/session/route.ts")
  assert.match(route, /requestIsTrusted/)
  assert.match(route, /\.strict\(\)/)
  assert.match(route, /idToken: z\.string\(\)/)
  assert.doesNotMatch(route, /searchParams/)
  assert.doesNotMatch(route, /console\.(log|info|error|debug)/)
  assert.match(route, /clearStaffSession/)
})

test("el inicio no inventa métricas ni lee Firestore", () => {
  const page = text("src/app/admin/(panel)/page.tsx")
  assert.match(page, /La recepción de reservas sigue desactivada/)
  assert.doesNotMatch(page, /getFirestore|firebase-admin/)
  assert.doesNotMatch(page, /\b\d+\s+reservas\b/i)
})

test("el primer superadmin conserva los otros claims", () => {
  const script = text("scripts/bootstrap-superadmin.mjs")
  assert.match(script, /\.\.\.existing\.customClaims/)
  assert.match(text("src/server/auth/claims.ts"), /\.\.\.user\.customClaims/)
})
