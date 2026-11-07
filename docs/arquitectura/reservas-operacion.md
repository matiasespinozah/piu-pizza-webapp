# Guía operativa de reservas

Para el equipo de PIÙ. El sistema puede guardar solicitudes, pero **en el sitio publicado la recepción sigue apagada**.

## Cómo llega una solicitud

1. La persona elige fecha, horario, cantidad, salón o terraza, y deja nombre, celular y, si quiere, una observación.
2. El servidor revisa el horario del local y los datos. No acepta un estado ni una mesa elegidos en el navegador.
3. Si la recepción está apagada, la página lo dice de inmediato y muestra el enlace a WhatsApp. No hace recorrer el formulario ni muestra un comprobante falso.
4. Si está encendida, guarda la solicitud como **pendiente** y muestra «¡Recibimos tu solicitud!». La mesa todavía no está confirmada.

Si la persona presiona dos veces, se guarda una sola vez.

## Qué significa cada estado

| Estado | Qué pasó |
|---|---|
| Pendiente | Llegó la solicitud. No hay mesa apartada. |
| Confirmada | Alguien del equipo la aprobó y el sistema pudo asignar una mesa. |
| Cambio propuesto | El equipo ofreció otra fecha u hora. La mesa anterior, si ya estaba confirmada, sigue ocupada hasta resolverlo. |
| Rechazada | No se aceptó. No vuelve a confirmarse. |
| Cancelada | Se anuló. Si tenía mesa, esa mesa queda libre. |
| Llegó | El cliente está en el local. |
| Finalizada | Terminó la atención y se libera la mesa. No se vuelve a editar como pendiente. |

El historial dice quién hizo cada cambio. No se puede borrar desde el panel.

## Cómo confirmar

Abre la solicitud en `/admin/reservas` y pulsa Confirmar. El sistema vuelve a pedir confirmación.

Hoy esa acción **no va a completar la reserva** en el restaurante real: faltan los puestos de cada mesa, cuánto dura una reserva, qué mesas se pueden juntar y cuántas se dejan para quien llega sin avisar. El panel lo dice. La solicitud sigue pendiente.

En el emulador de pruebas sí hay mesas marcadas como ensayo. Esas mesas no sirven para el local.

## Cómo rechazar

Rechazar cierra la solicitud. Puedes anotar un motivo corto. El sistema no le escribe al cliente.

## Cómo proponer otro horario

Indica fecha, hora y zona, y confirma la propuesta. Si la reserva ya tenía mesa, esa mesa no se libera al proponer el cambio. Solo se mueve si después se confirma el horario nuevo y hay lugar. Si el horario nuevo no entra, queda el anterior.

## Qué pasa al cancelar

La solicitud queda cancelada y, si tenía mesa, esa asignación se suelta en la misma operación. Una cancelada no se vuelve a confirmar: hay que crear otra solicitud.

## Capacidad

El cupo se toma al confirmar, no al recibir la solicitud. Dos personas no pueden confirmar a la vez la misma mesa: la segunda recibe un error y la solicitud no cambia.

No se confirma un grupo juntando mesas. Hasta que Felipe diga qué mesas se pueden unir, un grupo solo entra si cabe en una mesa.

## Si faltan las mesas

El panel muestra que falta la configuración. No inventa puestos ni marca la reserva como confirmada. Rechazar, proponer y cancelar sí se pueden usar cuando la recepción de datos está encendida.

## Probar con emuladores

No usar datos del restaurante.

```bash
corepack pnpm test:reservations
```

Eso levanta Firestore en el proyecto `demo-piu-pizza`, con mesas de ensayo. También siguen `pnpm test`, `pnpm test:auth` y `pnpm test:rules`.

## Activar y apagar

Para un ensayo local, en la terminal del emulador:

```bash
PIU_RESERVATIONS_WRITES=on
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
GCLOUD_PROJECT=demo-piu-pizza
```

Para el sitio publicado hacen falta, las dos, y una decisión explícita:

```bash
PIU_RESERVATIONS_WRITES=on
PIU_FIREBASE_DATA=on
```

No van en `apphosting.yaml` dentro del repositorio. Poner el código en `main` no las enciende.

Para apagarlas ante un problema, quita `PIU_RESERVATIONS_WRITES` o déjala en otro valor y reinicia el servicio. La página vuelve al aviso y a WhatsApp. Lo ya guardado no se borra, pero no entran solicitudes nuevas.

El tope es de 8 solicitudes por hora y por dirección pública, en un documento de Firestore, así que vale aunque haya varias instancias. Se usa la última dirección de `X-Forwarded-For`, que es la que agrega la plataforma. Una conexión compartida (el wifi del local o una red móvil) comparte ese cupo: ocho pedidos en una hora desde la misma salida a internet agotan el tope para el resto. No está pensado para encenderse así, sin revisar ese límite con Felipe.

## Antes de operar con clientes

Felipe tiene que confirmar, por escrito:

- Puestos de cada mesa.
- Qué mesas se pueden juntar.
- Cuántas mesas de salón y terraza se pueden reservar, aparte de las 19 y 15 declaradas.
- Cuántas quedan para quien llega sin reserva.
- Cuánto dura una reserva y cuál es el último horario de llegada.
- Si la anticipación de lunes a jueves es 1 o 2 horas, y a qué hora del día anterior cierra el viernes y el sábado.
- El máximo de un grupo, si no alcanza con el tope actual del formulario (15 en salón y 20 en terraza). Esos topes no son la capacidad del local.
- Qué se hace si la persona llega tarde o no llega.
- El texto de la política de privacidad y cuánto tiempo se guardan nombre y celular.

Con eso se carga `restaurantSettings/operations` con `productionReady: true`. Hasta entonces confirmar sigue bloqueado.

Los índices de `firestore.indexes.json` hay que publicarlos antes de usar los filtros en producción. No se publicaron en este paso.

Tampoco se avisa solo al cliente. El teléfono está en el detalle para llamar. Llamar no queda anotado como «cliente avisado».

## Checklist de producción

- [ ] Felipe confirmó mesas, duración, anticipación y la política de datos.
- [ ] `restaurantSettings/operations` tiene `productionReady: true` y ninguna mesa de ensayo.
- [ ] Los índices están publicados.
- [ ] Las reglas siguen negando `reservations`, `reservationHolds`, `reservationRate` y `events` al navegador.
- [ ] `PIU_RESERVATIONS_WRITES` y `PIU_FIREBASE_DATA` se encienden juntas, fuera del repositorio, y se probó el apagado.
- [ ] Un envío de prueba real se revisó en el panel y se eliminó o se anuló según lo que se acuerde.
- [ ] El formulario no dice «reserva confirmada».
