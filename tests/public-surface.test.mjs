import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))

function walk(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) files.push(...walk(path))
    else if (/\.(ts|tsx|mjs|js)$/.test(entry)) files.push(path)
  }
  return files
}

function text(path) {
  return readFileSync(path, "utf8")
}

function rel(file) {
  return file.slice(root.length).replaceAll("\\", "/")
}

test("el sitio público no importa Firebase ni el servidor", () => {
  const dirs = ["src/app", "src/components"].map((dir) => join(root, dir))
  const offenders = []
  for (const file of dirs.flatMap((dir) => walk(dir))) {
    const source = text(file)
    const path = rel(file)
    const loginForm = path.endsWith("src/components/features/admin/login-form.tsx")
    const adminPage = path.includes("src/app/admin/")
    const reservationApi = path.includes("src/app/api/reservations/") || path.includes("src/app/api/admin/reservations/")
    const catalogServer =
      path.endsWith("src/app/page.tsx") ||
      path.endsWith("src/app/carta/page.tsx") ||
      path.includes("src/app/api/admin/catalog/") ||
      path.includes("src/app/api/admin/tables/")
    if (/from ["']firebase-admin/.test(source)) offenders.push(path)
    if (/from ["'](firebase(?:\/[^"']*)?|@\/lib\/firebase)/.test(source) && !loginForm) offenders.push(path)
    if (/from ["']@\/server\//.test(source) && !adminPage && !reservationApi && !catalogServer) offenders.push(path)
  }
  assert.deepEqual(offenders, [])
})

test("el código de cliente no importa el Admin SDK", () => {
  const files = walk(join(root, "src/lib"))
  const offenders = files.filter((file) => text(file).includes("firebase-admin"))
  assert.deepEqual(offenders, [])
})

test("el servidor marca server-only y no queda expuesto como acción", () => {
  const files = walk(join(root, "src/server")).filter((file) => file.endsWith(".ts"))
  const missing = files.filter((file) => !text(file).startsWith('import "server-only"'))
  const actions = files.filter((file) => text(file).includes('"use server"'))
  assert.deepEqual(missing, [])
  assert.deepEqual(actions, [])
})

test("las reglas no abren escritura pública", () => {
  const rules = text(join(root, "firestore.rules"))
  const active = rules
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
  assert.equal(active.includes("allow read, write: if true"), false)
  assert.equal(active.includes("allow write: if true"), false)
  assert.match(active, /match \/reservations\/\{reservationId\}/)
})

test("el acceso a datos nace apagado", () => {
  const source = text(join(root, "src/lib/firebase/access.ts"))
  assert.match(source, /PIU_FIREBASE_DATA === "on"/)
  assert.match(source, /FIRESTORE_EMULATOR_HOST/)
})
