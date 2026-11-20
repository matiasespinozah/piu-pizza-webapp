import { Readable } from "node:stream"

import { backupDriveId, driveNameQuery, spreadsheetMime, type BackupDrive, type DriveFile } from "@/lib/reservations/backup-drive"

type DriveListResponse = {
  data: { files?: DriveFile[]; nextPageToken?: string | null }
}

type DriveFileResponse = {
  data: DriveFile
}

type DriveMediaResponse = {
  data: ArrayBuffer | Buffer | string
}

type GoogleDriveApi = {
  files: {
    list: (params: Record<string, unknown>) => Promise<DriveListResponse>
    create: (params: Record<string, unknown>) => Promise<DriveFileResponse>
    update: (params: Record<string, unknown>) => Promise<unknown>
    get: (params: Record<string, unknown>, options?: { responseType?: string }) => Promise<DriveMediaResponse>
  }
}

function sharedDriveList(name: string, pageToken?: string) {
  return {
    corpora: "drive",
    driveId: backupDriveId,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    spaces: "drive",
    q: driveNameQuery(name, backupDriveId),
    fields: "nextPageToken,files(id,name,createdTime)",
    pageSize: 20,
    pageToken,
  }
}

function mediaBody(bytes: Buffer) {
  return { mimeType: spreadsheetMime, body: Readable.from(bytes) }
}

function backupDriveClient(drive: GoogleDriveApi): BackupDrive {
  return {
    async list(name) {
      const files: DriveFile[] = []
      let pageToken: string | undefined
      do {
        const response = await drive.files.list(sharedDriveList(name, pageToken))
        for (const file of response.data.files ?? []) {
          if (file.id) files.push(file)
        }
        pageToken = response.data.nextPageToken || undefined
      } while (pageToken && files.length < 40)
      return files
    },
    async create(name, bytes) {
      const response = await drive.files.create({
        supportsAllDrives: true,
        fields: "id,name,createdTime",
        requestBody: { name, parents: [backupDriveId], mimeType: spreadsheetMime },
        media: mediaBody(bytes),
      })
      return response.data
    },
    async update(id, bytes) {
      await drive.files.update({ fileId: id, supportsAllDrives: true, media: mediaBody(bytes) })
    },
    async download(id) {
      const response = await drive.files.get({ fileId: id, alt: "media", supportsAllDrives: true }, { responseType: "arraybuffer" })
      const data = response.data
      if (data instanceof ArrayBuffer) return Buffer.from(data)
      if (Buffer.isBuffer(data)) return data
      if (typeof data === "string") return Buffer.from(data)
      throw Object.assign(new Error("drive_request_failed"), { status: 502 })
    },
  }
}

export { backupDriveClient }
export type { GoogleDriveApi }
