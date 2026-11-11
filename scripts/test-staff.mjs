import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { connect } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"

const require = createRequire(import.meta.url)
const firebaseBin = require.resolve("firebase-tools/lib/bin/firebase.js")

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = connect({ port, host: "127.0.0.1" })
    const finish = (open) => {
      socket.destroy()
      resolve(open)
    }
    socket.setTimeout(400, () => finish(false))
    socket.once("connect", () => finish(true))
    socket.once("error", () => finish(false))
  })
}

async function freePort(candidates) {
  for (const port of candidates) {
    if (!(await portOpen(port))) return port
  }
  throw new Error("No hay un puerto libre para el emulador.")
}

const authPort = (await portOpen(9099)) ? await freePort([19099, 19109, 19119]) : 9099
const firestorePort = (await portOpen(8080)) ? await freePort([18080, 18081, 18082]) : 8080
const hubPort = (await portOpen(4400)) ? await freePort([4412, 4413, 4414]) : 4400
const loggingPort = (await portOpen(4500)) ? await freePort([4512, 4513, 4514]) : 4500
const configDir = mkdtempSync(join(tmpdir(), "piu-staff-"))
const configPath = join(configDir, "firebase.json")

writeFileSync(
  configPath,
  JSON.stringify({
    firestore: { rules: join(process.cwd(), "firestore.rules") },
    emulators: {
      auth: { host: "127.0.0.1", port: authPort },
      firestore: { host: "127.0.0.1", port: firestorePort },
      hub: { port: hubPort },
      logging: { port: loggingPort },
      ui: { enabled: false },
      singleProjectMode: true,
    },
  })
)

if (authPort !== 9099 || firestorePort !== 8080) {
  console.error(`Esta corrida usa Auth ${authPort} y Firestore ${firestorePort}. No detiene otros emuladores.`)
}

const result = spawnSync(
  process.execPath,
  [
    firebaseBin,
    "emulators:exec",
    "--config",
    configPath,
    "--only",
    "auth,firestore",
    "--project",
    "demo-piu-pizza",
    "node --import ./tests/register-alias.mjs --test --test-concurrency=1 tests/staff-invite.emulator.test.mjs tests/staff-access.emulator.test.mjs",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-piu-pizza",
      GCLOUD_PROJECT: "demo-piu-pizza",
      PIU_FIREBASE_DATA: "",
    },
  }
)

rmSync(configDir, { recursive: true, force: true })
process.exit(result.status ?? 1)
