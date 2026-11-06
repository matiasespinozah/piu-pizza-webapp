# Reservas — puente hacia el backend

La página `/reservas` solo recorre el formulario. No guarda solicitudes, no confirma mesas y no llama a Firebase.

## Qué existe hoy

- Configuración local en `src/lib/reservations/configuration.ts`.
- Horarios de atención en `src/lib/reservations/schedule.ts`, calculados en `America/Santiago`.
- Validación en el navegador (`validation.ts`). No reemplaza la validación del servidor.
- El botón «Enviar solicitud» permanece deshabilitado.
- «Reservar por WhatsApp» abre un mensaje genérico. No adjunta los datos del formulario.

## Cómo se conectará después

1. Una Server Action en `src/server/actions/` recibe el `ReservationRequest`, lo valida de nuevo con la misma lógica y verifica que la fecha siga siendo válida en Chile.
2. El DAL en `src/server/dal/reservations.ts` escribe la solicitud en Firestore con estado `pending`. La comprobación de cupo y las reservas simultáneas ocurren ahí, no en el navegador.
3. El personal confirma, rechaza o propone otro horario. Esos estados ya están nombrados en `ReservationStatus`.
4. La consulta del cliente no puede depender de un RUT ni de un código corto adivinable. Hará falta un enlace o identificador que no exponga el teléfono ni el nombre a cualquiera que lo pruebe.

El formulario ya aplica el tope de personas: 15 en salón y 20 en terraza. Anticipación, último ingreso y sectores de fumadores siguen en la configuración sin aplicarse.
