"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import { cn } from "@/lib/utils"

type Notice = {
  id: string
  type: string
  reservationId: string
  title: string
  body: string
  at: string
  unread: boolean
}

const soundKey = "piu-notice-sound"
const seenKey = "piu-notice-seen"

function relativeTime(iso: string, now = Date.now()) {
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return ""
  const minutes = Math.max(0, Math.round((now - then) / 60000))
  if (minutes < 1) return "Hace un momento"
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  return new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" }).format(then)
}

const bannerMs = 120_000

let sharedAudio: AudioContext | null = null

function audioContext() {
  sharedAudio ??= new AudioContext()
  return sharedAudio
}

function unlockAudio() {
  const context = audioContext()
  if (context.state === "suspended") void context.resume()
}

function chime() {
  let context: AudioContext
  try {
    context = audioContext()
  } catch {
    return
  }
  if (context.state === "suspended") return
  const now = context.currentTime
  for (const [index, frequency] of [784, 988, 784].entries()) {
    const tone = context.createOscillator()
    const gain = context.createGain()
    const start = now + index * 0.16
    tone.type = "sine"
    tone.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.07, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28)
    tone.connect(gain)
    gain.connect(context.destination)
    tone.start(start)
    tone.stop(start + 0.3)
  }
}

const visiblePollMs = 25_000
const hiddenPollMs = 120_000

function NotificationBell({ reservationPath = (id: string) => `/admin/reservas?id=${id}` }: { reservationPath?: (id: string) => string } = {}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notices, setNotices] = useState<Notice[]>([])
  const [unread, setUnread] = useState(0)
  const [banner, setBanner] = useState<Notice | null>(null)
  const [sound, setSound] = useState(() => window.localStorage.getItem(soundKey) !== "0")
  const primed = useRef(false)
  const hideBanner = useRef<number | null>(null)

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/reservations/notifications", { cache: "no-store" })
    if (!response.ok) return
    const body = (await response.json()) as { notices?: Notice[]; unread?: number }
    const next = body.notices ?? []
    setNotices(next)
    setUnread(body.unread ?? 0)
    const fresh = next.find((item) => item.unread)
    if (!primed.current) {
      primed.current = true
      if (fresh) window.sessionStorage.setItem(seenKey, fresh.id)
      return
    }
    const seen = window.sessionStorage.getItem(seenKey)
    if (fresh && fresh.id !== seen) {
      window.sessionStorage.setItem(seenKey, fresh.id)
      setBanner(fresh)
      if (hideBanner.current) window.clearTimeout(hideBanner.current)
      hideBanner.current = window.setTimeout(() => setBanner(null), bannerMs)
      if (window.localStorage.getItem(soundKey) !== "0") chime()
    }
  }, [])

  useEffect(() => {
    // Con la pestaña a la vista se consulta cada 25 s. En segundo plano, cada 2 minutos:
    // el aviso sigue llegando, pero cada consulta lee Firestore y un panel olvidado abierto
    // no debe consultar todo el día al mismo ritmo.
    let timer: number | undefined
    function schedule() {
      window.clearTimeout(timer)
      timer = window.setTimeout(async () => {
        try {
          await load()
        } catch {
          // Un corte de red no detiene los avisos: se reintenta en el siguiente turno.
        } finally {
          schedule()
        }
      }, document.hidden ? hiddenPollMs : visiblePollMs)
    }
    function onVisibility() {
      if (document.hidden) {
        schedule()
        return
      }
      void load()
      schedule()
    }
    const started = window.setTimeout(() => void load(), 0)
    schedule()
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("pointerdown", unlockAudio)
    return () => {
      window.clearTimeout(started)
      window.clearTimeout(timer)
      if (hideBanner.current) window.clearTimeout(hideBanner.current)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pointerdown", unlockAudio)
    }
  }, [load])

  async function mark(ids: string[]) {
    if (ids.length === 0) return
    await fetch("/api/admin/reservations/notifications", {
      method: "POST",
      headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
      body: JSON.stringify({ ids }),
    })
    await load()
  }

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          "relative inline-flex size-11 items-center justify-center rounded-full bg-status-good-solid text-cream",
          unread > 0 && "admin-bell-pulse",
        )}
        aria-expanded={open}
        aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
        onClick={() => {
          setSound(window.localStorage.getItem(soundKey) !== "0")
          setOpen((current) => !current)
        }}
      >
        <Bell aria-hidden className="size-5" />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[10px] font-bold text-cream">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="fixed inset-x-3 top-[4.75rem] z-50 flex max-h-[70svh] min-w-0 flex-col overflow-hidden rounded-2xl border border-olive-line bg-[#f3f1e6] text-olive shadow-lift lg:absolute lg:inset-x-auto lg:top-full lg:right-0 lg:mt-2 lg:w-[22rem]">
          <div className="flex items-center justify-between gap-2 px-3 py-3">
            <p className="min-w-0 font-heading text-base font-bold">Avisos</p>
            <button
              type="button"
              className="min-h-11 text-xs font-semibold text-olive-muted"
              onClick={() => {
                const next = !sound
                setSound(next)
                window.localStorage.setItem(soundKey, next ? "1" : "0")
              }}
            >
              Sonido {sound ? "activo" : "apagado"}
            </button>
          </div>
          <ul className="flex flex-col gap-1 overflow-y-auto px-2 pb-2">
            {notices.length === 0 ? <li className="px-2 py-6 text-center text-sm text-olive-muted">No hay avisos recientes.</li> : null}
            {notices.map((notice) => (
              <li key={notice.id}>
                <button
                  type="button"
                  className={cn("flex w-full min-h-11 flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left", notice.unread ? "bg-cream" : "bg-transparent")}
                  onClick={() => {
                    void mark([notice.id])
                    setOpen(false)
                    if (notice.reservationId) router.push(reservationPath(notice.reservationId))
                  }}
                >
                  <span className="font-heading text-sm font-bold break-words">{notice.title}</span>
                  <span className="text-sm text-olive-strong break-words">{notice.body}</span>
                  <span className="text-xs text-olive-muted">{relativeTime(notice.at)}</span>
                </button>
              </li>
            ))}
          </ul>
          {unread > 0 ? (
            <Button type="button" variant="ghost" className="h-11" onClick={() => void mark(notices.filter((item) => item.unread).map((item) => item.id))}>
              Marcar leídas
            </Button>
          ) : null}
        </div>
      ) : null}
      {banner && !open ? (
        <button
          type="button"
          className="fixed inset-x-3 top-[4.75rem] z-50 flex min-h-11 min-w-0 origin-top flex-col items-start gap-0.5 rounded-2xl border border-olive-line bg-popover px-4 py-3 text-left text-olive shadow-lift motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-3 motion-safe:duration-300 lg:absolute lg:inset-x-auto lg:top-full lg:right-0 lg:mt-2 lg:w-[20rem]"
          role="status"
          onClick={() => {
            setBanner(null)
            void mark([banner.id])
            setOpen(false)
            if (banner.reservationId) router.push(reservationPath(banner.reservationId))
          }}
        >
          <span className="font-heading text-sm font-bold break-words">{banner.title}</span>
          <span className="text-sm text-olive-strong break-words">{banner.body}</span>
        </button>
      ) : null}
    </div>
  )
}

export { NotificationBell }
