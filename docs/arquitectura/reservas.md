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

La respuesta pública trae la referencia `PIU-…`, la fecha, la hora, las personas y la zona. No trae el celular. Esa referencia no abre la solicitud: la consulta del cliente queda para el hito siguiente, con un token que todavía no se entrega.

## Panel

`/admin/reservas` lista de a 20, con filtro por fecha, estado, zona, pendientes, hoy, próximas y atención. El celular y las observaciones están en el detalle. Cada cambio pide la revisión que el servidor guardó; si otro trabajador ya la cambió, la operación responde 409.

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
