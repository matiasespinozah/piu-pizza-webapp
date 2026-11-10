# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).
Las reglas para mantenerlo están en [`.agents/rules/changelog.md`](.agents/rules/changelog.md).


## [Sin publicar]

### Agregado

- `/admin/mesas` permite a `admin` y `superadmin` crear y editar mesas, pausar la recepción, cerrar o completar un día, y guardar horario, duración, topes y avisos. La duración inicial es 90 minutos. Un `superadmin` puede habilitar la confirmación cuando no falten datos; eso no enciende la recepción pública. No se crean las mesas que la distribución informada no detalla.
- Una pausa, un día cerrado o un día completo rechaza solicitudes nuevas en el servidor. Al confirmar se respetan el tope diario, el tope por horario y las mesas, sin cancelar reservas ya confirmadas.
- El inicio del panel cuenta los productos de Firestore cuando el acceso a datos está encendido. Las cifras de reservas siguen en «Recepción desactivada» mientras `PIU_RESERVATIONS_WRITES` no esté en `on`.
- Catálogo de Fudo en `data/catalog/piu-catalogo-fudo.json` (14 categorías y 131 productos). `pnpm test:catalog` lo carga en el emulador, sin escribir en producción. Volver a importar no pisa el nombre, la descripción ni el precio editados en `/admin/carta`, salvo `node scripts/import-catalog.mjs --sobrescribir`. `/carta` y las tres sugerencias de la Home leen Firestore cuando el acceso a datos está encendido; si no, siguen con el catálogo local.
- `/admin/carta` permite a `admin` y `superadmin` agregar, editar, ocultar, eliminar y cambiar el precio de productos y categorías. Las fotos se guardan en Storage desde el servidor.

- Seguimiento de una solicitud en `/reservas/estado`, sin cuenta. El enlace lleva un secreto en el fragmento y la consulta es `POST /api/reservations/status`. La referencia `PIU-…` no abre la reserva. En el sitio publicado la consulta sigue apagada (`PIU_RESERVATION_STATUS` no está en `apphosting.yaml`).
- Reservas: el formulario puede guardar una solicitud pendiente cuando la recepción está encendida, y el equipo la revisa en `/admin/reservas`. Confirmar una mesa queda bloqueado hasta tener la distribución real. En el sitio publicado la recepción sigue apagada (`PIU_RESERVATIONS_WRITES` no está en `apphosting.yaml`). Guía en `docs/arquitectura/reservas-operacion.md`.
- Panel de administración en `/admin`, con ingreso en `/admin/login`. Solo entra quien tiene el rol `admin` o `superadmin` en el token de Firebase. La sesión queda en la cookie `piu_session` (httpOnly, 8 horas). Mesas, carta, configuración y personal se anuncian como en desarrollo. Guía en `docs/arquitectura/admin-auth.md`.
- Fundación Firebase, sin reservas reales ni catálogo importado: modelo de datos, reglas que niegan las reservas al navegador, Auth de personal por custom claims y acceso a Firestore apagado salvo emulador o aprobación. Documentado en `docs/arquitectura/firebase.md`.

### Cambiado

- La referencia visible de una solicitud pasa a `PIU-` y cuatro números, por ejemplo `PIU-2021`. Si ese número ya existe, se elige otro. El enlace privado de seguimiento no cambia y la referencia corta no abre `/reservas/estado`.
- La confirmación de una solicitud queda en una tarjeta compacta: confeti breve en oliva y terracota, ícono animado, «¡Solicitud recibida!», la referencia con botón para copiarla, fecha, hora, personas y zona con íconos, y los botones «Ver estado de mi reserva» y «Copiar enlace». Ya no muestra la URL completa.
- `/reservas/estado` abre la reserva directamente desde el enlace, con el estado destacado, una línea de avance (Recibida, Confirmada, En PIÙ) y acciones según el estado: cómo llegar, WhatsApp o una nueva solicitud. Sin enlace, pide pegarlo en un solo campo. Las animaciones se apagan si el sistema pide menos movimiento.
- Nuevo diseño de `/reservas/estado`: cabecera teñida según el estado con ícono grande, stepper con color propio por paso (Recibida en ámbar, Confirmada en verde, En PIÙ en verde fuerte con check), referencia en un bloque oliva, fecha destacada y hora, personas y zona en tiles. «Ver la carta» pasa a ser el botón principal mientras la solicitud está pendiente o ya estás en PIÙ.
- Nuevo diseño de `/admin/reservas`: métricas en tiles con ícono y la vista activa marcada, búsqueda arriba y fecha, estado y zona en un desplegable, cards compactas con hora, fecha corta y badge de estado con color, y ficha separada en visita, contacto (botón «Llamar»), observaciones, mesa, acciones, seguimiento e historial en línea de tiempo. En el celular la ficha aparece arriba de la lista con «Volver a la lista». Confirmar es el botón principal; rechazar y cancelar quedan como secundarios y piden un segundo toque, con opción «Volver». La lógica, las rutas y las acciones no cambian.
- Colores de estado de reserva (ámbar, verde, verde fuerte y rojo suave) documentados en `DESIGN.md` como única excepción a la paleta crema y oliva.
- El panel queda como herramienta de servicio: header verde y barra inferior en el celular, sidebar en escritorio. Inicio usa los conteos reales, las próximas confirmadas y los cupos web del día, sin porcentajes inventados. `/admin/reservas` muestra filtros a la vista y acciones rápidas solo si el estado las permite. `/admin/reservas/disponibilidad` muestra cupos web por franja y sector. Semana, duración, cupos y mensajes se editan en Configuración; la pausa y el día completo siguen en Mesas. La carta lista productos en filas y separa agotado de oculto.

