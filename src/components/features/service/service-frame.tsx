"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardListIcon } from "lucide-react"

import { NotificationBell } from "@/components/features/admin/reservations/notification-bell"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import { cn } from "cn"

import "../admin/admin-shell.css"

function ServiceFrame({
  who,
  email,
  roleLabel,
  children,
}: {
  who: string
  email: string
  roleLabel: string
  children: ReactNode
}) {
  const pathname = usePathname()
  const attention = pathname.startsWith("/admin/atencion")
  return (
    <div className="min-h-svh bg-olive text-foreground">
      <header className="sticky top-0 z-40 flex h-[4.25rem] items-center gap-3 bg-olive px-4 text-cream">
        <Logo size={36} alt="PIÙ" className="rounded-full" />
        <p className="min-w-0 flex-1 truncate font-heading text-lg leading-none font-extrabold tracking-tight">
          PIÙ <span className="font-semibold text-cream/80">Atención</span>
        </p>
        <NotificationBell reservationPath={(id) => `/admin/atencion?id=${id}`} />
        <AccountButton who={who} email={email} roleLabel={roleLabel} />
      </header>
      <main className="admin-sheet min-w-0 rounded-t-[1.75rem] px-3.5 pt-4 pb-28">{children}</main>
      <nav
        aria-label="Atención"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-olive-line bg-cream px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))]"
      >
        <Link
          href="/admin/atencion"
          aria-current={attention ? "page" : undefined}
          className={cn(
            "mx-auto flex h-14 max-w-sm flex-col items-center justify-center gap-0.5 text-xs font-semibold",
            attention ? "text-olive" : "text-olive-muted",
          )}
        >
          <ClipboardListIcon aria-hidden className="size-5" />
          Atención
        </Link>
      </nav>
    </div>
  )
}

function AccountButton({ who, email, roleLabel }: { who: string; email: string; roleLabel: string }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const initials = (who || email || "P").slice(0, 1).toLocaleUpperCase("es-CL")

  async function logout() {
    if (pending) return
    setPending(true)
    try {
      await fetch("/admin/session", { method: "DELETE", headers: { [adminRequestHeader]: adminRequestValue } })
    } finally {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- recarga completa para borrar la sesión
      window.location.assign("/admin/login")
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="flex size-11 items-center justify-center rounded-full text-sm font-extrabold text-olive" aria-label="Mi cuenta">
          <span className="flex size-10 items-center justify-center rounded-full border border-cream/40 bg-cream">{initials}</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="admin-sheet gap-0 rounded-t-[1.75rem] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <span aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-olive/15" />
        <SheetTitle className="font-heading text-base text-olive">Mi cuenta</SheetTitle>
        <SheetDescription className="sr-only">Nombre, correo, rol y cierre de sesión</SheetDescription>
        <div className="mt-4 flex flex-col gap-4">
          <div className="min-w-0">
            {who ? <p className="truncate font-heading text-base font-bold text-olive">{who}</p> : null}
            {email ? <p className="truncate text-sm text-olive-muted">{email}</p> : null}
            <p className="text-xs font-semibold tracking-wide text-terracotta uppercase">{roleLabel}</p>
          </div>
          <Button type="button" variant="secondary" className="w-full" loading={pending} onClick={() => void logout()}>
            Cerrar sesión
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { ServiceFrame }
