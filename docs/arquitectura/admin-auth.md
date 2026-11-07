# Panel de administración

El personal entra por `/admin/login`. Los clientes del restaurante no se registran. Este documento no tiene contraseñas, UID reales ni claves de servicio.

El acceso a Firestore sigue apagado (`PIU_FIREBASE_DATA` no se enciende). El ingreso solo habla con Firebase Authentication.

## Flujo

1. La persona escribe correo y contraseña en `/admin/login`.
2. El Web SDK valida las credenciales con persistencia en memoria. No se usa `localStorage` ni `sessionStorage`.
3. El navegador pide un ID token nuevo y lo envía por `POST /admin/session`.
4. El servidor verifica el token con el Admin SDK (`verifyIdToken`, revisando revocación).
5. Exige que `auth_time` tenga como máximo 5 minutos. Así la cookie nace de un ingreso recién hecho.
6. Lee el custom claim `role`. Solo acepta `superadmin` o `admin`. El formulario no puede mandar el rol ni el UID: el cuerpo admite únicamente `idToken`.
7. Crea la cookie `piu_session` y el navegador cierra la sesión del SDK. Queda la cookie, no una segunda sesión persistente.
8. Redirige a `/admin`. No existe `?next=`: cualquier destino pedido por URL se ignora.

Si la contraseña no sirve, el mensaje es el mismo para una cuenta inexistente y para una contraseña mala. Solo después de una contraseña correcta el servidor puede responder que esa cuenta no tiene acceso al panel.

## Sesión

| | |
|---|---|
| Nombre | `piu_session` |
| httpOnly | sí |
| secure | sí en producción. Si el proceso apunta al emulador de Auth, no: ese ensayo es HTTP y el navegador descartaría una cookie Secure. App Hosting no define el host del emulador |
| sameSite | `lax` |
| path | `/` |
| Duración | 8 horas |

Firebase no emite una cookie de sesión de menos de 5 minutos ni de más de 14 días. Por eso el ensayo no duerme una cookie hasta vencerla: comprueba el tope de 8 horas, rechaza una caducidad ya pasada y comprueba que el servicio niega una cookie de 1 segundo.

Cada página de `/admin` llama `verifySessionCookie(cookie, true)` antes de pintar HTML. Ese `true` rechaza la cookie si los refresh tokens fueron revocados. Authentication compara esa revocación en segundos: si el ingreso y la revocación caen en el mismo segundo, la cookie puede seguir vigente ese segundo. Una cookie alterada falla siempre. Si no hay sesión, o está vencida, la respuesta vuelve a `/admin/login`.

Cerrar sesión es `DELETE /admin/session`. Borra la cookie y vuelve al ingreso.

Crear y borrar la cookie exigen dos cosas a la vez:

- el encabezado `x-piu-requested-with: admin-login`, que otra página no puede poner en un `fetch` al sitio;
- `Origin` igual al host público (`Host`, o el primer valor de `X-Forwarded-Host` si el proxy lo reescribe).

No hay un contador propio de intentos. Authentication ya frena los ingresos repetidos (`auth/too-many-requests`). Eso vive en el servicio de Google, no en un mapa en memoria de esta app, así que no se comparte un candado extra entre instancias.

Las páginas bajo `/admin` se envían con `Cache-Control: private, no-store`.

## Roles

El claim `role` es la autoridad. No se lee de Firestore ni de un campo del formulario.

| Rol | Para quién | En este hito |
|---|---|---|
| `superadmin` | Propietario | Ve Inicio, Reservas, Mesas, Carta, Configuración y Personal. Esas secciones, salvo Inicio, dicen que están en desarrollo. |
| `admin` | Trabajador autorizado | Ve Inicio, Reservas, Mesas y Carta. No ve Configuración ni Personal. Si abre esas URL, el servidor lo devuelve a `/admin` sin pintar la pantalla. |

Los permisos están en `src/lib/auth/permissions.ts`. Las operaciones de reservas, mesas, carta y personal todavía no existen.

Cuando el script de propietario o `assignStaffRole` cambia un claim, conserva las otras claves del usuario y llama `revokeRefreshTokens`. Sin esa revocación, una cookie ya emitida seguiría vigente hasta las 8 horas. `assignStaffRole` además escribe auditoría, así que sigue exigiendo `PIU_FIREBASE_DATA=on` o el emulador de Firestore. El ingreso no lo usa.

## Rutas

`/admin/login` no está dentro del layout que exige sesión. Si ya hay sesión válida, esa página manda a `/admin`.

El layout de `src/app/admin/(panel)/` no entrega el panel si `readStaffSession()` no devuelve un rol. Cada página vuelve a llamar `requireSection` con su sección.

