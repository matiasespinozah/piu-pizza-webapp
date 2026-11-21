import { initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { google } from "googleapis"

import type { BackupDatabase } from "../../src/lib/reservations/backup-source"
import { backupDriveClient, type GoogleDriveApi } from "../../src/lib/reservations/backup-drive-client"
import { backupServiceAccount, runReservationDriveBackup } from "../../src/lib/reservations/backup-drive"

initializeApp()

function cloudDrive() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/drive"],
  })
  return backupDriveClient(google.drive({ version: "v3", auth }) as unknown as GoogleDriveApi)
}

const reservationBackup = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "America/Santiago",
    region: "us-central1",
    serviceAccount: backupServiceAccount,
    memory: "512MiB",
    timeoutSeconds: 120,
    minInstances: 0,
    maxInstances: 1,
    concurrency: 1,
    retryCount: 0,
  },
  async () => {
    const result = await runReservationDriveBackup(getFirestore() as unknown as BackupDatabase, cloudDrive())
    if (!result.ok) throw new Error(`reservation_backup_failed:${result.alert}`)
  },
)

export { reservationBackup }
