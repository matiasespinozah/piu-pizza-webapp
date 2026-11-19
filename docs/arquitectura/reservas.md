# Reservas

La página `/reservas` pide una mesa. Guardar la solicitud y administrarla ocurre en el servidor. El visitante no elige mesa y el envío no la confirma.

## Qué está encendido

Nada en producción. Hacen falta las dos variables, y ninguna está en `apphosting.yaml`:

- `PIU_RESERVATIONS_WRITES=on`
- `PIU_FIREBASE_DATA=on` en el proyecto real, o `FIRESTORE_EMULATOR_HOST` en el emulador

Con el emulador, además, `GCLOUD_PROJECT` no puede ser `piu-pizza-cl`. Las pruebas usan `demo-piu-pizza`.

Si falta el permiso, `POST /api/reservations` responde 503 y el formulario no dice que la solicitud fue recibida. El enlace de WhatsApp sigue en el último paso.

## Solicitud pública

`POST /api/reservations` acepta fecha, hora, personas, zona, nombre, celular, observaciones y una clave de idempotencia. Rechaza `status`, mesas y cualquier otro campo.

El documento queda en `reservations/{clave}` con estado `pending`. La misma clave y los mismos datos devuelven la misma solicitud. La misma clave con otros datos responde 409 y no pisa el original. Otra clave, aunque sea la misma persona, es otra solicitud.

Un contador en `reservationRate` limita 8 solicitudes por hora y por origen, sin guardar la dirección. El tope vive en Firestore, así que vale con varias instancias.

La respuesta pública trae la referencia visible `PIU-` y cuatro números, por ejemplo `PIU-2021`, además de la fecha, la hora, las personas y la zona. No trae el celular. Si ese número ya existe, se prueba otro dentro de la misma operación. Esa referencia no abre la solicitud: el seguimiento sigue usando el enlace con secreto.

Si la respuesta del alta se pierde, el mismo navegador puede reintentar con la misma clave y los mismos datos. El servidor devuelve el mismo enlace, porque lo puede descifrar con esa clave. Quien solo tiene la referencia `PIU-…` no lo recupera. Si la persona cerró la página y no guardó el enlace, el equipo lo genera de nuevo desde el panel. El anterior deja de servir.

## Seguimiento

`/reservas/estado` no pide cuenta. El secreto viaja en el fragmento (`#`) del enlace, no en la query. La página lo lee en el navegador y lo manda con `POST /api/reservations/status`. Esa respuesta lleva `Cache-Control: private, no-store` y la página no se indexa.

En Firestore solo se guarda el hash del secreto, como id de `reservationAccess/{hash}`, más un cifrado para el reintento del alta. El documento de la reserva no tiene el secreto. La consulta es un `get` por ese id: no recorre la colección y no pide un índice compuesto nuevo. No se publicaron índices ni reglas en este paso.

El cliente ve la referencia, el estado, la fecha, la hora, las personas, la zona y, si hay un cambio propuesto, la propuesta. No ve nombre, celular, observaciones, mesas, trabajadores ni el motivo interno. No puede aceptar el cambio ni modificar la reserva.

El enlace vale el día de la visita y los dos días siguientes (`trackingLinkGraceDays`). Eso no define cuánto tiempo se guardan el nombre y el celular: la conservación sigue pendiente. El personal puede revocar el enlace o emitir otro.

La consulta usa `PIU_RESERVATION_STATUS=on` y, además, el emulador o `PIU_FIREBASE_DATA=on`. No enciende `PIU_RESERVATIONS_WRITES`. En el sitio publicado las dos siguen apagadas. Si la lectura está apagada, la página explica que el seguimiento no está disponible. Un secreto inválido, vencido o revocado responde igual, para no decir si la reserva existe.

Hay un tope aparte del de las solicitudes: 30 consultas por hora para un mismo enlace, y 40 intentos fallidos por hora para la dirección que la plataforma agrega al final de `X-Forwarded-For`. Un enlace válido no gasta el cupo de los demás. La dirección no se guarda.

## Panel

`/admin/reservas` abre en Hoy: la fecha civil de Chile, todos los estados, de la hora más temprana a la más tarde. El id del documento desempata. Futuras toma las fechas posteriores a hoy, en ese mismo orden. Pasadas recorre un mes: el mes actual hasta ayer, y cualquier mes anterior completo, de la visita más nueva a la más antigua. No se puede avanzar a un mes que todavía no llega. Cada lista pide 20 documentos y el cursor sigue ese orden; cambia la vista, el mes o el filtro y el cursor vuelve a empezar.

«Todas las reservas» abre `/admin/reservas/historial`. No está en el menú. La página exige `requireSection("reservas")`, igual que el resto de reservas, y además no se indexa. El orden es fecha, hora e id, de la más nueva a la más antigua.

Los cuatro recuadros siguen siendo conteos de toda la colección, no de las 20 filas visibles. Pendientes cuenta y lista solicitudes pendientes de cualquier fecha, de a 20. Confirmadas hoy abre solo las confirmadas de esa fecha.