No hay proxy ni middleware. La barrera es el servidor, antes del HTML. El layout y el ingreso declaran `instant = false`: Next no arma un shell estático de esas pantallas, porque la cookie solo existe en cada request.

## Firebase Authentication

Proyecto real: `piu-pizza-cl`.

En App Hosting el Admin SDK usa la cuenta del backend (ADC). No hay un JSON de servicio en el repositorio. El ingreso no depende de `PIU_FIREBASE_DATA`.

En la consola, Email/Password tiene que estar habilitado para que el primer ingreso real funcione. Google como proveedor puede quedar para más adelante. No se usa Phone Auth. MFA no está habilitado y este hito no lo exige.

La config web (`NEXT_PUBLIC_FIREBASE_*`) no es secreta. No se copia aquí.

## Ensayo local

Las pruebas automáticas de Auth usan el proyecto `demo-piu-pizza` y solo el emulador. No tocan `piu-pizza-cl`.

```bash
pnpm test
pnpm test:auth
pnpm test:rules
```

`pnpm test` no levanta emuladores. Cubre frescura del ingreso, caducidad, roles, CSRF, redirecciones, rutas y que el inicio no invente cifras.

`pnpm test:auth` levanta el emulador de Auth y prueba una cuenta sin claim, `admin`, `superadmin`, cookie alterada, cookie revocada, cuenta deshabilitada y el mínimo de 5 minutos del servicio.

Para probar el formulario contra el emulador, en la terminal del servidor (sin commitear estas variables):

```bash
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-piu-pizza
```

Esas variables no van en `apphosting.yaml`. Si el emulador está encendido y el `projectId` del cliente es el de producción, el navegador y el Admin SDK miran proyectos distintos y el ingreso falla.

## Primer propietario

No se crea desde `/admin/login` y no hay una lista de correos en el frontend. El script `scripts/bootstrap-superadmin.mjs` solo asigna el claim a un usuario que ya existe. No se ejecutó contra producción.

1. En la consola de `piu-pizza-cl`, Authentication → Sign-in method → habilitar Email/Password.
2. Authentication → Users → Add user, con el correo de la persona propietaria. La contraseña se elige ahí y no se escribe en el repo, en el chat ni en este archivo.
3. Copiar el UID de esa fila.
4. Confirmar con la persona que ese correo es suyo antes de darle el rol. Un UID reenviado por un tercero no alcanza.
5. En un equipo de confianza, con una credencial de servicio fuera del repositorio (`GOOGLE_APPLICATION_CREDENTIALS` apuntando a un archivo que no está en esta carpeta):

```bash
PIU_BOOTSTRAP_CONFIRM=assign-superadmin PIU_BOOTSTRAP_TARGET=production BOOTSTRAP_UID=<uid> corepack pnpm exec node scripts/bootstrap-superadmin.mjs
```

Ese comando no se corre sin aprobación explícita. Si faltan las variables, el script sale sin cambiar nada. Si `FIREBASE_AUTH_EMULATOR_HOST` está definido al mismo tiempo que `PIU_BOOTSTRAP_TARGET=production`, también se niega.

6. El script guarda los custom claims que ya tenía la cuenta, pone `role: superadmin` y revoca las sesiones anteriores.
7. Abrir `/admin/login` e ingresar. El formulario pide un token nuevo, así que el claim viaja en ese ingreso. No hace falta registrarse de nuevo.

Para ensayar el script sin producción: emulador de Auth, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, sin `PIU_BOOTSTRAP_TARGET`. El usuario de prueba se crea en el emulador, no en la consola del proyecto real.

## Despliegue

No forma parte de este hito. Cuando se publique la rama:

- App Hosting ya tiene ADC. No subir una clave.
- No definir hosts de emulador en `apphosting.yaml`.
- No poner `PIU_FIREBASE_DATA=on`.
- Email/Password tiene que estar habilitado en la consola antes de que el propietario entre.
- No hace falta desplegar reglas: este hito no las cambia.
- `minInstances` sigue en 0.

## Qué queda pendiente

- El primer `superadmin` de producción no está asignado.
- MFA no está disponible. Una contraseña robada, dentro de las 8 horas y antes de una revocación, abre el panel.
- No hay un límite de intentos propio además del de Authentication.
- El panel no lee reservas, mesas ni productos. Las tarjetas dicen que la métrica aún no está conectada.
- `assignStaffRole` no tiene pantalla. Sigue apagado mientras Firestore de datos esté apagado.
- Cada vista del panel consulta Authentication para ver si la sesión fue revocada. En un equipo chico es aceptable; no es un listener en tiempo real.
- Google como segundo proveedor y App Check siguen sin activarse en este flujo.
