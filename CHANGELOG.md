# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).
Las reglas para mantenerlo están en [`.agents/rules/changelog.md`](.agents/rules/changelog.md).


## [Sin publicar]

### Agregado

- Google Analytics 4 (la propiedad de Firebase Analytics, ID `G-2XJXG2E0WJ`), cargado con `gtag.js` al terminar de cargar la página y solo en producción. Mide páginas vistas en tiempo real (también al navegar sin recargar), fichas de producto abiertas, categorías, búsquedas en la carta, cada paso del formulario de reservas, solicitudes enviadas (día, hora, personas, zona y anticipación, sin datos del cliente), errores de reserva por código, clics a WhatsApp, mapa, redes y «Mi reserva», y para mantención las métricas de rendimiento reales (LCP, CLS, INP, FCP, TTFB) y los errores de JavaScript del navegador. No se mide `/admin`, `/api` ni `/reservas/estado` (su dirección lleva un código secreto): ahí se activa el interruptor `ga-disable` de Google, que apaga incluso lo automático. Nunca se envía la URL de un enlace de WhatsApp. El consentimiento es medición básica sin publicidad; edad y género quedan apagados (`googleSignals`). Hay pasos que se hacen una sola vez en la consola de Google Analytics, listados en `docs/arquitectura/analitica.md`. Nuevos: `src/lib/analytics/`, `Analytics` en el layout, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` en `apphosting.yaml`, y el CSP en reporte permite los dominios de Google Analytics.
- El despliegue de `reservationMailRecover` incluye `@google-cloud/functions-framework` y declara los scripts de instalación de pnpm. Así Cloud Build puede instalar la función sin volver a publicar `reservationBackup`.
- Los correos de reserva quedan preparados y apagados. Al guardar una solicitud pública se encola «Recibimos tu solicitud» y, al confirmarla, «Tu reserva está confirmada». No se envían mientras `PIU_RESERVATION_EMAILS` no sea `on`. Si el envío falla, la reserva sigue guardada. `reservationMailRecover` revisa cada 5 minutos la cola posterior a `PIU_RESERVATION_EMAILS_SINCE`, sin tocar el respaldo de Excel.
- En el dashboard, solo el propietario ve «Medicion de pruebas» de hoy: visitas y tiempo en el inicio, la carta y `/reservas`, más quién llegó a Tus datos y quién dejó la solicitud guardada. Cada visita escribe una sola vez, al salir, en `metricsDays`. Reservar suma una escritura más solo si la solicitud es nueva. No hay cookie. Si el conteo falla, la página igual funciona.
- En `/admin/reservas`, arriba a la izquierda, «Respaldo» abre la unidad de Drive donde queda el Excel de reservas.
- Un generador local arma `PIU_Respaldo_Reservas.xlsx` con las hojas Hoy, Mañana y Pendientes, con un máximo de 200 reservas de esos dos días, sin borrar nada de Firestore. Cada corrida lee hasta 250 documentos por día.
- La función `reservationBackup` queda lista para publicarse, sin desplegarla: corre cada hora en `us-central1` con la cuenta `piu-respaldo-reservas` y actualiza ese Excel en la unidad compartida. Si la lectura o el archivo salen incompletos, conserva el respaldo anterior. Son como máximo 500 lecturas por hora y no mantiene instancias encendidas.
- El rol `mesero` atiende en `/admin/atencion`: ve las reservas confirmadas de hoy, marca la llegada, elige una mesa ya configurada y finaliza la atención. No confirma, rechaza, cancela ni abre el resto del panel. Los avisos que recibe son los de la atención, no los de solicitudes pendientes ni de personal. El propietario lo asigna desde Personal.
- `/nosotros` cuenta la historia de Felipe y Camila. El enlace Nosotros del encabezado abre esa página. Faltan fotos de los inicios y de la familia; el local y la terraza usan las imágenes que ya tiene el sitio.
- En `/admin/reservas`, Hoy, Futuras y Pasadas ordenan por la visita y muestran 20 por página. Hoy es la vista inicial. Pasadas recorre el mes y, en el mes en curso, llega solo hasta ayer. «Todas las reservas» abre `/admin/reservas/historial`, fuera del menú y con la misma autorización de reservas. Los índices de `date` y `preferredTime` quedaron escritos en `firestore.indexes.json`; no se publicaron.
- El formulario público pide el correo y lo guarda en minúsculas. La reserva manual puede quedar sin correo. El seguimiento público no lo recibe.
- En `/reservas`, la casilla de promociones por correo nace marcada y se puede desmarcar. Si queda marcada, esa reserva guarda el correo y la aceptación. Si se desmarca, la reserva sigue y no borra una aceptación anterior. No hay correo de confirmación ni baja automática.
- En el encabezado, «Mi reserva» abre una ventana con PIU- ya escrito. Los cuatro números llevan a `/reservas/estado`, que se actualiza solo cada 30 segundos mientras la página está abierta. Un código que no existe no revela si hay otra reserva. Cada consulta sigue limitada por hora.
- En `/admin/reservas`, `admin` y `superadmin` pueden crear una reserva recibida en el local o por teléfono, reagendar, anotar una mesa opcional y guardar una nota interna. Si el grupo o el horario superan los cupos, el panel avisa y permite continuar solo con una excepción explícita. Queda registrado quién la autorizó, cuándo y por qué, sin cambiar la configuración del local ni las reglas del formulario público.
- El panel muestra una campana con avisos persistidos: solicitud nueva, reserva próxima, pendiente que sigue esperando, cambio de horario, cancelación y cambios de otro integrante. Se actualizan solos, se pueden marcar como leídos y abren la reserva. El sonido es opcional. Esas lecturas usan el servidor y Firestore sigue cerrado al navegador.

### Cambiado

- En el pie de página, «Nosotros» abre `/nosotros` en vez de bajar a la sección del inicio.
- Costos: la campana de avisos del panel consulta cada 25 s con la pestaña a la vista y cada 2 minutos en segundo plano, en vez de cada 25 s siempre, y un fallo de red ya no la detiene. El barrido de avisos (`sweepNotices`, hasta 60 lecturas) corre como máximo una vez por minuto en cada instancia al listar avisos. Antes cada consulta de cada panel abierto lo ejecutaba, y las lecturas de Firestore subieron de ~150 a 45–115 mil al día desde el 18 de noviembre. El aviso de una reserva nueva puede tardar hasta 2 minutos si la pestaña está oculta.
- En `/reservas`, el cliente no puede pedir una hora posterior a la última reserva en línea de Configuración. De lunes a jueves el tope queda en las 21:00 y viernes y sábado en las 22:00 cuando el día no tiene otra hora guardada. Un horario especial sin hora propia hereda ese tope. La solicitud se vuelve a revisar al guardarla.
- `/reservas` muestra antes el formulario en el celular. El horario queda plegado en «Ver horario» y se abre al tocarlo; en el escritorio sigue visible al costado. Se quitaron la frase de bajada, el aviso repetido en cada paso y la nota de privacidad de Tus datos. El texto de la casilla de promociones no cambia, porque es la versión `v1` del consentimiento.
- El horario del footer y de `/reservas` sale de Configuración. La última reserva en línea parte a las 21:00 de lunes a jueves y a las 22:00 viernes y sábado, y se puede cambiar en el mismo horario. El footer lee un documento, con la caché de la carta.
- La burbuja de WhatsApp pregunta a qué local escribir. Casa Più abre el +56 9 2721 4013 y Restaurant Più Pizzas abre el número que ya estaba. Las reservas siguen escribiendo al restaurante.
- En Personal, el propietario elige el rol al crear la invitación. Cuando la persona crea su cuenta, entra con ese rol. No hace falta aprobarla otra vez. Una invitación de propietario pide confirmación en ese momento. Las solicitudes que ya estaban pendientes se aprueban como antes.
- En Disponibilidad y al confirmar, el cupo de un sector son personas, no reservas ni mesas. Una reserva de 15 personas ocupa 15 de las 20. Queda amarillo si quedan menos de 5 personas y rojo si no queda ninguna. Las mesas se siguen acomodando en el local.
- En `/nosotros`, la historia se lee por capítulos. El campeonato de 2023 queda solo arriba. El horno de la foto es el segundo y llega en el bloque de 2026, junto al segundo lugar en Italia. Junto a Camila va la cocina, y junto a «Lo que nos mueve» el interior. Las fotos entran completas, en WebP, sin recortar a las personas.
- La foto principal del inicio es la cocina de PIÙ. En escritorio se recorta anclada abajo, con el logo blanco dentro. En el celular entra la foto vertical completa. `/nosotros` sigue con la foto anterior.
- En el inicio, «Un lugar para compartir» muestra Terraza e Interior juntas. Al elegir un lado, esa foto ocupa el cuadro y la otra queda en una franja. En el celular la foto elegida se ve completa, sin el bloque de texto encima.
- En Disponibilidad, cada franja es de 30 minutos e incluye las 17:30. Muestra cupos libres y cuántas personas llegan a esa hora. Queda amarilla si quedan menos de 5 cupos y roja si no queda ninguno. Mientras la página está abierta se vuelve a leer cada 20 segundos: hasta 200 reservas de ese día y los dos documentos de cupos.
- En Configuración, Zonas y cupos, «Personas por reserva» define cuántas personas puede pedir el cliente en salón y en terraza. Al guardar, `/reservas` usa ese número. La reserva nueva del panel no tiene ese tope y, si lo pasa, avisa que es una excepción de administración.
- El orden de Configuración es el de `/carta`. Una categoría sin productos ya no se corre al final. Arrastrar el punto, o subir y bajar, guarda ese orden.
- El aviso y el tooltip ya no se cargan en todas las páginas. Quedan en el muestrario `/ui`, que en producción no se publica. Las fuentes de la marca siguen igual.
- En `/reservas`, cualquier día y cualquier hora se piden con al menos 2 horas de anticipación. A las 18:00 todavía se puede pedir las 20:00. Al enviar, queda dicho que la solicitud sigue pendiente de confirmación del restaurante y que la mesa aún no está reservada.
- En la ficha de una reserva, «N solicitudes realizadas» sale de un conteo del mismo correo. La lista no lo consulta. Guardar una reserva ya no depende de `PIU_RESERVATION_GUEST_SECRET` ni escribe en `reservationGuests`.
- La actualización horaria del Excel ya no envía `If-Match` con el `version` de Drive. `reservationBackup` admite una sola instancia y una sola ejecución a la vez, y sigue copiando el archivo vigente antes de reemplazarlo.
- En `/admin/carta`, Mostrar y Ocultar quedan bloqueados hasta que la lista confirma el cambio. Si el producto estaba en Ocultos, el aviso dice que salió de esa lista y sigue en Todos.
- En `/admin/carta`, Agregar deja crear un producto o «Añadir nueva categoría». Borrar un producto o una categoría abre una ventana de confirmación. En Configuración, las categorías de la carta se reubican arrastrando el punto o con subir y bajar.
- En el pie, «Acceso empleados» queda con marco crema para distinguirlo del texto legal.
- Al cambiar de sección en el panel, la pantalla avisa que está cargando. La sesión se comprueba una vez por visita y los conteos de reservas se leen juntos. La revocación sigue vigente en la visita siguiente.
- En la ficha de una reserva, la mesa y la nota interna se editan tocando su casilla. Las acciones quedan en confirmar y reagendar. El seguimiento copia el enlace del cliente. Una reserva rechazada se puede confirmar o reagendar de nuevo.
- En `/admin/reservas`, Filtrar queda como un botón a la izquierda. Al pulsarlo, los campos entran deslizándose desde la derecha; en el celular quedan uno bajo otro.
- En `/admin/reservas`, Reagendar abre la reserva para elegir día, hora y zona. Al guardar queda pendiente de confirmación, sin confirmar la mesa, y se puede copiar o enviar al cliente el enlace de estado.
- En el celular, el panel de avisos queda dentro de la pantalla y el título de Reservas ya no se aprieta contra los botones. El interruptor de reservas activas y la campana usan el verde de cupos disponibles para que se distingan del oliva del panel.
- En el panel, un aviso nuevo se despliega bajo la campana y permanece unos 2 minutos, con un timbre. Mientras queden avisos sin abrir, la campana palpita. El sonido se puede apagar desde el panel de avisos.
- En `/admin/reservas`, el cierre de una fecha es el botón verde «Cerrar un día». El administrador elige la fecha y ese día deja de aceptar reservas en `/reservas`. «Abrir este día» lo vuelve a habilitar. Las reservas ya hechas no se cancelan.
- En `/admin/reservas`, pausar las reservas online es un interruptor. Al pausar se elige uno de los cuatro mensajes de Configuración; el texto no se edita en esa pantalla y los mensajes guardados no cambian. Al activarlas de nuevo no se pide un mensaje.
- Next.js y `eslint-config-next` pasan de 16.4.4 a 16.4.6, dentro de la misma línea, para corregir los avisos de seguridad de noviembre de 2026. App Hosting, Auth, reservas, catálogo y las APIs siguen con la misma configuración.
- La pestaña del navegador usa el logo PIÙ en vez del ícono de Next.
- Guardar un producto ya no reescribe su foto. La carta pública y las sugerencias del inicio leen el documento `catalog/public`, escrito en la misma operación. Si esa publicación falla, el panel no muestra el cambio como guardado. Cada instancia y el CDN pueden seguir con la página anterior hasta 5 minutos. El sitio publicado es https://piupizzas.cl.
- En `/admin/carta`, las categorías se crean, se ocultan y se eliminan. La primera visible es la que abre la carta pública.
- En `/carta`, un producto visible y agotado sigue en su categoría con la cinta «AGOTADO» y la foto atenuada. El nombre, la descripción y el precio se leen igual. Al marcarlo disponible vuelve a la presentación normal. Los ocultos siguen fuera de la carta.
- En `/admin/reservas` se pausan o reanudan las reservas online, con el mensaje de pausa, y se marca o se vuelve a abrir una fecha. Un día completo muestra en `/reservas` el aviso de reservas completas, adaptado a la fecha. Las reservas ya hechas no se cancelan.
- `/admin/reservas/disponibilidad` muestra la fecha, el resumen de cupos web y los horarios de salón y terraza con verde, amarillo o rojo según los cupos reales.
- Mesas sale del menú del panel. Pausar y completar una fecha queda en Reservas, consultar cupos en Disponibilidad y las reglas permanentes en Configuración. `/admin/mesas` redirige a Reservas.
- En el inicio, el botón «Ver carta» de Sugerencias del chef usa el verde oliva, igual que «Ver la carta» del hero.
- Confirmar una reserva no exige una mesa física. Si el sector no tiene mesas individuales, queda registrada en ese sector. Un cupo, un horario o una mesa en conflicto avisan y solo siguen con una excepción y un motivo; eso queda en la auditoría, sin cambiar los cupos configurados.
- Los avisos de reserva próxima y de solicitud pendiente los puede escribir `POST /api/admin/reservations/sweep`, pensado para Cloud Scheduler cada 10 minutos. Sin el secreto `PIU_NOTICES_CRON_SECRET` ese endpoint no responde. El panel sigue consultando cada 25 segundos.

### Corregido

- Las fotos de la carta ya no «aparecen de la nada». El marco de `ProductImage` era del mismo color que la página, así que mientras la foto viajaba se veía un hueco vacío. Ahora muestra un bloque suave del color de la marca con un brillo que pasa despacio, y la foto aparece con un fundido (opacidad y un leve desenfoque que se despeja). Una foto que ya estaba lista, por ejemplo desde la caché, no parpadea; sin JavaScript se ve normal; con «reducir movimiento» no hay animación. Las seis primeras filas de cada lista cargan de inmediato (`eager`) en vez de esperar a estar cerca de la pantalla. Estilos en `.photo-frame` y `img[data-photo]` (`globals.css`).
- Las versiones chicas de las fotos de la carta (`prepareProductVariants`) miden por el **lado corto** (360 y 900 px) en vez de por el ancho. Con una foto horizontal, la miniatura de 360 px de ancho quedaba de ~200 px de alto y, recortada a cuadrado en la fila de la carta, se veía estirada en pantallas 3×. Con las fotos verticales de la carta actual no cambia nada: 360×480 y 900×1200. Se comprobó con las fotos reales de producción que la miniatura y la versión de 900 px no se distinguen de la original al tamaño en que se muestran.
- En `/admin/reservas`, una reserva anotada por el personal ya no exige las 2 horas de anticipación. Esa regla sigue solo en `/reservas`. El horario de apertura y los cupos no cambian.
- Confirmar una reserva ya no pide un motivo porque el grupo sea más grande que una mesa. Cada reserva ocupa un cupo del sector, sea de 2 o de más personas. En `/reservas` el texto habla de la reserva y de las personas.
- Arrastrar una categoría en Configuración vuelve a pasar el chequeo del repositorio.
- Finalizar o cancelar una reserva suelta su cupo aunque el mismo horario tenga otras reservas. Antes el cupo de esa reserva podía quedar tomado.
- El muestrario `/ui` vuelve a abrir. El formulario de código queda dentro del ejemplo de seguimiento, que sí puede recibir la acción.
- Las fotos de producto se guardan hasta en 1600 px y calidad 72, con un tope de 400 KB. En el celular y en el computador la ficha usa esa misma nitidez.
- Al abrir un producto de la carta, la foto queda cuadrada, como en la lista, y la pizza no se recorta.
- Crear una categoría con un nombre que ya existe no reemplaza la anterior. Subir o bajar dos categorías se guarda en una sola operación.
- Una recarga forzada de `/carta` ya no depende de que el servidor esté despierto. El CDN puede entregar la página anterior mientras revalida, hasta un día. La copia fresca sigue durando 5 minutos.
- La consulta por código navega dentro del sitio. Al abrir reagendar, el formulario vuelve a tomar el día, la hora y la zona de esa reserva.

### Agregado

- Un `superadmin` aprueba o rechaza cuentas pendientes en `/admin/personal`, asigna `admin` o `superadmin`, cambia el rol, suspende, reactiva o revoca el acceso. El servidor actualiza el claim y revoca la sesión anterior. No se puede quitar al último propietario, y un `admin` no puede hacerlo.
- Un `superadmin` puede crear, copiar y revocar invitaciones de personal en `/admin/personal`. El enlace es de un solo uso, vence a las 48 horas y el secreto solo se guarda como hash. `/admin/unirse` crea la cuenta con el rol de la invitación y abre el panel al volver a entrar. Una solicitud que ya estaba pendiente sigue sin entrar hasta que el propietario la apruebe.
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

- En el panel, «Mi cuenta» abre un sheet corto en el celular y un menú junto al avatar en el escritorio: iniciales, nombre si existe, correo, rol, cierre de sesión y el sitio. El pie público suma «Acceso empleados», que lleva al ingreso. Quien ya tiene sesión entra al panel; una cuenta sin rol sigue sin acceso.
- Desde 1024 px el panel usa sidebar verde con Disponibilidad, fondo crema y composición de escritorio: métricas en fila, reservas en dos columnas, cupos en tabla, mesas en tres tarjetas, carta en tabla y configuración en dos columnas. El celular y la tablet siguen con la barra inferior.
- En el celular, Reservas, Disponibilidad, Mesas, Carta y Configuración usan las mismas tarjetas crema del inicio. El detalle de una reserva ocupa la pantalla. La disponibilidad lista cupos web libres por franja. Mesas muestra recepción, día completo y cupos. La carta cabe sin scroll horizontal. Configuración abre una sección a la vez y, al guardar, envía el resto tal como está.
- La referencia visible de una solicitud pasa a `PIU-` y cuatro números, por ejemplo `PIU-2021`. Si ese número ya existe, se elige otro. El enlace privado de seguimiento no cambia y la referencia corta no abre `/reservas/estado`.
- La confirmación de una solicitud queda en una tarjeta compacta: confeti breve en oliva y terracota, ícono animado, «¡Solicitud recibida!», la referencia con botón para copiarla, fecha, hora, personas y zona con íconos, y los botones «Ver estado de mi reserva» y «Copiar enlace». Ya no muestra la URL completa.
- `/reservas/estado` abre la reserva directamente desde el enlace, con el estado destacado, una línea de avance (Recibida, Confirmada, En PIÙ) y acciones según el estado: cómo llegar, WhatsApp o una nueva solicitud. Sin enlace, pide pegarlo en un solo campo. Las animaciones se apagan si el sistema pide menos movimiento.
- Nuevo diseño de `/reservas/estado`: cabecera teñida según el estado con ícono grande, stepper con color propio por paso (Recibida en ámbar, Confirmada en verde, En PIÙ en verde fuerte con check), referencia en un bloque oliva, fecha destacada y hora, personas y zona en tiles. «Ver la carta» pasa a ser el botón principal mientras la solicitud está pendiente o ya estás en PIÙ.
- Nuevo diseño de `/admin/reservas`: métricas en tiles con ícono y la vista activa marcada, búsqueda arriba y fecha, estado y zona en un desplegable, cards compactas con hora, fecha corta y badge de estado con color, y ficha separada en visita, contacto (botón «Llamar»), observaciones, mesa, acciones, seguimiento e historial en línea de tiempo. En el celular la ficha aparece arriba de la lista con «Volver a la lista». Confirmar es el botón principal; rechazar y cancelar quedan como secundarios y piden un segundo toque, con opción «Volver». La lógica, las rutas y las acciones no cambian.
- Colores de estado de reserva (ámbar, verde, verde fuerte y rojo suave) documentados en `DESIGN.md` como única excepción a la paleta crema y oliva.
- En el celular, el panel abre con header verde «PIÙ Admin», lámina crema y barra inferior. El inicio se llama Dashboard: cuatro conteos reales, próximas confirmadas, alertas del día, gráfico de cupos web y tres accesos. La fecha de hoy se muestra, sin un selector que no filtra. El escritorio conserva la sidebar.
- El panel queda como herramienta de servicio: header verde y barra inferior en el celular, sidebar en escritorio. Inicio usa los conteos reales, las próximas confirmadas y los cupos web del día, sin porcentajes inventados. `/admin/reservas` muestra filtros a la vista y acciones rápidas solo si el estado las permite. `/admin/reservas/disponibilidad` muestra cupos web por franja y sector. Semana, duración, cupos y mensajes se editan en Configuración; la pausa y el día completo siguen en Mesas. La carta lista productos en filas y separa agotado de oculto.

### Corregido

- Guardar horarios, reglas, zonas, mensajes o la pausa de recepción ya no reemplaza el resto de la configuración. Si otra sesión cambió otra sección, ese cambio se conserva.
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

- El CSP en modo reporte permite el beacon de Cloudflare Web Analytics (`static.cloudflareinsights.com` en `script-src` y `cloudflareinsights.com` en `connect-src`). Lo detectó la revisión en producción como un aviso de CSP; no bloqueaba nada, pero con la política en bloqueo habría roto esa analítica.
- Cada pedido del panel vuelve a leer la cuenta en Authentication. Una cookie del mismo segundo no conserva un rol ya reducido, ni el acceso de una cuenta suspendida o revocada. Aprobar exige correo verificado y, si el rol es propietario, confirmación. Una ficha pendiente con un claim distinto se puede aprobar o rechazar sin duplicar el permiso. El último propietario no se puede quedar sin acceso, y el que todavía no tiene ficha `staff` sigue entrando.
- Una invitación no cambia la contraseña de un correo que ya existe. Esa persona entra con su clave actual y el servidor vincula la ficha solo si el token corresponde a ese correo.
- `invitations` e `invitationRate` quedan negadas al navegador, igual que `staff`. Crear la cuenta no escribe el claim `role`. Aprobar a alguien sigue siendo un paso aparte.
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

### Seguridad

- El rol de una cuenta nueva sale solo de la invitación guardada por el propietario. El formulario de registro no puede pedirlo. Si no se puede escribir el permiso, la invitación vuelve a quedar abierta.

### Agregado

- SEO: `robots.txt` (bloquea `/admin`, `/api/` y `/reservas/estado`, e indica el sitemap) y `sitemap.xml` con las cuatro páginas públicas. Cada página pública tiene URL canónica y `og:url`, y comparten una imagen de 1200×630 (`opengraph-image.jpg` y `twitter-image.jpg`, 168 KB, recorte de la portada con el logo) para WhatsApp, Instagram y Google. El layout define `metadataBase` con `https://piupizzas.cl`. El inicio incluye datos estructurados `Restaurant` (nombre, dirección, teléfono, horario, carta, reservas y redes). El horario sale de la misma lectura cacheada del pie de página (`getPublicWeek` en `public-hours.ts`), así que sigue lo que se configura en el panel y no suma lecturas. El título del inicio pasa a «Pizzería en Maipú · PIÙ Pizza & Dolce» y su descripción incluye la dirección.

