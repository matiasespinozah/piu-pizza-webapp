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
  throw new Error("No hay un puerto libre para el emulador de Auth.")
}

const defaultPortTaken = await portOpen(9099)
let configDir = ""
const args = [firebaseBin, "emulators:exec", "--only", "auth", "--project", "demo-piu-pizza"]

if (defaultPortTaken) {
  const port = await freePort([19099, 19109, 19119, 19129])
  configDir = mkdtempSync(join(tmpdir(), "piu-auth-"))
  const configPath = join(configDir, "firebase.json")
  writeFileSync(
    configPath,
    JSON.stringify({
      emulators: {
        auth: { host: "127.0.0.1", port },
        ui: { enabled: false },
        singleProjectMode: true,
      },
    })
  )
  args.push("--config", configPath)
  console.error(`El puerto 9099 está ocupado. Esta corrida usa el ${port} y no detiene ese emulador.`)
}

args.push("node --import ./tests/register-alias.mjs --test tests/admin-session.emulator.test.mjs")

let status = 1
try {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" })
  status = result.status ?? 1
} finally {
  if (configDir) rmSync(configDir, { recursive: true, force: true })
}

process.exit(status)
