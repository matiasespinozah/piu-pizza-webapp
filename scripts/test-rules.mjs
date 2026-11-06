import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const firebaseBin = require.resolve("firebase-tools/lib/bin/firebase.js")

// Sin shell: en Windows cmd.exe parte "node --test …" en varios argumentos.
// Invocamos el bin de firebase-tools con Node y dejamos el comando de pruebas
// como un solo argv, igual que las comillas del comando que ya funciona.
const result = spawnSync(
  process.execPath,
  [
    firebaseBin,
    "emulators:exec",
    "--only",
    "firestore",
    "--project",
    "demo-piu-pizza",
    "node --test tests/firestore.rules.test.mjs",
  ],
  { stdio: "inherit" }
)

process.exit(result.status ?? 1)
