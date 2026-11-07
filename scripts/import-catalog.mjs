import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const firebaseBin = require.resolve("firebase-tools/lib/bin/firebase.js")

const overwrite = process.argv.includes("--sobrescribir")
const project = process.env.PIU_CATALOG_PROJECT || "demo-piu-pizza"
if (project === "piu-pizza-cl") {
  console.error("La importación no corre contra producción.")
  process.exit(1)
}

const result = spawnSync(
  process.execPath,
  [firebaseBin, "emulators:exec", "--only", "firestore", "--project", project, "node --import ./tests/register-alias.mjs scripts/import-catalog-run.mjs"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: project,
      GOOGLE_CLOUD_PROJECT: project,
      GCLOUD_PROJECT: project,
      PIU_FIREBASE_DATA: "on",
      PIU_CATALOG_IMPORT_OVERWRITE: overwrite ? "on" : "",
    },
  }
)

process.exit(result.status ?? 1)
