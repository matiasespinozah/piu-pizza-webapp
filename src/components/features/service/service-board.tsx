"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, CheckCheck, CircleCheck, UtensilsCrossed } from "lucide-react"

import { ReservationStatusBadge } from "@/components/features/reservations/reservation-status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import { zoneConfig } from "@/lib/reservations/configuration"
import type { ServiceTableChoice } from "@/lib/reservations/service-tables"
import type { ServiceBoard, ServiceReservation } from "@/lib/reservations/service-view"

const refreshMs = 20_000

const attentionLabel = {
  confirmed: "Por llegar",
  arrived: "En atención",
  completed: "Finalizada",
} as const

function ServiceBoardView({ initial, selectedId, live = true }: { initial: ServiceBoard; selectedId?: string; live?: boolean }) {
  const [board, setBoard] = useState(initial)
  const [selected, setSelected] = useState<string | null>(selectedId ?? null)
  const [message, setMessage] = useState("")
  const [offline, setOffline] = useState(false)
  const items = [...board.arriving, ...board.serving, ...board.finished]
  const current = items.find((item) => item.id === selected) ?? null

  useEffect(() => {
    if (!live) return
    let stopped = false
    let timer = 0
    async function pull() {
      if (document.hidden) return
      try {
        const response = await fetch("/api/admin/service/reservations", { cache: "no-store" })
        if (response.status === 401) {
          setMessage("La sesión caducó. Vuelve a entrar.")
          return
        }
        if (!response.ok) return
        const body = (await response.json()) as { board?: ServiceBoard }
        if (!stopped && body.board) {
          setBoard(body.board)
          setOffline(false)
        }
      } catch {
        if (!stopped) setOffline(true)
      }
    }
    function arm() {
      window.clearInterval(timer)
      timer = window.setInterval(() => void pull(), refreshMs)
    }
    function onVisible() {
      if (!document.hidden) void pull()
    }
    arm()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      stopped = true
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [live])

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-[1.7rem] leading-none font-extrabold tracking-tight text-olive">Atención de hoy</h1>
        <p className="text-sm text-olive-muted">Reservas confirmadas de este día.</p>
      </header>
      {offline ? <p className="rounded-2xl bg-status-waiting-soft px-3 py-2 text-sm text-status-waiting">Sin conexión. Se reintenta solo.</p> : null}
      {message ? <p className="rounded-2xl bg-status-closed-soft px-3 py-2 text-sm text-status-closed">{message}</p> : null}
      {!board.ready ? <p className="admin-card px-4 py-3 text-sm text-olive-strong">La recepción de reservas sigue desactivada.</p> : null}
      {board.indexError ? <p className="admin-card px-4 py-3 text-sm text-olive-strong">No se pudo leer el día. Espera un momento y vuelve a abrir.</p> : null}
      {current ? (
        <ServiceDetail
          item={current}
          onBack={() => {
            setSelected(null)
            setMessage("")
          }}
          onMessage={setMessage}
          onDone={() => {
            setMessage("")
            void fetch("/api/admin/service/reservations", { cache: "no-store" })
              .then((response) => response.json())
              .then((body: { board?: ServiceBoard }) => {
                if (body.board) setBoard(body.board)
              })
              .catch(() => setOffline(true))
          }}
        />
      ) : (
        <ServiceLists board={board} onOpen={setSelected} />
      )}
    </div>
  )
}

function ServiceLists({ board, onOpen }: { board: ServiceBoard; onOpen: (id: string) => void }) {
  const quiet = board.arriving.length === 0 && board.serving.length === 0
  return (
    <div className="flex flex-col gap-5">
      <ServiceGroup title="Por llegar" items={board.arriving} empty={quiet ? "No hay reservas confirmadas por atender." : "Nadie por llegar."} onOpen={onOpen} />
      <ServiceGroup title="En atención" items={board.serving} empty="Nadie en atención." onOpen={onOpen} />
      <details className="admin-card px-3.5 py-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-heading text-base font-extrabold text-olive">
          Finalizadas
          <span className="text-sm font-semibold text-olive-muted">{board.finished.length}</span>
        </summary>
        <div className="mt-2">
          <ServiceGroup title="" items={board.finished} empty="Todavía no hay atenciones finalizadas." onOpen={onOpen} />
        </div>
      </details>
    </div>
  )
}

