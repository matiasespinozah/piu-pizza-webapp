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
- El personal entra en `/admin/login`. Los clientes del restaurante no tienen cuenta.
- Email y contraseña con el Web SDK, persistencia en memoria. El ID token se envía a `/admin/session` y el servidor crea la cookie `piu_session` (`httpOnly`, `secure` en producción, `sameSite=lax`, 8 horas). No va a `localStorage`.
- Ese route exige que `Origin` coincida con el host y el encabezado `x-piu-requested-with: admin-login`. No acepta `?next=`.
- El layout de `/admin` llama `readStaffSession()` antes de pintar HTML. `/admin/login` está fuera de ese layout. Cada página vuelve a pedir su sección con `requireSection`.
- `verifyIdToken` y `verifySessionCookie` se llaman con `checkRevoked: true`. Además, cada pedido del panel lee `getUser`: el claim vigente y `disabled` mandan sobre la cookie. Una ficha pendiente, suspendida o rechazada no abre el panel. Cambiar un rol también ejecuta `revokeRefreshTokens`.
- Los roles son `superadmin` y `admin`, en el custom claim `role`. No es un campo de Firestore. El mapa de permisos está en `src/lib/auth/permissions.ts`.
- El procedimiento, los emuladores y lo que aún no existe están en `docs/arquitectura/admin-auth.md`.
- Proveedores previstos: **email/contraseña** y **Google**. Este panel usa solo email/contraseña. Sin Phone Auth. MFA no está contratado: no se exige en el ingreso.
- El ingreso no dice si un correo es de personal cuando la contraseña falla. Firebase ya limita los intentos; no hay un segundo contador propio.

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
- `pnpm dev` **no** lee ni escribe Firestore. El acceso nace apagado (`src/lib/firebase/access.ts`) hasta `PIU_FIREBASE_DATA=on` o hasta que el proceso apunte al emulador.
- Las pruebas de reglas usan el emulador con un proyecto `demo-*` (`pnpm test:rules`). La sesión de personal se ensaya con `pnpm test:auth` (solo el emulador de Auth, el mismo proyecto `demo-piu-pizza`). Ninguno es `piu-pizza-cl`.
- Auth del emulador solo si `FIREBASE_AUTH_EMULATOR_HOST` está definido. App Hosting no define esa variable. El ingreso del panel no enciende `PIU_FIREBASE_DATA`.
- **Nunca** escribir datos de prueba en colecciones reales ni correr `scripts/bootstrap-superadmin.mjs` contra producción sin aprobación. La clave de una cuenta de servicio, si hace falta, queda fuera del repo (`GOOGLE_APPLICATION_CREDENTIALS`).
- Las Security Rules viven versionadas en el repo (`firestore.rules`, `storage.rules`) y se publican **solo** con `firebase deploy --only firestore,storage`, y solo con aprobación. Nunca editarlas en la consola: el repo es la fuente de verdad.

## Prohibido
- Commitear `serviceAccount*.json`, `.env*`, tokens o claves.
- Desactivar reglas "temporalmente" en producción.
- Exponer datos personales (teléfono, dirección, email) en documentos públicos.
