# Correos de reserva

Dos correos operativos, apagados hasta que `piupizzas.cl` esté verificado en Resend. No son promociones: se envían aunque la casilla de marketing esté desmarcada. No se responde a `piupizzadolce@gmail.com`; el correo pide no contestarlo y ofrece el WhatsApp del restaurante (`whatsappHref` en `src/lib/site.ts`).

## Cuándo sale cada uno

| Correo | Cuándo | Asunto |
|---|---|---|
| Solicitud recibida | Después de guardar una reserva pública nueva, si tiene correo y sigue `pending` | `PIÙ Pizza & Dolce \| Recibimos tu solicitud de reserva` |
| Reserva confirmada | Después de que el personal confirma y el estado queda `confirmed` | `PIÙ Pizza & Dolce \| ¡Tu reserva está confirmada!` |

La reserva manual del panel no genera el primer correo. Si se confirma y tiene correo, sí genera el segundo. Una reserva que no llegó a guardarse no crea tarea. Sin correo, la tarea queda `skipped` y no llama a Resend.

Si la confirmación ocurre mientras el primer correo sigue en cola (`queued`), ese correo se marca `skipped` y solo sale el de confirmación. Si el primero ya se envió, salen los dos, en ese orden. Una reserva que sigue `pending` no recibe el correo de confirmación.

El fallo de Resend no revierte la reserva ni la confirmación. La tarea queda `failed` y se puede reintentar.

## Idempotencia

Cada reserva tiene como máximo un documento `reservationMail/{reservationId}_received` y otro `_confirmed`. Ese id es la clave `Idempotency-Key` de Resend. El reclamo a `sending` ocurre dentro de una transacción: si otro ejecutor ya tomó la tarea, el segundo no llama a Resend.

El lease dura 2 minutos. Si el proceso se corta y no quedó un id de Resend, se puede reintentar con la misma clave solo mientras no hayan pasado 24 horas desde el primer intento. Esa es la ventana en que Resend devuelve el mismo envío en vez de crear otro. Pasadas esas 24 horas, sin id de Resend, la tarea pasa a `requires_review` y no se reenvía sola. Conserva el id del documento, `firstAttemptAt`, los intentos y el motivo para reconciliarla después.

Un rechazo claro de Resend queda en `failed`, con espera de 5, 10 o 20 minutos, y se detiene a los 3 intentos. No se consumen intentos si `PIU_RESERVATION_EMAILS` no está en `on` o si falta `RESEND_API_KEY`.

La cola no guarda el cuerpo del mensaje ni copia el correo del destinatario. El destinatario se lee de la reserva al enviar. Antes de cada intento se vuelve a mirar el estado: una solicitud que ya no está pendiente no recibe el primer correo, y una reserva que ya no está confirmada no recibe el segundo.

## Seguimiento

El botón abre `https://piupizzas.cl/reservas/estado` con el secreto de seguimiento en el fragmento, el mismo enlace que ya usa el sitio. El código `PIU-` se muestra en el correo, pero no va en la URL: es corto y el seguimiento público también lo acepta, así que no hace falta repetirlo en el enlace. Si la reserva no tiene secreto vigente, el botón abre la página sin fragmento y el código queda escrito en el mensaje para ingresarlo.

La fecha se formatea con `America/Santiago`. La mesa solo aparece si la reserva tiene `tableLabel`.

## Envío

`PIU_RESERVATION_EMAILS` distinto de `on` deja la tarea en `queued` y no llama a Resend. Si el interruptor está en `on` pero falta `RESEND_API_KEY`, tampoco llama a Resend y no suma intentos. La reserva sigue en pie.

`PIU_RESERVATION_EMAILS_SINCE` es la fecha de activación, en ISO. Las tareas creadas antes quedan en `skipped` con motivo `before_activation`. No se borran. Sin esa fecha, el barrido no drena la cola: una reserva nueva igual puede enviar en el momento, porque su tarea nace ahora.

Remitente: `PIU_RESERVATION_EMAIL_FROM`, o `PIÙ Pizza & Dolce <reservas@piupizzas.cl>` si no se define. No hay `Reply-To`.

El camino normal envía al guardar la solicitud pública y al confirmar, en la misma petición. `reservationMailRecover` es una Cloud Function de segunda generación, distinta de `reservationBackup`, cada 5 minutos en `us-central1`, con una sola instancia. Revisa hasta 20 tareas `queued`, `failed` o `sending` vencidas. No está desplegada. Si el interruptor no está en `on`, si falta la clave o si falta la fecha de activación, sale sin escribir.

`POST /api/admin/reservations/mail` hace el mismo barrido. Responde 404 si `PIU_RESERVATION_MAIL_SECRET` falta, tiene menos de 16 caracteres o no coincide. `/correo` responde 404 cuando `NODE_ENV` es `production`.

## Activar en producción

1. En Resend, agregar el dominio `piupizzas.cl` y esperar a que indique los registros DNS.
2. En Cloudflare, crear exactamente esos registros, sin suponer de antemano si son TXT, MX o CNAME. El proxy queda en solo DNS. No inventar valores. Si Resend entrega un SPF y ya existe otro TXT de SPF, se fusionan en uno solo.
3. Esperar a que Resend marque el dominio como verificado. Los correos siguen apagados.
4. Crear una API key de Resend solo con permiso de envío.
5. Guardarla en Secret Manager como `RESEND_API_KEY`, en el backend de App Hosting y en la función `reservationMailRecover`. No va en Git ni en `NEXT_PUBLIC_`. `firebase apphosting:secrets:set RESEND_API_KEY` y el secreto de la función se crean solo cuando se autorice el despliegue.
6. Crear `PIU_RESERVATION_MAIL_SECRET` del mismo modo, con al menos 16 caracteres.
7. Elegir el instante de activación y anotarlo en `PIU_RESERVATION_EMAILS_SINCE`. Todo lo encolado antes de ese instante queda omitido, no borrado.
8. En `apphosting.yaml`, descomentar `RESEND_API_KEY`, `PIU_RESERVATION_EMAIL_FROM`, `PIU_RESERVATION_MAIL_SECRET`, `PIU_RESERVATION_EMAILS_SINCE` y, al final, `PIU_RESERVATION_EMAILS=on`.
9. Desplegar App Hosting y `reservationMailRecover` solo cuando se autorice. Hacer una reserva de prueba a un correo propio y confirmarla. Deben llegar los dos mensajes sin llamar al barrido. El botón abre el seguimiento y WhatsApp es el del restaurante.
10. Si algo falla, volver a dejar `PIU_RESERVATION_EMAILS` sin el valor `on`. Las tareas no se reenvían solas.

Cada tarea nueva es una escritura. El envío lee la reserva y, si hay seguimiento, el documento de acceso. El barrido lee como máximo 60 documentos por corrida.
