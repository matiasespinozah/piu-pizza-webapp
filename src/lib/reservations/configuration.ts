import type { ReservationZone } from "@/lib/reservations/types"

/**
 * Datos de operación que el restaurante ya contó, más lo que sigue pendiente.
 * Nada de lo marcado como pendiente se aplica como regla del formulario.
 */
const reservationConfig = {
  timeZone: "America/Santiago",
  /** Paso de los horarios de preferencia. No es un cupo ni un tiempo de permanencia. */
  slotMinutes: 30,
  notesMaxLength: 280,
  /** Mínimo de personas por reserva. El máximo depende de la zona. */
  partySize: { min: 1 },
  /**
   * Anticipación aún sin definir.
   * Lun–jue: se habló de 1 o 2 horas. Vie–sáb: el día anterior, sin hora límite.
   * Mientras los valores sean null, el formulario no las exige.
   */
  anticipation: {
    weekdayLeadHours: null as number | null,
    weekendPreviousDayCutoff: null as string | null,
  },
  zones: [
    {
      id: "salon" as const,
      label: "Salón",
      description: "Ambiente interior.",
      /** Personas que se pueden reservar juntas en esta zona. */
      maxPartySize: 15,
      /** Mesas declaradas. No son las mesas que se pueden reservar. */
      declaredTables: 19,
    },
    {
      id: "terrace" as const,
      label: "Terraza",
      description: "Espacio al aire libre.",
      maxPartySize: 20,
      declaredTables: 15,
      /**
       * La terraza incluye dos sectores de fumadores.
       * Aún no se ofrece como opción: falta definir cómo se pide.
       */
      smokerSections: 2,
    },
  ],
} as const

const reservationWhatsappMessage = "Hola, quiero reservar una mesa en PIÙ."

/**
 * Datos que el propietario todavía no confirma. Null significa que la operación
 * que depende de ese dato permanece bloqueada. No reemplazar por un número supuesto.
 */
const pendingOwnerDecisions = {
  seatsPerTable: null,
  combinableTables: null,
  reservableCapacityPerZone: null,
  walkInTables: null,
  serviceMinutes: null,
  lastSeatingTime: null,
  exactWeekdayLeadHours: null,
  weekendCutoff: null,
  lateArrivalPolicy: null,
  privacyPolicyPublished: null,
  retentionPolicy: null,
} as const

type ZoneConfig = (typeof reservationConfig.zones)[number]

function zoneConfig(id: ReservationZone): ZoneConfig {
  const zone = reservationConfig.zones.find((item) => item.id === id)
  if (!zone) throw new Error(`Zona desconocida: ${id}`)
  return zone
}

/** Tope de personas: el de la zona elegida, o el mayor si todavía no hay zona. */
function maxPartyFor(zone: ReservationZone | null) {
  if (zone) return zoneConfig(zone).maxPartySize
  return Math.max(...reservationConfig.zones.map((item) => item.maxPartySize))
}

export { maxPartyFor, pendingOwnerDecisions, reservationConfig, reservationWhatsappMessage, zoneConfig }
export type { ZoneConfig }
