import "server-only"

import { firebaseDataAccessEnabled } from "@/lib/firebase/access"

function assertFirebaseDataEnabled() {
  if (!firebaseDataAccessEnabled()) {
    throw new Error(
      "Firestore está apagado en este proceso. Para un ensayo local usa el emulador. Para el proyecto real hace falta PIU_FIREBASE_DATA=on y aprobación explícita."
    )
  }
}

export { assertFirebaseDataEnabled }
