import { confirmedClock, defaultWeek, weekFromClock, type ReservationClock, type WeekSchedule } from "@/lib/reservations/schedule"

const declaredTables = { salon: 19, terrace: 15 } as const

/**
 * Grupos que sí se informaron. No alcanzan las 19 y 15 mesas declaradas:
 * faltan 8 en salón y 6 en terraza. Esas no se crean aquí.
 */
const informedGroups = {
  salon: { of4: 4, of3: 2, of2: 5 },
  terrace: { of4: 5, of2: 4 },
} as const

/** La mesa más grande que se detalló es de 4. Un grupo mayor no se confirma solo. */
const knownSingleTableSeats = 4

type SectorTables = {
  total: number
  /** Mesas que se pueden reservar en la web. El resto queda para quien llega sin reserva. */
  web: number
}

type SectorLayout = {
  salon: SectorTables
  terrace: SectorTables
}

const fullDayMessage =
  "¡Nuestras reservas para hoy están completas! 🍕 Pero puedes visitarnos igualmente: seguimos recibiendo clientes por orden de llegada, según disponibilidad de mesas."

type DiningTable = {
  id: string
  label: string
  zone: "salon" | "terrace"
  seats: number
  /** Null: la mesa no tiene un máximo distinto. En terraza, un grupo de 2 puede llegar a 3. */
  seatsMax: number | null
  blocked: boolean
  reservable: boolean
  combinable: boolean
  smoker: boolean
}

type CapMode = "unset" | "none" | "capped"

/** `unset` todavía no está elegido. `none` es un tope que el local decidió no usar. */
type ReservationCap = {
  mode: CapMode
  max: number | null
}

type PublicNotice = {
  enabled: boolean
  text: string
}

type PublicNotices = {
  full: PublicNotice
  paused: PublicNotice
  closedDay: PublicNotice
  venueClosed: PublicNotice
}

