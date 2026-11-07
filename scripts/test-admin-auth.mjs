import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const firebaseBin = require.resolve("firebase-tools/lib/bin/firebase.js")

const result = spawnSync(
  process.execPath,
  [
    firebaseBin,
    "emulators:exec",
    "--only",
    "auth",
    "--project",
    "demo-piu-pizza",
    "node --import ./tests/register-alias.mjs --test tests/admin-session.emulator.test.mjs",
  ],
  { stdio: "inherit" }
)

process.exit(result.status ?? 1)