### Corregido

- La pestaña del navegador mostraba el logo de Next.js: `src/app/favicon.ico` seguía siendo el archivo que deja `create-next-app` y Chrome lo elige antes que `icon.png`. Ahora es el logo de PIÙ, con las imágenes de 16, 32 y 48 px (5 KB). Los navegadores guardan los favicon en caché, así que puede tardar en verse o requerir recargar sin caché.
- `/reservas` ya no muestra por un instante «Las reservas en línea aún no están disponibles» mientras carga el formulario, aunque las reservas estén activas. El espacio de carga tiene la altura del formulario, así que el pie de página ya no salta (CLS de 0,19 a 0).
- Rendimiento: en producción `/_next/image` responde 404 y cada `next/image` entrega el archivo original, así que `logopiu.png` (1,1 MB, mostrado a 52 px y elemento LCP del inicio con 15 s), `instagram.png` (293 KB) y `not_image.png` (1,1 MB) se reemplazan con el mismo nombre por versiones de 512, 128 y 640 px, de 57, 6 y 113 KB. Se ven igual. Los archivos fijos de `public/` y `/logos/` pasan de 4 horas a 7 días de caché (`next.config.ts`). El logo queda en 512 px (57 KB) para que el correo, que lo muestra a 168 px, se vea nítido en pantallas 3×.
- Rendimiento del inicio: la foto principal del móvil (`cocina-piu-mobile.webp`, el LCP real) pasa de 941 px y 285 KB a 828 px y 174 KB. El mapa de Google (`MapEmbed`, ahora componente de cliente) crea su iframe solo cuando está a menos de 300 px de la pantalla, en vez de descargar ~500 KB de scripts mientras carga la foto principal. El logo del encabezado se carga con prioridad en vez de `lazy`. Con throttling real de Lighthouse en una versión local equivalente a producción: LCP del inicio de 6,8 s a 4,3 s y peso de 1,74 MB a 1,16 MB. El LCP de 10,0 s medido en producción antes de los cambios debe repetirse después del despliegue.
- Las fotos de la carta se guardan en tres tamaños: la principal (hasta 1600 px) y dos versiones, `-900.webp` y `-360.webp`, cuyas URLs van en el campo opcional `imageVariants` del producto y de la carta pública. Sin el optimizador de imágenes, la miniatura de 96 px de cada fila de la carta descargaba la foto de hasta 400 KB. Ahora `ProductImage` elige 360 px, 900 px o la principal con `srcset`, y si una versión no carga cae sola a la principal. Si las versiones no se pueden generar, la foto se publica igual. Editar nombre o precio y reimportar el catálogo conservan `imageVariants`; cambiar la foto borra los tres archivos anteriores. Los productos que ya tienen foto la siguen mostrando como hasta ahora hasta correr `pnpm backfill:photos`, un script con simulación previa que genera las versiones sin cambiar ninguna foto ni su dirección (contra producción exige `PIU_BACKFILL_PRODUCTION=on`). Ver `docs/arquitectura/catalogo.md`.
- Las fotos grandes de `/` y `/nosotros` (terraza, interior, cocina) tienen una versión de 1200 px, 35–40 % más liviana y sin diferencia visible, que el navegador elige en celulares y pantallas normales (`ResponsivePhoto`); las pantallas de alta densidad siguen recibiendo la de 1600 px.
- Seis imágenes sin uso de `src/assets/home/` (~1 MB) pasan a `docs/imagenes-origen/sin-uso/`.
- `next.config.ts` declara `images.unoptimized: true`, que es lo que ya ocurría en producción: el adaptador de App Hosting lo fuerza en cada build y `/_next/image` responde 404, así que ninguna imagen se redimensiona ni se convierte a AVIF al vuelo. Local y producción ahora se comportan igual. Las reglas `images-media.md` y `AGENTS.md` se corrigen: las imágenes deben llegar livianas desde el origen. No se activó el optimizador a propósito: correría sharp en Cloud Run, y Cloudflare no guarda en caché `/_next/image`, lo que sumaría CPU y salida de datos.
- Cuatro PNG sin uso (`home.piupizza.png`, `PiuComida.png`, `PiuComidaMobil.png`, `load_image.png`, 8,3 MB) pasan de `public/` a `docs/imagenes-origen/`: ya no se publican con el sitio ni se pueden descargar desde él. Ninguna página ni correo los usa.

