"use client"

import { useEffect, useRef, useState } from "react"

import { ReservationStatusCard } from "@/components/features/reservations/reservation-status-card"
import { ReservationStatusLookup } from "@/components/features/reservations/reservation-status-lookup"
import type { PublicReservationStatus } from "@/lib/reservations/tracking-link"

const storageKey = "piu.reservation.tracking"
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
      if (response.status === 404 || response.status === 400) {
        forget()
        shown.current = null
        setStatus(null)
        setCheckedAt("")
        setError(message)
        return
      }
      if (refreshing && shown.current) {
        setRefreshError("No pudimos actualizar. Lo que ves es de la consulta anterior, no de este intento.")
        return
      }
      setError(message)
    } catch {
      if (refreshing && shown.current) {
        setRefreshError("No pudimos actualizar. Lo que ves es de la consulta anterior, no de este intento.")
        return
      }
      setError("No pudimos consultar. Revisa tu conexión e inténtalo otra vez.")
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    const initial = credentialFromLocation()
    if (initial.rejectedQuery) {
      queueMicrotask(() => setError("Ese enlace no sirve: el secreto tiene que ir después del #. Ábrelo tal como lo guardaste."))
      return
    }
    if (!initial.credential) return
    secret.current = initial.credential
    remember(initial.credential)
    queueMicrotask(() => {
      void consult(initial.credential, false)
    })
  }, [])

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-xl flex-col gap-6">
      <header>
        <p className="font-label text-xs font-semibold tracking-wide text-terracotta uppercase">PIÙ Pizza & Dolce</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-olive">Consulta tu reserva</h1>
        <p className="mt-3 text-base text-olive-strong">Revisa el estado de tu solicitud en PIÙ Pizza & Dolce.</p>
        <p className="mt-2 text-sm text-olive-muted">Tu mesa estará reservada únicamente cuando el restaurante confirme tu solicitud.</p>
      </header>
      {status && checkedAt ? (
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