type OperationRules = {
  clock: ReservationClock
  serviceMinutes: number | null
  anticipation: {
    weekdayLeadHours: number | null
    weekendPreviousDayCutoff: string | null
  }
  /** 1: una mesa por reserva. 2 a 4: se pueden juntar solo las mesas marcadas. */
  maxCombinedTables: number
  /** Null: el local todavía no confirma cuántas mesas quedan para quien llega sin reserva. */
  walkInTables: number | null
  dailyLimit: ReservationCap
  /** Tope de reservas que empiezan en el mismo horario. No es la ocupación simultánea. */
  slotLimit: ReservationCap
  maxParty: { salon: number; terrace: number }
  /** Cupos del salón y la terraza. No son mesas con puestos inventados. */
  sectors: SectorLayout
  /** Horario de los siete días. Vive en Firestore hasta que el equipo lo cambie. */
  week: WeekSchedule
  receptionPaused: boolean
  productionReady: boolean
  /** Huella de la última configuración que un superadmin validó. */
  validatedFingerprint: string | null
  notices: PublicNotices
  tables: DiningTable[]
  updatedBy: string | null
  updatedAt: string | null
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

function defaultNotices(): PublicNotices {
  return {
    full: { enabled: true, text: fullDayMessage },
    paused: {
      enabled: true,
      text: "Por ahora pausamos las reservas en línea. Puedes visitarnos y te atendemos por orden de llegada, según las mesas disponibles.",
    },
    closedDay: {
      enabled: true,
      text: "Ese día no estamos tomando reservas en línea. Si el local está abierto, puedes visitarnos por orden de llegada.",
    },
    venueClosed: { enabled: true, text: "Ese día el local está cerrado." },
  }
}

function defaultOperationRules(): OperationRules {
  return {
    clock: {
      weekday: { ...confirmedClock.weekday },
      weekend: { ...confirmedClock.weekend },
      lastSeatingTime: null,
    },
    serviceMinutes: 90,
    anticipation: { weekdayLeadHours: null, weekendPreviousDayCutoff: null },
    maxCombinedTables: 1,
    walkInTables: null,
    dailyLimit: { mode: "unset", max: null },
    slotLimit: { mode: "unset", max: null },
    maxParty: { salon: 15, terrace: 20 },
    sectors: {
      salon: { total: declaredTables.salon, web: declaredTables.salon },
      terrace: { total: declaredTables.terrace, web: declaredTables.terrace },
    },
    week: defaultWeek(),
    receptionPaused: false,
    productionReady: false,
    validatedFingerprint: null,
    notices: defaultNotices(),
    tables: [],
    updatedBy: null,
    updatedAt: null,
  }
}

function isZone(value: unknown): value is DiningTable["zone"] {
  return value === "salon" || value === "terrace"
}

function readTable(value: unknown): DiningTable | null {
  if (!value || typeof value !== "object") return null
  const table = value as Record<string, unknown>
  if (typeof table.id !== "string" || table.id.length < 1 || table.id.length > 40) return null
  if (typeof table.label !== "string" || table.label.trim().length < 1 || table.label.trim().length > 40) return null
  if (!isZone(table.zone)) return null
  if (typeof table.seats !== "number" || !Number.isInteger(table.seats) || table.seats < 1 || table.seats > 30) return null
  const seatsMax = table.seatsMax === null || table.seatsMax === undefined ? null : table.seatsMax
  if (seatsMax !== null && (typeof seatsMax !== "number" || !Number.isInteger(seatsMax) || seatsMax < table.seats || seatsMax > 30)) {
    return null
  }
  if (typeof table.blocked !== "boolean") return null
  if (typeof table.reservable !== "boolean") return null
  if (typeof table.combinable !== "boolean") return null
  if (typeof table.smoker !== "boolean") return null
  return {
    id: table.id,
    label: table.label.trim(),
    zone: table.zone,
    seats: table.seats,
    seatsMax,
    blocked: table.blocked,
    reservable: table.reservable,
    combinable: table.combinable,
    smoker: table.smoker,
  }
}

function readClock(value: unknown): ReservationClock | null {
  if (!value || typeof value !== "object") return null
  const clock = value as Record<string, unknown>
  const windowOf = (item: unknown) => {
    if (!item || typeof item !== "object") return null
    const window = item as Record<string, unknown>
    if (typeof window.opensAt !== "string" || typeof window.closesAt !== "string") return null
    if (!HHMM.test(window.opensAt) || !HHMM.test(window.closesAt) || window.opensAt >= window.closesAt) return null
    return { opensAt: window.opensAt, closesAt: window.closesAt }
  }
  const weekday = windowOf(clock.weekday)
  const weekend = windowOf(clock.weekend)
  if (!weekday || !weekend) return null
  const last = clock.lastSeatingTime
  if (last !== null && last !== undefined && (typeof last !== "string" || !HHMM.test(last))) return null
  return { weekday, weekend, lastSeatingTime: typeof last === "string" ? last : null }
}

function readCap(value: unknown, ceiling: number): ReservationCap | null {
  if (value === undefined || value === null) return { mode: "unset", max: null }
  if (!value || typeof value !== "object") return null
  const cap = value as Record<string, unknown>
  if (cap.mode === "unset" || cap.mode === "none") return { mode: cap.mode, max: null }
  if (cap.mode !== "capped") return null
  if (typeof cap.max !== "number" || !Number.isInteger(cap.max) || cap.max < 1 || cap.max > ceiling) return null
  return { mode: "capped", max: cap.max }
}

function readNotice(value: unknown, fallback: PublicNotice): PublicNotice | null {
  if (value === undefined || value === null) return fallback
  if (!value || typeof value !== "object") return null
  const notice = value as Record<string, unknown>
  if (typeof notice.enabled !== "boolean" || typeof notice.text !== "string") return null
  const text = notice.text.trim()
  if (text.length > 400) return null
  if (notice.enabled && text.length < 8) return null
  return { enabled: notice.enabled, text }
}

function readSectorSide(value: unknown): SectorTables | null {
  if (!value || typeof value !== "object") return null
  const side = value as Record<string, unknown>
  if (typeof side.total !== "number" || !Number.isInteger(side.total) || side.total < 0 || side.total > 40) return null
  if (typeof side.web !== "number" || !Number.isInteger(side.web) || side.web < 0 || side.web > side.total) return null
  return { total: side.total, web: side.web }
}

function sectorsFromTables(tables: DiningTable[]): SectorLayout {
  if (tables.length === 0) {
    return {
      salon: { total: declaredTables.salon, web: declaredTables.salon },
      terrace: { total: declaredTables.terrace, web: declaredTables.terrace },
    }
  }
  const side = (zone: DiningTable["zone"]): SectorTables => {
    const inZone = tables.filter((table) => table.zone === zone)
    return { total: inZone.length, web: inZone.filter((table) => !table.blocked && table.reservable).length }
  }
  return { salon: side("salon"), terrace: side("terrace") }
}

function readSectors(value: unknown, tables: DiningTable[]): SectorLayout | null {
  if (value === undefined || value === null) return sectorsFromTables(tables)
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const salon = readSectorSide(record.salon)
  const terrace = readSectorSide(record.terrace)
  if (!salon || !terrace) return null
  return { salon, terrace }
}

function readWeek(value: unknown, clock: ReservationClock): WeekSchedule | null {
  if (value === undefined || value === null) return weekFromClock(clock)
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const week = defaultWeek()
  for (const day of Object.keys(week) as (keyof WeekSchedule)[]) {
    const item = record[day]
    if (!item || typeof item !== "object") return null
    const row = item as Record<string, unknown>
    if (typeof row.open !== "boolean" || typeof row.opensAt !== "string" || typeof row.closesAt !== "string") return null
    if (!HHMM.test(row.opensAt) || !HHMM.test(row.closesAt) || row.opensAt >= row.closesAt) return null
    week[day] = { open: row.open, opensAt: row.opensAt, closesAt: row.closesAt }
  }
  return week
}

function readNotices(value: unknown): PublicNotices | null {
  const fallback = defaultNotices()
  if (value === undefined || value === null) return fallback
  if (!value || typeof value !== "object") return null
  const notices = value as Record<string, unknown>
  const full = readNotice(notices.full, fallback.full)
  const paused = readNotice(notices.paused, fallback.paused)
  const closedDay = readNotice(notices.closedDay, fallback.closedDay)
  const venueClosed = readNotice(notices.venueClosed, fallback.venueClosed)
  if (!full || !paused || !closedDay || !venueClosed) return null
  return { full, paused, closedDay, venueClosed }
}

function readOperationRules(value: unknown): OperationRules | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const clock = readClock(record.clock) ?? defaultOperationRules().clock
  const serviceMinutes = record.serviceMinutes === null ? null : record.serviceMinutes === undefined ? 90 : record.serviceMinutes
  if (serviceMinutes !== null && (typeof serviceMinutes !== "number" || !Number.isInteger(serviceMinutes) || serviceMinutes < 30 || serviceMinutes > 300)) {
    return null
  }
  const anticipation = record.anticipation as Record<string, unknown> | undefined
  const lead = anticipation?.weekdayLeadHours
  const cutoff = anticipation?.weekendPreviousDayCutoff
  if (lead !== null && lead !== undefined && (typeof lead !== "number" || !Number.isInteger(lead) || lead < 1 || lead > 12)) return null
  if (cutoff !== null && cutoff !== undefined && (typeof cutoff !== "string" || !HHMM.test(cutoff))) return null
  const maxCombinedTables = record.maxCombinedTables === undefined ? 1 : record.maxCombinedTables
  if (typeof maxCombinedTables !== "number" || !Number.isInteger(maxCombinedTables) || maxCombinedTables < 1 || maxCombinedTables > 4) {
    return null
  }
  const walkInTables = record.walkInTables === undefined || record.walkInTables === null ? null : record.walkInTables
  if (walkInTables !== null && (typeof walkInTables !== "number" || !Number.isInteger(walkInTables) || walkInTables < 0 || walkInTables > 40)) {
    return null
  }
  const dailyLimit = readCap(record.dailyLimit, 400)
  const slotLimit = readCap(record.slotLimit, 80)
  if (!dailyLimit || !slotLimit) return null
  const party = record.maxParty as Record<string, unknown> | undefined
  const salonParty = party?.salon === undefined ? 15 : party.salon
  const terraceParty = party?.terrace === undefined ? 20 : party.terrace
  if (typeof salonParty !== "number" || !Number.isInteger(salonParty) || salonParty < 1 || salonParty > 30) return null
  if (typeof terraceParty !== "number" || !Number.isInteger(terraceParty) || terraceParty < 1 || terraceParty > 30) return null
  const notices = readNotices(record.notices)
  if (!notices) return null
  if (!Array.isArray(record.tables)) return null
  const tables: DiningTable[] = []
  for (const item of record.tables) {
    const table = readTable(item)
    if (!table || tables.some((current) => current.id === table.id)) return null
    tables.push(table)
  }
  const sectors = readSectors(record.sectors, tables)
  const week = readWeek(record.week, clock)
  if (!sectors || !week) return null
  const validatedFingerprint = typeof record.validatedFingerprint === "string" ? record.validatedFingerprint : null
  const draft: OperationRules = {
    clock,
    serviceMinutes,
    anticipation: {
      weekdayLeadHours: typeof lead === "number" ? lead : null,
      weekendPreviousDayCutoff: typeof cutoff === "string" ? cutoff : null,
    },
    maxCombinedTables,
    walkInTables,
    dailyLimit,
    slotLimit,
    maxParty: { salon: salonParty, terrace: terraceParty },
    sectors,
    week,
    receptionPaused: record.receptionPaused === true,
    productionReady: false,
    validatedFingerprint,
    notices,
    tables,
    updatedBy: typeof record.updatedBy === "string" ? record.updatedBy.slice(0, 80) : null,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null,
  }
  draft.productionReady = record.productionReady === true && validatedFingerprint === criticalFingerprint(draft)
  return draft
}