function ServiceGroup({
  title,
  items,
  empty,
  onOpen,
}: {
  title: string
  items: ServiceReservation[]
  empty: string
  onOpen: (id: string) => void
}) {
  return (
    <section className="flex flex-col gap-2">
      {title ? <h2 className="font-heading text-base font-extrabold text-olive">{title}</h2> : null}
      {items.length === 0 ? <p className="text-sm text-olive-muted">{empty}</p> : null}
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => onOpen(item.id)} className="admin-card flex w-full min-h-11 flex-col gap-1 px-3.5 py-3 text-left">
              <span className="flex items-center justify-between gap-2">
                <span className="font-heading text-lg font-extrabold text-olive">{item.preferredTime}</span>
                <ReservationStatusBadge status={item.status} label={attentionLabel[item.status]} />
              </span>
              <span className="truncate text-base font-semibold text-olive">{item.customerName}</span>
              <span className="text-sm text-olive-muted">
                {item.partySize} pers. · {zoneConfig(item.preferredZone).label}
                {item.tableLabel ? ` · ${item.tableLabel}` : " · Sin mesa"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ServiceDetail({
  item,
  onBack,
  onDone,
  onMessage,
}: {
  item: ServiceReservation
  onBack: () => void
  onDone: () => void
  onMessage: (text: string) => void
}) {
  const [pending, setPending] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [tables, setTables] = useState<ServiceTableChoice[] | null>(null)
  const [configured, setConfigured] = useState(true)
  const [choice, setChoice] = useState("")
  const [localMessage, setLocalMessage] = useState("")

  async function run(action: "arrive" | "assign" | "complete", tableLabel?: string) {
    if (pending) return
    setPending(true)
    setLocalMessage("")
    try {
      const response = await fetch(`/api/admin/service/reservations/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
        body: JSON.stringify({ action, revision: item.revision, ...(tableLabel ? { tableLabel } : {}) }),
      })
      const body = (await response.json().catch(() => null)) as { message?: string } | null
      if (response.status === 401) {
        onMessage("La sesión caducó. Vuelve a entrar.")
        return
      }
      if (!response.ok) {
        setLocalMessage(body?.message || "No se pudo completar. Revisa el estado y vuelve a intentar.")
        onDone()
        return
      }
      setAssignOpen(false)
      setFinishOpen(false)
      onMessage(action === "arrive" ? "Quedó marcada la llegada." : action === "complete" ? "La atención quedó finalizada." : "La mesa quedó asignada.")
      onDone()
      if (action === "complete") onBack()
    } catch {
      setLocalMessage("Sin conexión. Revisa tu red e inténtalo de nuevo.")
    } finally {
      setPending(false)
    }
  }

  async function openAssign() {
    setAssignOpen(true)
    setTables(null)
    setChoice("")
    try {
      const response = await fetch(`/api/admin/service/reservations/${item.id}/tables`, { cache: "no-store" })
      const body = (await response.json()) as { configured?: boolean; tables?: ServiceTableChoice[]; message?: string }
      if (!response.ok) {
        setLocalMessage(body.message || "No se pudieron leer las mesas.")
        setConfigured(false)
        setTables([])
        return
      }
      setConfigured(body.configured !== false)
      setTables(body.tables ?? [])
    } catch {
      setLocalMessage("Sin conexión. Revisa tu red e inténtalo de nuevo.")
      setTables([])
    }
  }

  return (
    <article className="admin-card flex flex-col gap-4 px-3.5 py-4">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-olive">
        <ArrowLeft aria-hidden className="size-4" />
        Volver
      </button>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-heading text-2xl font-extrabold text-olive">{item.preferredTime}</p>
          <h2 className="truncate text-lg font-semibold text-olive">{item.customerName}</h2>
          <p className="text-sm text-olive-muted">{item.referenceCode}</p>
        </div>
        <ReservationStatusBadge status={item.status} label={attentionLabel[item.status]} size="md" />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-olive-muted">Personas</dt>
          <dd className="font-semibold text-olive">{item.partySize}</dd>
        </div>
        <div>
          <dt className="text-olive-muted">Zona</dt>
          <dd className="font-semibold text-olive">{zoneConfig(item.preferredZone).label}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-olive-muted">Mesa</dt>
          <dd className="font-semibold text-olive">{item.tableLabel ?? "Sin mesa"}</dd>
        </div>
      </dl>
      {item.notes ? (
        <section>
          <h3 className="text-xs font-semibold tracking-wide text-olive-muted uppercase">Observaciones del cliente</h3>
          <p className="mt-1 text-sm text-olive-strong">{item.notes}</p>
        </section>
      ) : null}
      {item.internalNotes ? (
        <section className="rounded-2xl bg-olive-hover px-3 py-3">
          <h3 className="text-xs font-semibold tracking-wide text-olive-muted uppercase">Nota interna</h3>
          <p className="mt-1 text-sm text-olive-strong">{item.internalNotes}</p>
        </section>
      ) : null}
      {localMessage ? <p className="text-sm text-status-closed">{localMessage}</p> : null}
      <div className="flex flex-col gap-2">
        {item.status === "confirmed" ? (
          <Button type="button" className="h-12" disabled={pending} onClick={() => void run("arrive")}>
            <CheckCheck aria-hidden className="size-4" />
            Marcar llegada
          </Button>
        ) : null}
        {item.status === "confirmed" || item.status === "arrived" ? (
          <Button type="button" variant="secondary" className="h-12" disabled={pending} onClick={() => void openAssign()}>
            <UtensilsCrossed aria-hidden className="size-4" />
            Asignar mesa
          </Button>
        ) : null}
        {item.status === "arrived" ? (
          <Button type="button" className="h-12" disabled={pending} onClick={() => setFinishOpen(true)}>
            <CircleCheck aria-hidden className="size-4" />
            Finalizar atención
          </Button>
        ) : null}
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogTitle>Asignar mesa</DialogTitle>
          <DialogDescription>
            {zoneConfig(item.preferredZone).label} · {item.partySize} personas
          </DialogDescription>
          {tables === null ? <p className="text-sm text-olive-muted">Buscando mesas libres…</p> : null}
          {tables && !configured ? <p className="text-sm text-olive-strong">Todavía no hay mesas configuradas. Puedes marcar la llegada igual.</p> : null}
          {tables && configured && tables.length === 0 ? <p className="text-sm text-olive-strong">No hay una mesa libre que alcance para este grupo.</p> : null}
          <ul className="flex flex-col gap-2">
            {(tables ?? []).map((table) => (
              <li key={table.id}>
                <button
                  type="button"
                  aria-pressed={choice === table.label}
                  onClick={() => setChoice(table.label)}
                  className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-olive-line px-3 text-left text-sm font-semibold text-olive"
                >
                  {table.label}
                  <span className="font-medium text-olive-muted">{table.seats} pers.</span>
                </button>
              </li>
            ))}
          </ul>
          <Button type="button" className="h-12" disabled={pending || !choice} onClick={() => void run("assign", choice)}>
            Confirmar asignación
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent>
          <DialogTitle>¿Finalizar atención?</DialogTitle>
          <DialogDescription>
            Vas a finalizar la atención de {item.customerName}
            {item.tableLabel ? `, mesa ${item.tableLabel}` : ""}. La mesa deja de estar apartada para esta reserva.
          </DialogDescription>
          <div className="flex flex-col gap-2">
            <Button type="button" variant="secondary" className="h-12" onClick={() => setFinishOpen(false)}>
              Volver
            </Button>
            <Button type="button" className="h-12" disabled={pending} onClick={() => void run("complete")}>
              Confirmar finalización
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  )
}

export { ServiceBoardView }
