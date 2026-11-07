import "server-only"

import { getFirestore, type Firestore } from "firebase-admin/firestore"

import { getAdminApp } from "@/server/firebase/admin"

function getDb(): Firestore {
  return getFirestore(getAdminApp())
}

export { getDb }