Esas vistas ordenadas por `date` y `preferredTime` usan dos índices compuestos en `firestore.indexes.json`: uno ascendente y otro descendente, con `__name__` al final. No están publicados. Un documento antiguo sin `preferredTime` queda fuera de Hoy, Futuras, Pasadas e Historial, porque `orderBy` no lo devuelve. No se migró ninguno. Pendientes no usa ese orden y sí puede mostrarlo.

El correo de una reserva nueva se guarda en `customerEmail`, en minúsculas. El formulario público lo exige. La reserva manual puede omitirlo: si no hay correo, no se inventa uno y no hay contador. Las reservas anteriores, sin ese campo, siguen en las listas.

El contador vive en `reservationGuests/{hmac}`. El id es HMAC-SHA256 del correo normalizado con `PIU_RESERVATION_GUEST_SECRET`, una clave de al menos 32 caracteres que solo existe en Secret Manager. No va en el repositorio, ni en `apphosting.yaml`, ni en el navegador. El documento guarda `requestCount` y `updatedAt`, no el correo. El alta y el incremento ocurren en la misma transacción. Un reintento con la misma clave de idempotencia no suma otra vez. Cancelar, rechazar o reagendar no resta. El correo no se puede corregir desde el panel; si más adelante se permite, hay que mover el conteo en una sola transacción, sin dejarlo bajo cero, y anotar quién lo cambió.

La lista lee esos contadores de una sola vez, solo para los correos distintos de la página. El seguimiento público no recibe el correo. Las reglas niegan lectura y escritura de `reservationGuests` al navegador.

## Promociones

En el último paso de `/reservas` la casilla nace marcada. El texto, versión `v1`, es: «Acepto recibir información, novedades y promociones de PIÙ Pizza & Dolce por correo electrónico.» Quien no la quiera la desmarca. La reserva se envía de todas formas. No autoriza WhatsApp ni SMS, ni los avisos de la mesa.

Si llega marcada, la misma reserva guarda `marketingConsent: true`, `marketingConsentAt` con la hora del servidor, `marketingConsentSource: "web_reservation"` y `marketingConsentVersion: "v1"`. El correo sigue siendo `customerEmail`. No hay otra colección de contactos. Si llega desmarcada, esos campos no se escriben: esa reserva no autoriza promociones y no borra una aceptación de una reserva anterior. Un reintento con la misma clave y la misma casilla no vuelve a escribir. Si la casilla cambia, la clave responde 409. Una petición sin el campo no cuenta como aceptación. La reserva manual tampoco.

El formato del correo se valida. No se afirma que el buzón exista. No se envía ningún correo ni hay enlace de confirmación o de baja. `marketingSubscribers` y `marketingTokens` quedan cerrados en las reglas por si el emulador tiene documentos del diseño anterior. Este código no los lee ni los convierte en aceptaciones.

Esto no es el consentimiento de Analytics y el correo no sale al seguimiento público. Antes de una campaña real faltan la información de privacidad, la revisión legal de PIÙ y la forma de gestionar bajas y demás derechos. La Ley 19.496, artículo 28 B, y la Ley 21.719, vigente el 1 de diciembre de 2026, quedan como referencia para esa revisión. El código no declara que esas normas estén cumplidas. Una casilla que nace marcada es una decisión de este formulario y tiene que pasar por esa revisión antes de usarse para publicidad.

El celular y las observaciones están en el detalle. Cada cambio pide la revisión que el servidor guardó; si otro trabajador ya la cambió, la operación responde 409.

Confirmar, rechazar, proponer otro horario, cancelar, marcar llegada y finalizar pasan por `PATCH /api/admin/reservations/[id]`. Ese PATCH exige la cookie `piu_session` y el mismo encabezado del ingreso. El historial queda en `reservations/{id}/events` dentro de la misma transacción. El personal no puede editarlo.

## Cupo

Una solicitud pendiente no aparta mesa. La mesa se escribe en `reservationHolds/{fecha}_{zona}` solo al confirmar, en la misma transacción que el estado.

Hoy no se confirma en producción: no hay puestos por mesa, ni duración, ni mesas que se puedan juntar, ni el cupo que se deja para quien llega sin reserva. Esos datos están en `pendingOwnerDecisions` y siguen en null. Una configuración de prueba (`fixture: true`) solo vale con el emulador. En el proyecto real hace falta `productionReady: true`, y ese valor no se carga desde aquí.

Mientras tanto, el personal puede recibir, rechazar, proponer y cancelar. Confirmar responde que falta la configuración y la solicitud sigue pendiente.

No se suman mesas para un grupo grande. Si ninguna mesa alcanza, la confirmación no se hace.

## Horario

`America/Santiago`. Lunes a jueves 17:00–22:00. Viernes y sábado 13:00–23:00. Domingo cerrado. Los horarios del formulario llegan hasta el intervalo anterior al cierre. La anticipación de 1 o 2 horas, y la del fin de semana, siguen sin una hora definida, así que el servidor no la inventa ni la exige.

## Qué no hace

No manda WhatsApp, correo ni SMS. «Llamar» abre el teléfono del trabajador. No dice que el cliente fue avisado. No hay pagos, Fudo ni consulta pública en `/reservas/estado`.
