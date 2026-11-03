# Control de costos (Firebase Blaze, pago por uso)

Detalle y estimaciones: `docs/costos/PIU-costos-firebase.pdf`. Este archivo contiene las reglas que mantienen la factura cerca de **USD $0–5/mes**.

## Dónde se va la plata (en orden)

1. **Ancho de banda de App Hosting**: 10 GiB/mes gratis, luego **$0,15/GiB desde caché y $0,20/GiB sin caché**. Las imágenes son el 80% del peso.
2. **Instancias de Cloud Run siempre encendidas** (`minInstances > 0`): decenas de USD al mes aunque no haya visitas.
3. **Lecturas de Firestore**: 50.000/día gratis. Una página que lee 30 documentos por visita sin caché las agota con ~1.600 visitas/día.
4. **Auth sobre 50.000 MAU** (precios de Identity Platform) y **SMS** (sin cuota gratis).
5. **Logs** sobre 50 GiB/mes.

## Reglas de App Hosting / Cloud Run
- `runConfig.minInstances: 0` (default). Cambiarlo requiere aprobación explícita del dueño.
- `maxInstances` acotado (ej. 10) como freno ante tráfico anómalo o bots.
- `cpu: 1`, `memoryMiB: 512` mientras sea suficiente. `concurrency` alta (80) para que una instancia atienda muchas requests.
- Todo en `us-central1` (App Hosting, Firestore, Storage).

## Reglas de rendering y caché
- Páginas públicas **prerenderizadas** y servidas desde CDN. Si una página pública se vuelve dinámica sin razón (por leer `cookies()` arriba en el árbol), es un bug de costos.
- Toda lectura del DAL con `"use cache"` + `cacheLife` + `cacheTag`; invalidar con `updateTag` / `revalidateTag(tag, "max")` tras mutaciones (nunca revalidación por tiempo muy corta como "seconds").
- Assets estáticos con hash (`/_next/static`) y caché `immutable`.
- No usar `export const dynamic = "force-dynamic"` ni `connection()` en páginas públicas.

## Reglas de Firestore
- **Siempre `limit()`**, paginación por cursor (`startAfter`). Nunca `offset()` (cobra los documentos saltados).
- **Prohibido `onSnapshot`** en páginas públicas. En áreas privadas, solo con `limit()`, sobre un documento o una query acotada, y con `unsubscribe` al desmontar.
- Desnormalizar para leer 1 documento en vez de N (ej. `menu/current` con todo el menú resumido).
- Contadores con `count()` (agregación) en vez de leer todos los documentos.
- Nada de escribir en Firestore por cada vista de página (analytics caseros → usar Google Analytics).
- Un solo database (el gratuito). No crear databases extra.

## Reglas de Auth
- Proveedores habilitados: **email/contraseña** y **Google**. Sin enlace por email. **Phone/SMS prohibido** salvo decisión del dueño (cobra por mensaje).
- El teléfono y el nombre del cliente se piden como **datos de perfil** al registrarse (guardados en Firestore), no como método de login: verificar el teléfono por SMS tiene costo.
- Permitir comprar como invitado si aplica, para no convertir cada visitante en MAU.

## Reglas de logs y observabilidad
- Nada de `console.log` en rutas calientes. Logs de error estructurados, sin payloads completos.
- No subir el tiempo de retención de logs (30 días gratis).

## Alertas (configurar al crear el proyecto)
- Presupuesto en Cloud Billing con alertas al 50%, 90% y 100% de **USD $10**.
- Los presupuestos **solo avisan, no cortan el servicio**. Revisar el panel de uso de Firebase cada semana durante el primer mes.

## Checklist antes de un PR
- [ ] ¿Agregué lecturas a Firestore? ¿Están cacheadas y con `limit()`?
- [ ] ¿Alguna página pública pasó a ser dinámica? (`pnpm build` muestra el tipo de cada ruta)
- [ ] ¿Las imágenes nuevas cumplen `images-media.md`?
- [ ] ¿Agregué un servicio con costo? ¿Está documentado en `docs/`?
