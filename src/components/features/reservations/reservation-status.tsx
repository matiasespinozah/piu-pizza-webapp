"use client"

import { useEffect, useRef, useState } from "react"

import { ReservationStatusCard } from "@/components/features/reservations/reservation-status-card"
import { ReservationStatusLookup } from "@/components/features/reservations/reservation-status-lookup"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { reservationStatusWhatsappMessage } from "@/lib/reservations/configuration"
import type { PublicReservationStatus } from "@/lib/reservations/tracking-link"

const storageKey = "piu.reservation.tracking"
const statusWhatsappHref = `https://wa.me/56928873619?text=${encodeURIComponent(reservationStatusWhatsappMessage)}`
let capturedSecret = ""

type StatusResponse = { ok: true; status: PublicReservationStatus } | { ok: false; message?: string }

function checkedLabel(date: Date) {
  return new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" }).format(date)
}

function remember(token: string) {
  capturedSecret = token
  try {
    sessionStorage.setItem(storageKey, token)
  } catch {
    // La sesión sigue en memoria. El enlace guardado vuelve a abrir la consulta.
  }
}

function remembered() {
  if (capturedSecret) return capturedSecret
  try {
    return sessionStorage.getItem(storageKey) ?? ""
  } catch {
    return ""
  }
}

function forget() {
  capturedSecret = ""
  try {
    sessionStorage.removeItem(storageKey)
  } catch {
    // Si el navegador bloquea el almacenamiento, la memoria ya quedó vacía.
  }
}

function credentialFromLocation() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : ""
  const hadQuery = window.location.search.length > 0
  if (hash || hadQuery) window.history.replaceState(null, "", window.location.pathname)
  let credential = ""
  if (hash) {
    try {
      credential = decodeURIComponent(hash)
    } catch {
      credential = hash
    }
  } else if (!hadQuery) {
    credential = remembered()
  }
  return { credential, rejectedQuery: hadQuery && !hash }
}

function ReservationStatus() {
  const secret = useRef("")
  const shown = useRef<PublicReservationStatus | null>(null)
  const [status, setStatus] = useState<PublicReservationStatus | null>(null)
  const [checkedAt, setCheckedAt] = useState("")
  const [paste, setPaste] = useState("")
  const [error, setError] = useState("")
  const [refreshError, setRefreshError] = useState("")
  const [pending, setPending] = useState(false)
  const [checking, setChecking] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  async function consult(credential: string, refreshing: boolean) {
    const value = credential.trim()
    if (!value) {
      setError("Pega el enlace completo de seguimiento.")
      return
    }
    setPending(true)
    if (!refreshing) setError("")
    setRefreshError("")
    try {
      const response = await fetch("/api/reservations/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ credential: value }),
      })
      const body = (await response.json().catch(() => null)) as StatusResponse | null
      if (response.ok && body && body.ok && "status" in body) {
        secret.current = value
        remember(value)
        shown.current = body.status
        setStatus(body.status)
        setCheckedAt(checkedLabel(new Date()))
        setPaste("")
        setError("")
        setRefreshError("")
        return
      }
      const message = body && "message" in body && body.message ? body.message : "No pudimos consultar el estado."
      if (response.status === 503) {
        setUnavailable(true)
        return
      }
      if (response.status === 404 || response.status === 400) {
        forget()
        shown.current = null
        setStatus(null)
        setCheckedAt("")
        setError(message)
        return
      }
      if (refreshing && shown.current) {
        setRefreshError("No pudimos actualizar. Mostramos la última consulta.")
        return
      }
      setError(message)
    } catch {
      if (refreshing && shown.current) {
        setRefreshError("No pudimos actualizar. Mostramos la última consulta.")
        return
      }
      setError("No pudimos consultar. Revisa tu conexión e inténtalo otra vez.")
    } finally {
      setPending(false)
      setChecking(false)
    }
  }

  useEffect(() => {
    const initial = credentialFromLocation()
    if (initial.rejectedQuery) {
      queueMicrotask(() => {
        setError("Ese enlace está incompleto. Ábrelo tal como lo guardaste.")
        setChecking(false)
      })
      return
    }
    if (!initial.credential) {
      queueMicrotask(() => setChecking(false))
      return
    }
    secret.current = initial.credential
    remember(initial.credential)
    queueMicrotask(() => {
      void consult(initial.credential, false)
    })
  }, [])

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="font-label text-xs font-semibold tracking-[0.14em] text-terracotta uppercase">PIÙ Pizza & Dolce</p>
        <h1 className="font-heading text-4xl leading-none font-extrabold tracking-tight text-olive">Tu reserva</h1>
      </header>
      {unavailable ? (
        <div className="reservation-status-in flex flex-col gap-4 rounded-[1.75rem] border border-olive-line bg-surface-raised px-5 py-6 shadow-lift sm:px-7">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-xl font-bold text-olive">Seguimiento no disponible</h2>
            <p className="text-base text-olive-strong">Por ahora consulta tu reserva por WhatsApp. Te respondemos rápido.</p>
          </div>
          <Button asChild variant="accent" size="lg" className="w-full">
            <a href={statusWhatsappHref} target="_blank" rel="noopener noreferrer">
              Escribir por WhatsApp
            </a>
          </Button>
        </div>
      ) : checking ? (
        <div
          role="status"
          aria-label="Buscando tu reserva"
          className="overflow-hidden rounded-[1.75rem] border border-olive-line bg-surface-raised shadow-lift"
        >
          <div className="flex flex-col gap-4 bg-olive-hover px-5 pt-5 pb-6 sm:px-7">
            <Skeleton className="h-7 w-28 rounded-full" />
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-2xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 px-5 py-6 sm:px-7">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>
      ) : status && checkedAt ? (
        <ReservationStatusCard
          status={status}
          checkedAt={checkedAt}
          refreshing={pending}
          refreshError={refreshError}
          onRefresh={() => void consult(secret.current, true)}
        />
      ) : (
        <ReservationStatusLookup
          value={paste}
          error={error}
          pending={pending}
          onChange={setPaste}
          onSubmit={() => void consult(paste, false)}
        />
      )}
    </div>
  )
}

export { ReservationStatus }