function criticalFingerprint(rules: OperationRules) {
  return JSON.stringify({
    clock: rules.clock,
    serviceMinutes: rules.serviceMinutes,
    anticipation: rules.anticipation,
    maxCombinedTables: rules.maxCombinedTables,
    walkInTables: rules.walkInTables,
    dailyLimit: rules.dailyLimit,
    slotLimit: rules.slotLimit,
    maxParty: rules.maxParty,
    sectors: rules.sectors,
    week: rules.week,
    tables: rules.tables.map((table) => ({ ...table })).sort((a, b) => a.id.localeCompare(b.id)),
  })
}

function tableUse(tables: DiningTable[]) {
  const open = tables.filter((table) => !table.blocked)
  return {
    reservable: open.filter((table) => table.reservable).length,
    walkIn: open.filter((table) => !table.reservable).length,
    blocked: tables.filter((table) => table.blocked).length,
  }
}

function readinessIssues(rules: OperationRules) {
  const issues: string[] = []
  if (rules.serviceMinutes === null) issues.push("Falta la duración de una reserva.")
  for (const [zone, label] of [
    ["salon", "salón"],
    ["terrace", "terraza"],
  ] as const) {
    const side = rules.sectors[zone]
    if (side.web > side.total) issues.push(`En ${label} hay más mesas para la web que mesas en total.`)
  }
  return issues
}

