# Seguridad con Firebase

Proyecto Firebase: **`piu-pizza-cl`** (plan Blaze). Todo en `us-central1`. Infraestructura administrada **solo con Firebase CLI** (`firebase …`) y la consola web; no se usa `gcloud`.

## Modelo de confianza
- **El cliente no es confiable.** Todo lo que viene del navegador se valida en el servidor (zod) y en las Security Rules.
- La config web de Firebase (`apiKey`, `projectId`, …) **no es secreta**; puede ir en `NEXT_PUBLIC_FIREBASE_*`. La seguridad la dan las Security Rules y App Check, no ocultar la config.
- Credenciales de servicio, claves de pago, tokens de terceros: **solo** en Secret Manager (referenciados desde `apphosting.yaml`) o `.env.local` en desarrollo. Nunca con prefijo `NEXT_PUBLIC_`, nunca commiteados.

## SDKs
| Dónde | SDK | Archivo |
|---|---|---|
| Navegador | `firebase` (Web SDK modular) | `src/lib/firebase/client.ts` — solo Auth y lo estrictamente necesario |
| Servidor | `firebase-admin` | `src/server/firebase/admin.ts` — empieza con `import "server-only"` |

- El Admin SDK **ignora las Security Rules**: cada Server Action debe verificar sesión y rol antes de leer/escribir.
- Nunca importar `firebase-admin` desde un archivo que pueda llegar al cliente.

## Autenticación
- Login en el cliente con el Web SDK → enviar ID token al servidor → crear **cookie de sesión** (`httpOnly`, `secure`, `sameSite=lax`) con el Admin SDK.
- En el servidor, verificar la cookie con `verifySessionCookie(cookie, true)` (chequea revocación) en el DAL, no en el layout.
- Roles (`admin`, `staff`) con **custom claims** asignados desde el servidor, nunca un campo `role` editable por el usuario en Firestore.
- Proteger rutas en `proxy.ts` solo como primera barrera (redirect); la autorización real va en el DAL/Server Action.
- Proveedores habilitados en `piu-pizza-cl`: **email/contraseña** y **Google**. Sin enlace por email ni Phone Auth.
- Habilitar protección contra enumeración de emails. Datos extra del cliente (nombre, teléfono) van en un documento de perfil propio (`users/{uid}`), protegido por reglas, nunca en custom claims.

## Firestore Security Rules
- **Deny by default**. Empezar con:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} { allow read, write: if false; }
    }
  }
  ```
- Abrir caso por caso: datos públicos de solo lectura (`products`, `locations`) con `allow read: if true; allow write: if false;` (las escrituras van por el Admin SDK desde Server Actions de admin).
- Datos de usuario: `allow read, write: if request.auth != null && request.auth.uid == userId;` y validar campos/tipos con `request.resource.data`.
- **Nunca** `allow read, write: if true;` ni `if request.auth != null` a secas sobre colecciones completas.
- Las reglas también limitan costos: impedir queries sin `limit` con `request.query.limit <= 50`.

## Storage Security Rules
- Deny by default. Lectura pública solo en `products/**` y `public/**`.
- Escritura solo para `request.auth.token.admin == true`, `request.resource.contentType.matches('image/.*')` y `request.resource.size < 2 * 1024 * 1024`.

## App Check
- Activar **App Check** (reCAPTCHA Enterprise) para Firestore, Storage y Auth en producción, en modo *enforce* tras verificar métricas.

## Server Actions y Route Handlers
- Cada Server Action: 1) validar input con zod, 2) verificar sesión, 3) verificar rol/propiedad, 4) ejecutar, 5) devolver solo lo necesario.
- No confiar en IDs o precios enviados por el cliente: recalcular totales en el servidor desde Firestore.
- Rate limiting en acciones sensibles (login, formularios de contacto, pedidos).
- Leer `node_modules/next/dist/docs/01-app/02-guides/data-security.md` antes de crear acciones.

## Desarrollo local
- **No se usan emuladores** (decisión del proyecto). En local, `pnpm dev` apunta al proyecto real `piu-pizza-cl` con la config de `.env.local` (copiar de `.env.example`).
- Por eso: **nunca** escribir datos de prueba en colecciones reales ni correr scripts de escritura contra producción sin revisarlos. Usar documentos con prefijo `_test` y borrarlos después.
- Si más adelante se necesita un entorno aislado, crear un proyecto aparte (`piu-pizza-cl-dev`), no emuladores.
- Las Security Rules viven versionadas en el repo (`firestore.rules`, `storage.rules`) y se publican **solo** con `firebase deploy --only firestore,storage`. Nunca editarlas en la consola: el repo es la fuente de verdad.

## Prohibido
- Commitear `serviceAccount*.json`, `.env*`, tokens o claves.
- Desactivar reglas "temporalmente" en producción.
- Exponer datos personales (teléfono, dirección, email) en documentos públicos.