### Seguridad

- Encabezados de seguridad: se aplican `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'` y `form-action 'self'`, más `Strict-Transport-Security` (1 año, sin `includeSubDomains`). La política completa (`script-src`, `img-src`, `connect-src`, `frame-src`…) queda en `Content-Security-Policy-Report-Only`: solo avisa en la consola del navegador y no bloquea nada. Se pasa a bloqueo después de revisar producción sin violaciones, porque Cloudflare inyecta su propio script. Está en `next.config.ts`.
- El tope de solicitudes (reservas, seguimiento e invitaciones) usa `CF-Connecting-IP` cuando la conexión viene de un rango de Cloudflare. Antes tomaba la última IP de `X-Forwarded-For`, que detrás de Cloudflare es la del borde y no la del visitante. Si la conexión no viene de Cloudflare, el encabezado se ignora y se usa la IP de la plataforma como antes.
- La subida de fotos de la carta rechaza con 413 los cuerpos de más de 8 MB antes de leerlos, y sharp rechaza imágenes de más de 64 millones de píxeles. Evita que un archivo chico que se descomprime a cientos de MB tumbe la instancia de 512 MB.
- Dependencias: `firebase` 13.4.0 y `firebase-admin` 14.5.1. En `pnpm-workspace.yaml` se fuerzan `@grpc/grpc-js` ^1.14.7 y `fast-xml-parser` ^5.11.3, dentro del mismo major. `pnpm audit` baja de 7 avisos (1 alto) a 4 (ninguno alto). Quedan `uuid`, `glob` y `minimatch` de dependencias de `exceljs`, `firebase-admin` y `shadcn`, sin ruta de ataque en este sitio y sin parche del mismo major.

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