### Corregido

- `PIU_RESERVATION_STATUS` y `PIU_RESERVATIONS_WRITES` aceptan `on` con espacios o en mayúsculas, como puede quedar guardado desde la consola de App Hosting. Siguen exigiendo `PIU_FIREBASE_DATA=on`.
- `/admin/mesas` guarda cupos, duración y horario sin borrar reservas ni encender la recepción pública. Un grupo de más de 4 personas sigue pendiente. El cupo cuenta reservas superpuestas durante la duración.
- `/admin/carta` filtra por buscador, categoría, agotados, ocultos y sin foto. Tocar un producto abre el editor. El menú cambia precio, disponibilidad, visibilidad y orden. La foto se puede elegir al crear el producto.
- Una foto de producto ausente sigue usando la ilustración de PIÙ. Una descripción vacía no se rellena con ingredientes.
- Con la recepción apagada, `/reservas` avisa de inmediato que no se puede enviar una solicitud y muestra WhatsApp, sin recorrer el formulario.
- En `/admin/login`, el logo de PIÙ queda centrado sobre el título, un poco más chico y separado del encabezado, sin el margen vacío del archivo.
- Reservas en el celular: la fecha y su etiqueta quedan dentro de la pantalla. El control nativo ya no empuja el campo hasta el borde.
- Reservas: la ilustración de la página usa el dibujo nuevo, con fondo transparente.
- Reservas: el salón acepta hasta 15 personas y la terraza hasta 20. Si el grupo supera el tope de la zona elegida, el número baja a ese máximo.
- Reservas en el celular: menos texto, pasos que se pueden tocar para volver («Tu visita», «Horario», «Tus datos») y observaciones marcadas como opcionales. La ilustración de la reserva reemplaza la foto de la terraza. «¿Necesitas ayuda?» solo aparece en Tus datos, y ahí se oculta la burbuja de WhatsApp. La vista previa es una etiqueta corta sobre una tarjeta más clara.

- Hero móvil: la foto vertical recorta el suelo sobrante y deja el horno y el logo circular completos. «Reservar una mesa» y «Ver la carta» vuelven a quedar debajo del logo, no bajo el titular. El escritorio no cambia.
- Portada del Home: `piuportada` en pantallas desde 768 px y `piuportadamobile` en el celular (9:16, la foto entra completa). En pantallas anchas el hero recorta el techo, deja el mesón completo y asoma el inicio de la sección siguiente. El «PIÙ» escrito del hero y la frase «Pizzas artesanales, ingredientes reales…» se quitan. «Ver la carta» usa el verde de «Cómo llegar». En móvil el titular queda arriba y los botones «Reservar una mesa» y «Ver la carta» van separados, del mismo tamaño y centrados bajo el logo. El titular deja ver la cola de la «j». La franja tricolor del titular usa un verde y un rojo más vivos. Van en WebP desde `src/assets/home/`.
- **Sugerencias del chef**: cada tarjeta lleva la foto del producto (`imageUrl` del catálogo local) o la ilustración `not_image` si no tiene. El botón «Ver carta» usa el terracota de «Reservar».
- Home más compacta y directa: Hero → Sugerencias del chef → Un lugar para compartir → Tu mesa te espera → Ven a encontrarnos → Footer.
- Encuadre del Hero estabilizado: el alto de la foto ahora depende del ancho (`aspect-[3/4]` en móvil, `clamp(36rem, 56.25vw, 64rem)` en escritorio) y no de `svh`, para que `object-cover` recorte igual en local y en producción. Los enlaces «Ver la carta» del Hero van a `/carta`.
- **Sugerencias del chef**: espaciado reducido y botón «Ver carta» hacia `/carta`. Los enlaces Carta del header y del footer también van a `/carta`.
- **Un lugar para compartir**: encabezado en una fila, foto de la terraza con etiqueta sobre la imagen y panel del salón a la misma altura; sección menos alta.
- **Tu mesa te espera**: bloque oliva compacto, con el CTA a la derecha en escritorio.
- **Ven a encontrarnos**: sección y mapa menos altos, dirección enlazada a Google Maps y botón flotante «Abrir en Google Maps» sobre el mapa. Las URL de Maps usan la dirección completa (Primera Transversal 2595, Maipú, Región Metropolitana, Chile).

