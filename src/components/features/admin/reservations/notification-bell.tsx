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

function chime() {
  const context = new AudioContext()
  const tone = context.createOscillator()
  const gain = context.createGain()
  tone.frequency.value = 740
  gain.gain.value = 0.04
  tone.connect(gain)
  gain.connect(context.destination)
  tone.start()
  tone.stop(context.currentTime + 0.12)
  window.setTimeout(() => void context.close(), 300)
}

function NotificationBell({ tone = "cream" }: { tone?: "cream" | "olive" }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notices, setNotices] = useState<Notice[]>([])
  const [unread, setUnread] = useState(0)
  const [toast, setToast] = useState("")
  const [sound, setSound] = useState(false)
  const primed = useRef(false)

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/reservations/notifications", { cache: "no-store" })
    if (!response.ok) return
    const body = (await response.json()) as { notices?: Notice[]; unread?: number }
    const next = body.notices ?? []
    setNotices(next)
    setUnread(body.unread ?? 0)
    const fresh = next.find((item) => item.unread && (item.type === "created" || item.type === "upcoming"))
    if (!primed.current) {
      primed.current = true
      if (fresh) window.sessionStorage.setItem(seenKey, fresh.id)
      return
    }
    const seen = window.sessionStorage.getItem(seenKey)
    if (fresh && fresh.id !== seen) {
      window.sessionStorage.setItem(seenKey, fresh.id)
      setToast(`${fresh.title}. ${fresh.body}`)
      if (window.localStorage.getItem(soundKey) === "1") chime()
      window.setTimeout(() => setToast(""), 5000)
    }
  }, [])

  useEffect(() => {
    const started = window.setTimeout(() => void load(), 0)
    const timer = window.setInterval(() => void load(), 25000)
    return () => {
      window.clearTimeout(started)
      window.clearInterval(timer)
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
          "relative inline-flex size-11 items-center justify-center rounded-full",
          tone === "cream" ? "text-cream" : "bg-olive text-cream",
        )}
        aria-expanded={open}
        aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
        onClick={() => {
          setSound(window.localStorage.getItem(soundKey) === "1")
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
        <div className="absolute right-0 z-50 mt-2 flex max-h-[70svh] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-olive-line bg-[#f3f1e6] text-olive shadow-lift">
          <div className="flex items-center justify-between gap-2 px-3 py-3">
            <p className="font-heading text-base font-bold">Avisos</p>
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
                    if (notice.reservationId) router.push(`/admin/reservas?id=${notice.reservationId}`)
                  }}
                >
                  <span className="font-heading text-sm font-bold">{notice.title}</span>
                  <span className="text-sm text-olive-strong">{notice.body}</span>
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
      {toast ? (
        <p className="fixed right-3 bottom-24 z-50 max-w-xs rounded-2xl bg-olive px-4 py-3 text-sm text-cream shadow-lift lg:bottom-6" role="status">
          {toast}
        </p>
      ) : null}
    </div>
  )
}

export { NotificationBell }
