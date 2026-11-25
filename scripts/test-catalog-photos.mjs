import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const firebaseBin = require.resolve("firebase-tools/lib/bin/firebase.js")

// Firestore y Storage locales, con el proyecto de prueba `demo-piu-pizza`. No tocan producción.
const result = spawnSync(
  process.execPath,
  [
    firebaseBin,
    "emulators:exec",
    "--only",
    "firestore,storage",
    "--project",
    "demo-piu-pizza",
    "node --import ./tests/register-alias.mjs --test --test-concurrency=1 tests/catalog-photos.emulator.test.mjs",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-piu-pizza",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-piu-pizza.appspot.com",
      GOOGLE_CLOUD_PROJECT: "demo-piu-pizza",
      GCLOUD_PROJECT: "demo-piu-pizza",
      PIU_FIREBASE_DATA: "on",
      FIREBASE_AUTH_EMULATOR_HOST: "",
    },
  }
)

process.exit(result.status ?? 1)