### Eliminado

- Sección «Descubre nuestra carta» del Home (`MenuSection`): repetía lo que ya cuentan Sugerencias del chef y la página `/carta`.

### Corregido

- `pnpm test:auth` usa otro puerto si el 9099 ya tiene un emulador, y no lo detiene.
- En el Hero de escritorio, el build de producción dejaba el `<source>` de la foto horizontal sin `srcset`. El navegador usaba la foto vertical y, con el recorte hacia abajo, se veía el suelo en lugar del horno y el logo. En desarrollo el `srcset` sí existía, por eso el encuadre solo fallaba al publicar.

### Seguridad

- La importación del catálogo no corre si el proyecto es `piu-pizza-cl`. Las fotos de producto las escribe el servidor; Storage solo deja leerlas.
- El enlace de seguimiento no se guarda en claro. Firestore tiene el hash y un cifrado para reponerlo solo si se reintenta la misma solicitud. Un secreto malo, vencido o revocado responde igual. La página no se indexa y la respuesta no se cachea.
- El tope de solicitudes usa la dirección que agrega la plataforma al final de `X-Forwarded-For`. La primera la puede escribir el visitante.
- Las solicitudes, los cupos y el historial de reservas siguen cerrados al navegador. El envío público tiene un tope por hora en Firestore y no devuelve el celular. Cada cambio del panel exige la sesión y queda anotado con quien lo hizo.
- El ingreso del personal no guarda la contraseña ni el token en el navegador. Crear la cookie exige un token reciente, un rol de personal y un pedido del propio sitio. Quien no tiene rol recibe acceso denegado. El script del primer propietario ya no borra los otros custom claims, y revoca las sesiones anteriores.

### Agregado

