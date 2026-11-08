"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Heading, Text } from "@/components/ui/typography"
import type { StaffRole } from "@/lib/auth/roles"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import type { DayOverride } from "@/lib/reservations/day-policy"
import {
  criticalFingerprint,
  declaredTables,
  informedGroups,
  readinessIssues,
  tableUse,
  type DiningTable,
  type OperationRules,
  type ReservationCap,
} from "@/lib/reservations/operations"

const controlClass = "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base"

type Booking = { id: string; tableIds: string[]; startMin: number; endMin: number; zone: string }

type FloorEditorProps = {
  rules: OperationRules
  date: string
  bookings: Booking[]
  pendingCount: number
  confirmedCount: number
  pendingTruncated: boolean
  day: DayOverride
  role?: StaffRole
  preview?: boolean
}

function FloorEditor({
  rules,
  date,
  bookings,
  pendingCount,
  confirmedCount,
  pendingTruncated,
  day,
  role = "admin",
  preview = false,
}: FloorEditorProps) {
  const router = useRouter()
  const [draft, setDraft] = useState(rules)
  const [dayDraft, setDayDraft] = useState(day)
  const [editing, setEditing] = useState<DiningTable | null>(null)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [confirmCritical, setConfirmCritical] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(rules)
  const salon = draft.tables.filter((table) => table.zone === "salon")
  const terrace = draft.tables.filter((table) => table.zone === "terrace")
  const use = tableUse(draft.tables)
  const issues = readinessIssues(draft)

  async function save(next: OperationRules, force = false) {
    const affectsConfirmed = confirmedCount > 0 && criticalFingerprint(next) !== criticalFingerprint(rules)
    if (affectsConfirmed && !force && !confirmCritical) {
      setConfirmCritical(true)
      setMessage("Hay reservas confirmadas. Este cambio no las cancela. Pulsa guardar otra vez para aplicarlo.")
      return
    }
    setConfirmCritical(false)
    setPending(true)
    setError("")
    if (preview) {
      setDraft(next)
      setMessage("Cambio de muestra. No se escribió en Firestore.")
      setPending(false)
      setCreating(false)
      setEditing(null)
      return
    }
    try {
      const response = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
        body: JSON.stringify({ action: "save", rules: toPayload(next) }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string; productionReady?: boolean; issues?: string[] } | null
      if (!response.ok) {
        setError(payload?.message || "No se pudo guardar.")
        return
      }
      setMessage(
        payload?.productionReady
          ? "Configuración guardada. Sigue habilitada para confirmar. La página pública no se encendió."
          : "Configuración guardada. Confirmar sigue bloqueado hasta que el propietario la habilite.",
      )
      setCreating(false)
      setEditing(null)
      router.refresh()
    } catch {
      setError("No se pudo guardar. Revisa la conexión.")
    } finally {
      setPending(false)
    }
  }

  function upsert(table: DiningTable) {
    const tables = draft.tables.some((item) => item.id === table.id)
      ? draft.tables.map((item) => (item.id === table.id ? table : item))
      : [...draft.tables, table]
    void save({ ...draft, tables })
  }

  async function enable() {
    setPending(true)
    setError("")
    if (preview) {
      const pendingIssues = readinessIssues(draft)
      if (pendingIssues.length > 0) {
        setError(pendingIssues.join(" "))
        setPending(false)
        return
      }
      setDraft({ ...draft, productionReady: true, validatedFingerprint: criticalFingerprint(draft) })
      setMessage("Muestra habilitada. No se escribió en Firestore ni se encendió la página pública.")
      setPending(false)
      return
    }
    try {
      const response = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
        body: JSON.stringify({ action: "enable" }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string; issues?: string[] } | null
      if (!response.ok) {
        setError(payload?.issues?.join(" ") || payload?.message || "No se pudo habilitar.")
        return
      }
      setMessage("Configuración habilitada para confirmar. La recepción pública sigue apagada.")
      router.refresh()
    } catch {
      setError("No se pudo habilitar. Revisa la conexión.")
    } finally {
      setPending(false)
    }
  }

  async function saveDate(next: DayOverride, force = false) {
    if (confirmedCount > 0 && !force) {
      setMessage("Hay reservas confirmadas ese día. Guardar el día no las cancela. Pulsa otra vez para aplicarlo.")
      setDayDraft(next)
      setConfirmCritical(true)
      return
    }
    setConfirmCritical(false)
    setPending(true)
    setError("")
    setDayDraft(next)
    if (preview) {
      setMessage("Cambio de muestra. No se escribió en Firestore.")
      setPending(false)
      return
    }
    try {
      const response = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
        body: JSON.stringify({ action: "save-day", day: dayPayload(next) }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setError(payload?.message || "No se pudo guardar el día.")
        return
      }
      setMessage("Día actualizado. Las reservas ya confirmadas siguen igual.")
      router.refresh()
    } catch {
      setError("No se pudo guardar el día. Revisa la conexión.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Heading as="h1" size="h3">
          Mesas y reservas
        </Heading>
        <Text>
          Desde aquí se administran mesas, horarios, cupos y la recepción. Salón declarado: {declaredTables.salon}. Terraza declarada:{" "}
          {declaredTables.terrace}, con 2 en sector fumadores.
        </Text>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Salón creadas" value={`${salon.length}/${declaredTables.salon}`} />
          <Stat label="Terraza creadas" value={`${terrace.length}/${declaredTables.terrace}`} />
          <Stat label="Faltan salón" value={String(Math.max(declaredTables.salon - salon.length, 0))} />
          <Stat label="Faltan terraza" value={String(Math.max(declaredTables.terrace - terrace.length, 0))} />
        </dl>
        <Text size="sm" tone="muted">
          Se informaron {informedGroups.salon.of4} grupos de 4, {informedGroups.salon.of3} de 3 y {informedGroups.salon.of2} de 2 en
          salón, y {informedGroups.terrace.of4} de 4 y {informedGroups.terrace.of2} de 2 en terraza. Esos de 2 pueden llegar a 3. Faltan 8
          y 6 mesas: no se crean solas. Los topes de 15 y 20 son del formulario, no de una mesa.
        </Text>
      </header>

      <p role="status" className="min-h-6 text-base font-semibold">
        {message}
      </p>
      {error ? (
        <p role="alert" className="text-base">
          {error}
        </p>
      ) : null}
      {dirty ? <Text size="sm">Hay cambios de reglas sin guardar.</Text> : null}

      <Tabs defaultValue="overview">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="overview" className="min-h-11">
            Vista general
          </TabsTrigger>
          <TabsTrigger value="tables" className="min-h-11">
            Mesas
          </TabsTrigger>
          <TabsTrigger value="availability" className="min-h-11">
            Disponibilidad
          </TabsTrigger>
          <TabsTrigger value="rules" className="min-h-11">
            Horarios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-xl border border-olive-line bg-surface-raised p-4">
            <Heading as="h2" size="h4">
              Recepción de reservas: {draft.receptionPaused ? "Pausada" : "Activa"}
            </Heading>
            <Text size="sm">
              Pausar impide solicitudes nuevas en el servidor. Las que ya existen se mantienen. Esto no enciende la página pública.
            </Text>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={draft.receptionPaused ? "secondary" : "accent"} disabled={pending} onClick={() => void save({ ...draft, receptionPaused: false }, true)}>
                Activa
              </Button>
              <Button type="button" variant={draft.receptionPaused ? "accent" : "secondary"} disabled={pending} onClick={() => void save({ ...draft, receptionPaused: true }, true)}>
                Pausada
              </Button>
            </div>
          </section>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Pendientes del día" value={pendingTruncated ? "50+" : String(pendingCount)} />
            <Stat label="Confirmadas del día" value={pendingTruncated ? "50+" : String(confirmedCount)} />
            <Stat label="Mesas reservables" value={String(use.reservable)} />
            <Stat label="Sin reserva" value={String(use.walkIn)} />
          </dl>
          <Text>
            {draft.productionReady
              ? "La configuración está habilitada para confirmar mesas. La recepción pública sigue apagada hasta la variable de hosting."
              : "Confirmar una mesa sigue bloqueado hasta que el propietario habilite esta configuración."}
          </Text>
          {draft.updatedBy ? (
            <Text size="sm" tone="muted">
              Último cambio: {draft.updatedBy}
              {draft.updatedAt ? ` · ${draft.updatedAt.slice(0, 16).replace("T", " ")}` : ""}
            </Text>
          ) : null}
          {issues.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {issues.map((issue) => (
                <li key={issue} className="text-base">
                  {issue}
                </li>
              ))}
            </ul>
          ) : (
            <Text>Los datos obligatorios están completos.</Text>
          )}
          {role === "superadmin" ? (
            <Button type="button" variant="secondary" disabled={pending || dirty} onClick={() => void enable()}>
              Habilitar configuración de reservas
            </Button>
          ) : (
            <Text size="sm" tone="muted">
              Solo el propietario puede habilitar la configuración.
            </Text>
          )}
          {dirty ? <Text size="sm">Guarda los cambios antes de habilitar.</Text> : null}
        </TabsContent>

        <TabsContent value="tables" className="flex flex-col gap-4">
          <Button type="button" onClick={() => setCreating(true)}>
            Agregar mesa
          </Button>
          <ZoneList title="Salón" tables={salon} bookings={bookings} onEdit={setEditing} />
          <ZoneList title="Terraza" tables={terrace} bookings={bookings} onEdit={setEditing} />
        </TabsContent>

        <TabsContent value="rules">
          <RulesForm
            rules={draft}
            pending={pending}
            onChange={setDraft}
            onSave={() => void save(draft)}
          />
        </TabsContent>

        <TabsContent value="availability" className="flex flex-col gap-4">
          <form className="flex flex-col gap-2 sm:max-w-xs" action="/admin/mesas">
            <FieldLabel htmlFor="floor-date">Día</FieldLabel>
            <Input id="floor-date" name="date" type="date" defaultValue={date} />
            <Button type="submit" variant="secondary">
              Ver día
            </Button>
          </form>
          <DayForm
            day={dayDraft}
            confirmedCount={confirmedCount}
            pending={pending}
            onChange={setDayDraft}
            onSave={(force) => void saveDate(dayDraft, force || confirmCritical)}
          />
          <Text>
            {pendingTruncated ? "Hay al menos 50 solicitudes ese día." : `${pendingCount} solicitudes pendientes ese día, todavía sin mesa.`}
          </Text>
          <Heading as="h2" size="h4">
            Ocupación
          </Heading>
          <ul className="flex flex-col gap-3">
            {draft.tables.map((table) => {
              const occupied = bookings.filter((booking) => booking.tableIds.includes(table.id))
              return (
                <li key={table.id} className="rounded-xl border border-olive-line bg-surface-raised p-3">
                  <p className="font-heading text-lg font-bold">{table.label}</p>
                  <TableFlags table={table} />
                  {occupied.length === 0 ? (
                    <Text size="sm" tone="muted">
                      Sin reserva confirmada en este día.
                    </Text>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-1">
                      {occupied.map((booking) => (
                        <li key={booking.id} className="text-base">
                          Ocupada {clockLabel(booking.startMin)}–{clockLabel(booking.endMin)}
                          {booking.tableIds.length > 1 ? ` · junta ${booking.tableIds.length} mesas` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </TabsContent>
      </Tabs>

      {creating || editing ? (
        <TableForm
          table={editing}
          pending={pending}
          onCancel={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSave={upsert}
          onDelete={
            editing
              ? () => void save({ ...draft, tables: draft.tables.filter((table) => table.id !== editing.id) })
              : undefined
          }
        />
      ) : null}
    </div>
  )
}

function ZoneList({
  title,
  tables,
  bookings,
  onEdit,
}: {
  title: string
  tables: DiningTable[]
  bookings: Booking[]
  onEdit: (table: DiningTable) => void
}) {
  return (
    <section className="flex flex-col gap-3">
      <Heading as="h2" size="h4">
        {title}
      </Heading>
      {tables.length === 0 ? <Text>Todavía no hay mesas en esta zona.</Text> : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {tables.map((table) => {
          const busy = bookings.some((booking) => booking.tableIds.includes(table.id))
          return (
            <li key={table.id}>
              <button
                type="button"
                className="flex min-h-24 w-full flex-col items-start gap-2 rounded-xl border border-olive-line bg-surface-raised p-3 text-left"
                onClick={() => onEdit(table)}
              >
                <span className="font-heading text-lg font-bold">{table.label}</span>
                <span className="text-base">
                  {table.seats} personas{table.seatsMax ? `, hasta ${table.seatsMax}` : ""}
                </span>
                <TableFlags table={table} busy={busy} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function TableFlags({ table, busy = false }: { table: DiningTable; busy?: boolean }) {
  return (
    <span className="flex flex-wrap gap-2 text-sm font-semibold">
      <span>{table.reservable ? "Reservable" : "Sin reserva"}</span>
      {table.blocked ? <span>Bloqueada</span> : null}
      {table.combinable ? <span>Combinable</span> : null}
      {table.smoker ? <span>Fumadores</span> : null}
      {busy ? <span>Ocupada hoy</span> : null}
    </span>
  )
}

function RulesForm({
  rules,
  pending,
  onChange,
  onSave,
}: {
  rules: OperationRules
  pending: boolean
  onChange: (rules: OperationRules) => void
  onSave: () => void
}) {
  const [fieldError, setFieldError] = useState("")
  const duration = rules.serviceMinutes === null ? "" : String(rules.serviceMinutes)
  const lead = rules.anticipation.weekdayLeadHours === null ? "" : String(rules.anticipation.weekdayLeadHours)

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (rules.serviceMinutes !== null && (rules.serviceMinutes < 30 || rules.serviceMinutes > 300)) {
          setFieldError("La duración tiene que ser un entero entre 30 y 300 minutos, o quedar vacía.")
          return
        }
        setFieldError("")
        onSave()
      }}
    >
      <TimeField label="Apertura lunes a jueves" value={rules.clock.weekday.opensAt} onChange={(opensAt) => onChange({ ...rules, clock: { ...rules.clock, weekday: { ...rules.clock.weekday, opensAt } } })} />
      <TimeField label="Cierre lunes a jueves" value={rules.clock.weekday.closesAt} onChange={(closesAt) => onChange({ ...rules, clock: { ...rules.clock, weekday: { ...rules.clock.weekday, closesAt } } })} />
      <TimeField label="Apertura viernes y sábado" value={rules.clock.weekend.opensAt} onChange={(opensAt) => onChange({ ...rules, clock: { ...rules.clock, weekend: { ...rules.clock.weekend, opensAt } } })} />
      <TimeField label="Cierre viernes y sábado" value={rules.clock.weekend.closesAt} onChange={(closesAt) => onChange({ ...rules, clock: { ...rules.clock, weekend: { ...rules.clock.weekend, closesAt } } })} />
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="floor-duration">Duración de una reserva, en minutos</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {[60, 90, 120].map((minutes) => (
            <Button key={minutes} type="button" variant={rules.serviceMinutes === minutes ? "accent" : "secondary"} onClick={() => onChange({ ...rules, serviceMinutes: minutes })}>
              {minutes} min
            </Button>
          ))}
        </div>
        <Input
          id="floor-duration"
          className="mt-2"
          inputMode="numeric"
          value={duration}
          placeholder="90"
          onChange={(event) =>
            onChange({ ...rules, serviceMinutes: event.target.value.trim() === "" ? null : Number(event.target.value) })
          }
        />
        <FieldDescription>El local estimó 1 hora y 30 minutos. Puedes dejar 60, 90, 120 u otro entero entre 30 y 300.</FieldDescription>
      </Field>
      <TimeField
        label="Última llegada"
        value={rules.clock.lastSeatingTime ?? ""}
        optional
        onChange={(value) => onChange({ ...rules, clock: { ...rules.clock, lastSeatingTime: value || null } })}
      />
      <Field>
        <FieldLabel htmlFor="floor-lead">Anticipación lunes a jueves, en horas</FieldLabel>
        <Input
          id="floor-lead"
          inputMode="numeric"
          value={lead}
          placeholder="1 o 2, sin elegir"
          onChange={(event) =>
            onChange({
              ...rules,
              anticipation: {
                ...rules.anticipation,
                weekdayLeadHours: event.target.value.trim() === "" ? null : Number(event.target.value),
              },
            })
          }
        />
        <FieldDescription>Sigue pendiente elegir entre 1 y 2 horas. Vacío: el formulario no la exige.</FieldDescription>
      </Field>
      <TimeField
        label="Cierre de pedidos viernes y sábado, día anterior"
        value={rules.anticipation.weekendPreviousDayCutoff ?? ""}
        optional
        onChange={(value) =>
          onChange({ ...rules, anticipation: { ...rules.anticipation, weekendPreviousDayCutoff: value || null } })
        }
      />
      <Field>
        <FieldLabel htmlFor="floor-combine">Mesas que se pueden juntar</FieldLabel>
        <select
          id="floor-combine"
          className={controlClass}
          value={String(rules.maxCombinedTables)}
          onChange={(event) => onChange({ ...rules, maxCombinedTables: Number(event.target.value) })}
        >
          <option value="1">Solo una mesa</option>
          <option value="2">Hasta 2, si están marcadas</option>
          <option value="3">Hasta 3, si están marcadas</option>
          <option value="4">Hasta 4, si están marcadas</option>
        </select>
        <FieldDescription>No se junta una mesa que no esté marcada como combinable, ni se mezclan salón y terraza.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="floor-walkin">Mesas para quien llega sin reserva</FieldLabel>
        <Input
          id="floor-walkin"
          inputMode="numeric"
          value={rules.walkInTables === null ? "" : String(rules.walkInTables)}
          placeholder="Sin confirmar"
          onChange={(event) =>
            onChange({ ...rules, walkInTables: event.target.value.trim() === "" ? null : Number(event.target.value) })
          }
        />
        <FieldDescription>
          Marcadas ahora: {tableUse(rules.tables).walkIn}. Reservables: {tableUse(rules.tables).reservable}. El número tiene que coincidir
          con las mesas no reservables. Puede ser cero. No inventes las que faltan.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="floor-party-salon">Máximo de personas por solicitud, salón</FieldLabel>
        <Input
          id="floor-party-salon"
          inputMode="numeric"
          value={String(rules.maxParty.salon)}
          onChange={(event) => onChange({ ...rules, maxParty: { ...rules.maxParty, salon: Number(event.target.value) } })}
        />
        <FieldDescription>Es el tope del formulario, no la capacidad de una mesa. Hoy parte en 15.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="floor-party-terrace">Máximo de personas por solicitud, terraza</FieldLabel>
        <Input
          id="floor-party-terrace"
          inputMode="numeric"
          value={String(rules.maxParty.terrace)}
          onChange={(event) => onChange({ ...rules, maxParty: { ...rules.maxParty, terrace: Number(event.target.value) } })}
        />
        <FieldDescription>Hoy parte en 20. No es la capacidad de una mesa.</FieldDescription>
      </Field>
      <CapField
        id="floor-daily"
        label="Reservas confirmadas por día"
        description="No es la cantidad de personas sentadas a la vez. Sin definir no se puede habilitar. Sin tope adicional deja solo el límite de las mesas."
        cap={rules.dailyLimit}
        onChange={(dailyLimit) => onChange({ ...rules, dailyLimit })}
      />
      <CapField
        id="floor-slot"
        label="Reservas que empiezan en el mismo horario"
        description="Es un tope aparte de las mesas ocupadas al mismo tiempo. Elige sin tope si no quieres usarlo."
        cap={rules.slotLimit}
        onChange={(slotLimit) => onChange({ ...rules, slotLimit })}
      />
      <NoticeField
        label="Día completo"
        notice={rules.notices.full}
        onChange={(full) => onChange({ ...rules, notices: { ...rules.notices, full } })}
      />
      <NoticeField
        label="Recepción pausada"
        notice={rules.notices.paused}
        onChange={(paused) => onChange({ ...rules, notices: { ...rules.notices, paused } })}
      />
      <NoticeField
        label="Día sin reservas"
        notice={rules.notices.closedDay}
        onChange={(closedDay) => onChange({ ...rules, notices: { ...rules.notices, closedDay } })}
      />
      <NoticeField
        label="Local cerrado"
        notice={rules.notices.venueClosed}
        onChange={(venueClosed) => onChange({ ...rules, notices: { ...rules.notices, venueClosed } })}
      />
      {fieldError ? <FieldError>{fieldError}</FieldError> : null}
      <Button type="submit" loading={pending}>
        Guardar reglas
      </Button>
    </form>
  )
}

function CapField({
  id,
  label,
  description,
  cap,
  onChange,
}: {
  id: string
  label: string
  description: string
  cap: ReservationCap
  onChange: (cap: ReservationCap) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        className={controlClass}
        value={cap.mode}
        onChange={(event) => {
          const mode = event.target.value as ReservationCap["mode"]
          onChange(mode === "capped" ? { mode, max: cap.max ?? 1 } : { mode, max: null })
        }}
      >
        <option value="unset">Sin definir</option>
        <option value="none">Sin tope adicional</option>
        <option value="capped">Hasta un número</option>
      </select>
      {cap.mode === "capped" ? (
        <Input
          className="mt-2"
          inputMode="numeric"
          aria-label={`${label}, cantidad`}
          value={cap.max ?? ""}
          onChange={(event) => onChange({ mode: "capped", max: Number(event.target.value) })}
        />
      ) : null}
      <FieldDescription>{description}</FieldDescription>
    </Field>
  )
}

function NoticeField({
  label,
  notice,
  onChange,
}: {
  label: string
  notice: OperationRules["notices"]["full"]
  onChange: (notice: OperationRules["notices"]["full"]) => void
}) {
  return (
    <Field className="sm:col-span-2">
      <Check label={`Mostrar aviso de ${label.toLowerCase()}`} checked={notice.enabled} onChange={(enabled) => onChange({ ...notice, enabled })} />
      <FieldLabel htmlFor={`notice-${label}`}>{label}</FieldLabel>
      <Textarea id={`notice-${label}`} className="min-h-24 text-base" value={notice.text} maxLength={400} onChange={(event) => onChange({ ...notice, text: event.target.value })} />
    </Field>
  )
}

function DayForm({
  day,
  confirmedCount,
  pending,
  onChange,
  onSave,
}: {
  day: DayOverride
  confirmedCount: number
  pending: boolean
  onChange: (day: DayOverride) => void
  onSave: (force?: boolean) => void
}) {
  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-olive-line bg-surface-raised p-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(false)
      }}
    >
      <Heading as="h2" size="h4">
        Este día
      </Heading>
      <Check label="Cerrar reservas este día" checked={day.closed} onChange={(closed) => onChange({ ...day, closed, full: closed ? false : day.full })} />
      <Check
        label="Marcar el día como completo"
        checked={day.full}
        onChange={(full) => onChange({ ...day, full, closed: full ? false : day.closed })}
      />
      <Text size="sm">
        Completo muestra que se puede llegar sin reserva. No dice que el restaurante esté agotado. Cerrar o completar no cancela las
        reservas ya confirmadas.
      </Text>
      <Field>
        <FieldLabel htmlFor="day-open">Horario especial, apertura</FieldLabel>
        <Input
          id="day-open"
          type="time"
          value={day.hours?.opensAt ?? ""}
          onChange={(event) =>
            onChange({
              ...day,
              hours: event.target.value ? { opensAt: event.target.value.slice(0, 5), closesAt: day.hours?.closesAt || "23:00" } : null,
            })
          }
        />
        <FieldDescription>Vacío: se usa el horario de la semana. Sirve para un feriado o para abrir un domingo.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="day-close">Horario especial, cierre</FieldLabel>
        <Input
          id="day-close"
          type="time"
          value={day.hours?.closesAt ?? ""}
          onChange={(event) =>
            onChange({
              ...day,
              hours: event.target.value ? { opensAt: day.hours?.opensAt || "13:00", closesAt: event.target.value.slice(0, 5) } : day.hours,
            })
          }
        />
      </Field>
      <TimeField
        label="Última llegada de este día"
        value={day.lastSeatingTime ?? ""}
        optional
        onChange={(value) => onChange({ ...day, lastSeatingTime: value || null })}
      />
      <DayCapField label="Tope de este día" cap={day.daily} onChange={(daily) => onChange({ ...day, daily })} />
      <DayCapField label="Tope de este horario" cap={day.slot} onChange={(slot) => onChange({ ...day, slot })} />
      <Field>
        <FieldLabel htmlFor="day-notice">Aviso solo para esta fecha</FieldLabel>
        <Textarea
          id="day-notice"
          className="min-h-24 text-base"
          maxLength={400}
          value={day.notice ?? ""}
          placeholder="Vacío: se usa el aviso general"
          onChange={(event) => onChange({ ...day, notice: event.target.value.trim() ? event.target.value : null })}
        />
      </Field>
      {confirmedCount > 0 ? <Text size="sm">Hay reservas confirmadas. El cambio no las cancela.</Text> : null}
      <Button type="submit" loading={pending}>
        Guardar este día
      </Button>
    </form>
  )
}

function DayCapField({
  label,
  cap,
  onChange,
}: {
  label: string
  cap: DayOverride["daily"]
  onChange: (cap: DayOverride["daily"]) => void
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        className={controlClass}
        value={cap.mode}
        onChange={(event) => {
          const mode = event.target.value as DayOverride["daily"]["mode"]
          onChange(mode === "capped" ? { mode, max: cap.max ?? 1 } : { mode, max: null })
        }}
      >
        <option value="inherit">Usar el tope general</option>
        <option value="none">Sin tope este día</option>
        <option value="capped">Hasta un número</option>
      </select>
      {cap.mode === "capped" ? (
        <Input className="mt-2" inputMode="numeric" aria-label={`${label}, cantidad`} value={cap.max ?? ""} onChange={(event) => onChange({ mode: "capped", max: Number(event.target.value) })} />
      ) : null}
    </Field>
  )
}

function TimeField({
  label,
  value,
  optional = false,
  onChange,
}: {
  label: string
  value: string
  optional?: boolean
  onChange: (value: string) => void
}) {
  const id = useMemo(() => `floor-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, [label])
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input id={id} type="time" value={value} required={!optional} onChange={(event) => onChange(event.target.value.slice(0, 5))} />
    </Field>
  )
}

function TableForm({
  table,
  pending,
  onCancel,
  onSave,
  onDelete,
}: {
  table: DiningTable | null
  pending: boolean
  onCancel: () => void
  onSave: (table: DiningTable) => void
  onDelete?: () => void
}) {
  const [label, setLabel] = useState(table?.label ?? "")
  const [zone, setZone] = useState<DiningTable["zone"]>(table?.zone ?? "salon")
  const [seats, setSeats] = useState(table ? String(table.seats) : "")
  const [seatsMax, setSeatsMax] = useState(table?.seatsMax ? String(table.seatsMax) : "")
  const [blocked, setBlocked] = useState(table?.blocked ?? false)
  const [reservable, setReservable] = useState(table?.reservable ?? true)
  const [combinable, setCombinable] = useState(table?.combinable ?? false)
  const [smoker, setSmoker] = useState(table?.smoker ?? false)
  const [fieldError, setFieldError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-olive-line bg-surface-raised p-4"
      onSubmit={(event) => {
        event.preventDefault()
        const seatCount = Number(seats)
        const max = seatsMax.trim() === "" ? null : Number(seatsMax)
        if (!label.trim() || !Number.isInteger(seatCount) || seatCount < 1 || seatCount > 30) {
          setFieldError("La mesa necesita nombre y una capacidad entera entre 1 y 30.")
          return
        }
        if (max !== null && (!Number.isInteger(max) || max < seatCount || max > 30)) {
          setFieldError("El máximo tiene que ser mayor que la capacidad habitual y no pasar de 30.")
          return
        }
        onSave({
          id: table?.id ?? "",
          label: label.trim(),
          zone,
          seats: seatCount,
          seatsMax: max,
          blocked,
          reservable,
          combinable,
          smoker,
        })
      }}
    >
      <Heading as="h2" size="h4">
        {table ? "Editar mesa" : "Nueva mesa"}
      </Heading>
      <Field>
        <FieldLabel htmlFor="table-label">Nombre</FieldLabel>
        <Input id="table-label" value={label} onChange={(event) => setLabel(event.target.value)} required autoComplete="off" />
      </Field>
      <Field>
        <FieldLabel htmlFor="table-zone">Zona</FieldLabel>
        <select id="table-zone" className={controlClass} value={zone} onChange={(event) => setZone(event.target.value as DiningTable["zone"])}>
          <option value="salon">Salón</option>
          <option value="terrace">Terraza</option>
        </select>
      </Field>
      <Field>
        <FieldLabel htmlFor="table-seats">Capacidad habitual</FieldLabel>
        <Input id="table-seats" inputMode="numeric" value={seats} onChange={(event) => setSeats(event.target.value)} required />
        <FieldDescription>No es el tope de 15 o 20 de la solicitud. Es cuántas personas caben en esta mesa.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="table-max">Capacidad máxima, si puede crecer</FieldLabel>
        <Input id="table-max" inputMode="numeric" value={seatsMax} placeholder="Vacío si no cambia" onChange={(event) => setSeatsMax(event.target.value)} />
      </Field>
      <Check label="Disponible para reservas" checked={reservable} onChange={setReservable} />
      <Check label="Bloqueada" checked={blocked} onChange={setBlocked} />
      <Check label="Se puede juntar con otras" checked={combinable} onChange={setCombinable} />
      <Check label="Sector fumadores" checked={smoker} onChange={setSmoker} />
      {fieldError ? <FieldError>{fieldError}</FieldError> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" loading={pending}>
          Guardar mesa
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cerrar
        </Button>
        {onDelete ? (
          confirmDelete ? (
            <Button type="button" variant="secondary" disabled={pending} onClick={onDelete}>
              Confirmar eliminación
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setConfirmDelete(true)}>
              Eliminar mesa
            </Button>
          )
        ) : null}
      </div>
    </form>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  const id = useMemo(() => `check-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, [label])
  return (
    <Field orientation="horizontal" className="min-h-11">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
    </Field>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-olive-line bg-surface-raised px-3 py-3">
      <dt className="font-label text-[0.6875rem] font-semibold tracking-[0.14em] text-olive-muted uppercase">{label}</dt>
      <dd className="font-heading text-2xl font-extrabold">{value}</dd>
    </div>
  )
}

function clockLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

function toPayload(rules: OperationRules) {
  return {
    clock: rules.clock,
    serviceMinutes: rules.serviceMinutes,
    anticipation: rules.anticipation,
    maxCombinedTables: rules.maxCombinedTables,
    walkInTables: rules.walkInTables,
    dailyLimit: rules.dailyLimit,
    slotLimit: rules.slotLimit,
    maxParty: rules.maxParty,
    receptionPaused: rules.receptionPaused,
    notices: rules.notices,
    tables: rules.tables.map((table) => ({ ...table, id: table.id || undefined })),
  }
}

function dayPayload(day: DayOverride) {
  return {
    date: day.date,
    closed: day.closed,
    full: day.full,
    hours: day.hours,
    lastSeatingTime: day.lastSeatingTime,
    daily: day.daily,
    slot: day.slot,
    notice: day.notice,
  }
}

export { FloorEditor }
