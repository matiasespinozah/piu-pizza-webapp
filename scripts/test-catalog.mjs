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
    "firestore",
    "--project",
    "demo-piu-pizza",
    "node --import ./tests/register-alias.mjs --test --test-concurrency=1 tests/catalog.emulator.test.mjs",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-piu-pizza",
      GOOGLE_CLOUD_PROJECT: "demo-piu-pizza",
      GCLOUD_PROJECT: "demo-piu-pizza",
      PIU_FIREBASE_DATA: "on",
      FIREBASE_AUTH_EMULATOR_HOST: "",
    },
  }
)

process.exit(result.status ?? 1)