- Página `/reservas`: tres pasos para pedir fecha, personas, zona, horario y datos de contacto. Los botones de reserva de la Home, la barra y el footer llevan a esa página. La recepción queda descrita en `docs/arquitectura/reservas.md`.
- Página `/carta` (solo frontend, datos locales): encabezado editorial, buscador sin acentos, categorías deslizables con estado «En preparación» para las que aún no tienen productos, y filas de carta con la ilustración PIÙ como imagen predeterminada.
- Catálogo local en `src/lib/catalog/` (`Category`, `Product`, `CatalogDataSource`): única fuente de los tres productos para la Home y `/carta`. Puntos de integración futura en `docs/arquitectura/catalogo.md`.
- Tarjetas de **Sugerencias del chef** rediseñadas: imagen arriba con `ProductImage` (ilustración PIÙ mientras no haya foto), etiqueta numerada, nombre, descripción y precio.
- Imagen predeterminada `not_image.png` para productos sin fotografía, con `ProductImage` reutilizable. Las fotos reales se recortan; la ilustración se muestra completa sobre fondo crema.
- Home cinematográfica en `/`: fotografía de la mesa, navegación y secciones editoriales. El titular lleva una ola tricolor que vuelve al marfil y se detiene si se pide menos movimiento.
- Hero a `88svh`, con la marca PIÙ proporcionada al titular, botones de la misma altura y barra más sobria al desplazar.
- Hero móvil en dos zonas: bloque oliva con marca y copy, y fotografía gastronómica debajo, sin texto sobre la pizza. El escritorio no cambia.
- Hero móvil fotográfico a sangre: barra crema, titular editorial sobre la foto y CTA contenido. El escritorio no cambia.
- Portada con `PiuComida`: recorte vertical en móvil (pizza abajo, horno al fondo) y encuadre horizontal en escritorio.
- Ajustes del Home móvil: logo más presente, menos aire hacia Sugerencias del chef, WhatsApp más discreto y titular con mejor contraste.
- Sección **Sugerencias del chef** en la Home: vitrina tipográfica de tres pizzas, carrusel en móvil y grilla en escritorio.
- Home reordenada: Hero, sugerencias del chef, carta, terraza y salón, reserva. El salón queda preparado para su fotografía. El catálogo local vive en `src/lib/menu.ts`.
- Footer oliva con horarios, Instagram, TikTok y un WhatsApp flotante con aviso «¿Necesitas ayuda?».
- Sección **Ven a encontrarnos** en la Home: dirección, mapa de Primera Transversal 2595 (Maipú) y botón «Cómo llegar». Los horarios quedan solo en el footer.
- Footer móvil con el logo redondeado; sin frase, sin wordmark de texto y sin el bloque Explorar.
- Logos de Instagram y TikTok del footer tomados de `public/logos`, en cuadrado redondeado y sin borde.
- Logo oficial de PIÙ en el header. En el Hero, el texto PIÙ / Pizza & Dolce solo aparece en escritorio, sin el eyebrow repetido.
- CI en GitHub Actions para la rama `develop` (`.github/workflows/ci.yml`): lint, tipos, changelog/versiones alineadas y build, en cada push y PR.
- Rama `develop` como rama de trabajo; `main` queda solo para producción.
- El CI también corre en cada push a ramas `feature/**` y `feat/**`, exigiendo la entrada del CHANGELOG respecto de `develop`.
- El CI vuelve a correr al editar un PR (por ejemplo, al cambiar su rama base), para que los checks reflejen la base actual.
- El CI también corre en PRs hacia `main`, con el job **"PR a main solo desde develop"**, que falla si el PR no viene de `develop`. Ambos jobs son checks obligatorios en los rulesets de GitHub.
- Script `pnpm typecheck` (`next typegen && tsc --noEmit`: genera los tipos de rutas de Next antes de chequear, necesario en un clon limpio como el CI).
- Modo CI en `scripts/check-changelog.mjs` (`CHANGELOG_BASE`): en un PR exige entrada en el CHANGELOG respecto de la rama base.

### Cambiado

- Home, «Descubre nuestra carta»: tarjetas de categoría con imagen (foto de un producto o la ilustración predeterminada), nombre y estado («Ver sabores» / «Próximamente»), leídas del catálogo local. Se muestran 3 y el resto aparece con «Mostrar más categorías», ahora un botón terracota como «Reservar» (`accent`), con la cantidad de categorías ocultas en una píldora. Al pulsar «Mostrar menos» la vista vuelve suavemente al inicio de las categorías (instantáneo con movimiento reducido). Cada una enlaza a `/carta#categoria`, que abre esa categoría. Se elimina `src/lib/menu.ts`, que quedó sin uso.
- Filas de la carta con estructura fija (miniatura, nombre, precio): el precio queda siempre arriba a la derecha y la descripción usa todo el ancho, sin importar el largo del texto.
- El botón flotante de WhatsApp se oculta suavemente mientras se desliza la página y reaparece con un efecto «pop» al detenerse (sin escala con movimiento reducido). En móvil es un 5 % más pequeño.
- En `/carta`, al tocar un producto se abre una ficha ampliada con imagen grande, nombre, precio y descripción (`ProductDetailDialog`). `ProductImage` admite la proporción `4/3`.
- «Ver la carta», «Explorar carta completa» y el enlace Carta del header y del footer llevan a `/carta`. El header tiene una variante sólida para páginas internas.
- `src/lib/menu.ts` ya no duplica productos: «Sugerencias del chef» lee del catálogo local.

## [0.2.0] - 2026-11-03

### Agregado

- Versión de humo desplegada en Firebase App Hosting: backend `piu-pizza-webapp` (`us-central1`, Node 24), con lanzamientos automáticos desde `main`. URL: https://piu-pizza-webapp--piu-pizza-cl.us-central1.hosted.app
- Infraestructura Firebase en el proyecto `piu-pizza-cl` (`us-central1`): app web "PIU Pizza Web", Cloud Firestore (Standard), Cloud Storage (`piu-pizza-cl.firebasestorage.app`) y Authentication con email/contraseña y Google.
- `apphosting.yaml` con `minInstances: 0`, `maxInstances: 10`, 1 vCPU, 512 MiB y la config web en `NEXT_PUBLIC_FIREBASE_*`.
- `firebase.json`, `.firebaserc`, `firestore.rules` y `storage.rules` (deny by default) y `firestore.indexes.json`.
- SDKs `firebase` (cliente, `src/lib/firebase/client.ts`) y `firebase-admin` (servidor, `src/server/firebase/admin.ts`, con `server-only`).
- `.env.example` y `.nvmrc`; `engines.node` en `24.x`.