/** El documento solo queda listo si la huella validada coincide con estas reglas. */
function operationsDocument(rules: OperationRules) {
  const fingerprint = criticalFingerprint(rules)
  const productionReady = rules.productionReady === true && rules.validatedFingerprint === fingerprint
  const capacityReady = rules.serviceMinutes !== null && readinessIssues(rules).length === 0
  return {
    productionReady,
    capacityReady,
    fixture: false,
    serviceMinutes: rules.serviceMinutes,
    clock: rules.clock,
    anticipation: rules.anticipation,
    maxCombinedTables: rules.maxCombinedTables,
    walkInTables: rules.walkInTables,
    dailyLimit: rules.dailyLimit,
    slotLimit: rules.slotLimit,
    maxParty: rules.maxParty,
    sectors: rules.sectors,
    week: rules.week,
    receptionPaused: rules.receptionPaused,
    validatedFingerprint: rules.validatedFingerprint,
    notices: rules.notices,
    tables: rules.tables,
    updatedBy: rules.updatedBy,
    updatedAt: rules.updatedAt,
  }
}

function capacityFromRules(rules: OperationRules) {
  if (rules.serviceMinutes === null || readinessIssues(rules).length > 0) return null
  return {
    serviceMinutes: rules.serviceMinutes,
    maxCombinedTables: rules.maxCombinedTables,
    tables: rules.tables.map((table) => ({
      id: table.id,
      zone: table.zone,
      seats: table.seatsMax ?? table.seats,
      blocked: table.blocked,
      reservable: table.reservable,
      combinable: table.combinable,
    })),
  }
}

function rawLimits(value: unknown) {
  const empty = { mode: "unset" as const, max: null }
  if (!value || typeof value !== "object") return { dailyLimit: empty, slotLimit: { ...empty } }
  const record = value as Record<string, unknown>
  return {
    dailyLimit: readCap(record.dailyLimit, 400) ?? empty,
    slotLimit: readCap(record.slotLimit, 80) ?? { ...empty },
  }
}

function receptionPausedOf(value: unknown) {
  return Boolean(value && typeof value === "object" && (value as Record<string, unknown>).receptionPaused === true)
}

function publicRules(rules: OperationRules) {
  return {
    clock: rules.clock,
    serviceMinutes: rules.serviceMinutes,
    anticipation: rules.anticipation,
    maxParty: rules.maxParty,
    receptionPaused: rules.receptionPaused,
    notices: rules.notices,
    week: rules.week,
  }
}

export {
  capacityFromRules,
  criticalFingerprint,
  declaredTables,
  defaultNotices,
  defaultOperationRules,
  fullDayMessage,
  informedGroups,
  knownSingleTableSeats,
  operationsDocument,
  publicRules,
  rawLimits,
  readinessIssues,
  readOperationRules,
  receptionPausedOf,
  tableUse,
}
export type { CapMode, DiningTable, OperationRules, PublicNotice, PublicNotices, ReservationCap, SectorLayout, SectorTables }
