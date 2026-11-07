# Fundación Firebase

Proyecto: **`piu-pizza-cl`**, región `us-central1`. No se creó otro proyecto. Este hito no guarda reservas, no importa el catálogo y no despliega reglas.

## Qué ya estaba

| Pieza | Estado |
|---|---|
| App Hosting | `apphosting.yaml`: `minInstances: 0`, config web pública. El backend de producción usa la cuenta de servicio de App Hosting (ADC). No hay JSON de claves en el repo. |
| Auth, Firestore y Storage | Nombrados en el proyecto. Proveedores previstos: email/contraseña y Google. Sin Phone Auth. |
| Web SDK | `src/lib/firebase/client.ts`. Ninguna página lo importa. |
| Admin SDK | `src/server/firebase/admin.ts`. `initializeApp()` sin argumentos en App Hosting. |
| Reglas | Firestore y Storage en deny-by-default. Índices vacíos. |
| Carta y reservas | Datos locales. El formulario no envía. |

El Admin SDK **no consulta** las Security Rules. Por eso cada función de `src/server/` revisa el rol antes de leer o escribir, y además el acceso nace apagado.

## Modelo

Nombres en inglés, alineados con el código. No hay documentos cargados.

| Colección | Para qué | Quién la lee desde el navegador |
|---|---|---|
| `reservations` | Una solicitud: fecha, hora, personas, zona (`salon` o `terrace`), nombre, celular, notas y estado. | Nadie. El celular del cliente no sale de aquí. |
| `tables` | Mesa real: zona, nombre, puestos (`null` si aún no se definen), `joinGroupId` si se junta con otras, `blocked`. | Nadie. No se inventó un plano ni una capacidad. |
| `categories` | Categorías de la carta. `isVisible` decide si se pueden leer. | Solo las visibles, y solo lectura. |
| `products` | Plato: precio entero en pesos (`priceClp`), foto opcional (`imageUrl`), visibilidad y disponibilidad. | Solo los visibles, y solo lectura. |
| `staff` | Ficha del trabajador (nombre y correo). **No guarda el rol.** | Nadie. |
| `restaurantSettings/operations` | Tope por zona, cupo sin reserva (`walkInHold`, null hasta definirlo) y anticipación (null). | Nadie. |
| `auditLogs` | Quién cambió qué, sin copiar el teléfono del cliente. | Nadie. |
| `reservationAccess` | Hash del enlace de seguimiento, vencimiento, revocación y un cifrado del secreto. No guarda el secreto en claro. | Nadie. |
| `reservationStatusRate` | Contador de consultas de seguimiento, sin la dirección ni el secreto. | Nadie. |

No hay colección `customers`. Quien reserva no crea cuenta. El nombre y el teléfono viven solo dentro de la reserva.

El rol no se guarda en Firestore. Va en el custom claim `role`: `superadmin` o `admin`. El navegador no puede escribir ese claim.

- **SUPERADMIN:** personal, configuración, catálogo y reservas, siempre a través del servidor.
- **ADMIN:** reservas y catálogo, también a través del servidor. No asigna roles.
- Un cliente anónimo, o una cuenta sin claim, no es personal.

Los 15 y 20 personas del formulario siguen en `src/lib/reservations/configuration.ts`. El documento de ajustes puede repetirlos más adelante; hoy no existe en la base.

## Cómo se conecta

```
Navegador ── /admin/login (email y contraseña, sin localStorage)
          ── no lee Firestore de reservas

/admin/session ── verifica el ID token y el rol ── cookie piu_session (httpOnly, 8 h)
/admin         ── lee esa cookie en el servidor antes de mostrar el panel

App Hosting ── Admin SDK ── Firestore
          Las escrituras de reservas siguen apagadas hasta PIU_RESERVATIONS_WRITES=on
          y PIU_FIREBASE_DATA=on. Ninguna de las dos está en apphosting.yaml.
```

- `src/lib/firebase/model.ts`: formas de los documentos (zod).
- `src/server/auth/session.ts`: crea y lee la cookie. Sin rol de personal, no hay sesión.
- `src/server/auth/claims.ts`: solo un SUPERADMIN cambia el claim de otra cuenta, y revoca las sesiones viejas.
- `src/server/reservations/`: solicitudes, transiciones y cupos. El panel las usa. El navegador no lee la colección.
- `src/server/dal/`: el listado anterior no está conectado. No hay Server Actions: un archivo `"use server"` sería un endpoint público.
- `assertFirebaseDataEnabled()` se niega a tocar Firestore salvo `PIU_FIREBASE_DATA=on` o `FIRESTORE_EMULATOR_HOST`.

En App Hosting, `initializeApp()` usa la cuenta del backend. En el emulador se inicializa solo con el `projectId`, sin clave. Esa variable de emulador no está en `apphosting.yaml`.

## Reglas

`firestore.rules` niega todo y luego abre únicamente la lectura de categorías y productos visibles, con `limit` de 1 a 50. Escribir sigue cerrado incluso para `admin` y `superadmin`: el cliente no confirma reservas ni publica platos.

Storage sigue cerrado. Las fotos de productos se abrirán cuando existan, con tipo de imagen y tope de 2 MB.

No se publicaron. Publicar es `firebase deploy --only firestore,storage` y pide aprobación.

## Ensayo local

```bash
pnpm test
pnpm test:auth
pnpm test:rules
pnpm test:reservations
pnpm test:reservation-status
```

`test:rules` levanta el emulador de Firestore con el proyecto **`demo-piu-pizza`**. No es `piu-pizza-cl`. Hace falta Java para el emulador. `test:auth` usa solo el emulador de Auth, con el mismo proyecto de prueba.

El primer SUPERADMIN no se crea con una contraseña de ejemplo. El script `scripts/bootstrap-superadmin.mjs` sale sin hacer nada si faltan las variables. Contra producción exige `PIU_BOOTSTRAP_TARGET=production` y no se ejecutó en este hito. Al asignar el rol conserva los otros custom claims. Los pasos están en `docs/arquitectura/admin-auth.md`.

## Reservas

El camino para guardar una solicitud está en `docs/arquitectura/reservas.md` y la guía de operación en `docs/arquitectura/reservas-operacion.md`. En producción no se enciende solo por estar el código en `main`.

Siguen fuera: catálogo importado, Fudo, WhatsApp automático, correo, SMS y pagos.