### Cambiado

- `.agents/rules/firebase-security.md`: sin emuladores, infraestructura solo con Firebase CLI, reglas publicadas solo desde el repo.
- `pnpm-workspace.yaml` declara los scripts de instalación permitidos (exigido por pnpm 11).
- Proveedores de Auth definidos: email/contraseña y Google, sin enlace por email ni SMS. Nombre y teléfono se pedirán como datos de perfil. Actualizados `cost-control.md`, `firebase-security.md`, `docs/ux/ideas-niusushi.md`, el diagrama y el informe de costos.

### Seguridad

- Reglas de Firestore y Storage publicadas en modo deny-by-default.

## [0.1.0] - 2026-11-03

### Agregado

- Documento `docs/ux/ideas-niusushi.md` con ideas de usabilidad tomadas de niusushi.cl e ideas de implementación para PIÙ (por revisar, no implementado).
- Regla obligatoria **mobile first** (`.agents/rules/mobile-first.md`), cargada en `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor y Copilot.
- `viewport` en el layout raíz (`device-width`, `viewportFit: "cover"`, `themeColor` crema) y utilidades `pb-safe`, `pt-safe`, `px-safe` para safe areas.
- Estilos base móviles: sin destello al tocar, `touch-action: manipulation`, `text-size-adjust` y respeto de `prefers-reduced-motion`.
- Librería de componentes UI en `src/components/ui/` basada en shadcn/ui + Radix y adaptada a `DESIGN.md`:
  - `Button` (primary, secondary, tertiary, ghost, link; tamaños sm/md/lg/icon; estado `loading`; `asChild`).
  - `TextLink` (inline, nav, standalone, `external`), `Badge`, `Price` con formato CLP.
  - Tipografía: `Heading`, `Display`, `Text`, `Lead`, `Caption`, `Eyebrow`.
  - Layout: `Container`, `Section`, `Stack`.
  - `Card` con `CardMedia`, variantes default/raised/plain, tamaños compact/default/feature e `interactive`.
  - Formularios: `Input`, `Textarea`, `Label`, `Field`, `Select`, `Checkbox`, `RadioGroup`.
  - `Tabs`, `Accordion`, `Dialog`, `Sheet`, `DropdownMenu`, `Tooltip`, `Toaster` (sonner), `Skeleton`, `Separator`, `VisuallyHidden`.
  - `Logo` como placeholder hasta contar con el SVG oficial.
- Muestrario interno de componentes en `/ui` (solo en desarrollo; 404 en producción).
- Tokens de marca en `globals.css` mapeados a los tokens semánticos de shadcn/ui, escala de radios y sombras de `DESIGN.md`.
- Carga automática de reglas para agentes de IA: `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/*.mdc` y `.github/copilot-instructions.md`, todos apuntando a `AGENTS.md` y `.agents/rules/`.
- Este `CHANGELOG.md`, la regla `.agents/rules/changelog.md` y un hook de pre-commit que exige actualizarlo y que la versión de `package.json` coincida con la última versión publicada del changelog.
- Proyecto base Next.js 16.4 (App Router, Cache Components, Turbopack), React 19, TypeScript, Tailwind CSS v4 y pnpm.
- Fuentes Anybody y Roboto Mono vía `next/font`.
- `DESIGN.md` con el sistema de diseño de la marca.
- `AGENTS.md` y reglas en `.agents/rules/`: arquitectura, estándares de código, sistema de diseño, control de costos, imágenes y seguridad con Firebase.
- Documentación en `docs/`: informe de costos de Firebase (`docs/costos/PIU-costos-firebase.pdf`) y diagrama de arquitectura (`docs/arquitectura/`).

### Cambiado

- `Button` (`sm`, `icon-sm`) y `Select` (`sm`) miden 44 px en móvil y se compactan a 40 px solo desde `md:`.

### Seguridad

- Headers HTTP por defecto: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY` y `Permissions-Policy`; `poweredByHeader` desactivado.

### Eliminado

- Assets e íconos de ejemplo de create-next-app, la fuente Geist, el modo oscuro de shadcn/ui y la dependencia `next-themes`.

[Sin publicar]: https://github.com/matiasespinozah/piu-pizza-webapp/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/matiasespinozah/piu-pizza-webapp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/matiasespinozah/piu-pizza-webapp/releases/tag/v0.1.0
