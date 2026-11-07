"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { MenuIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { adminNav, canViewSection, type AdminSection } from "@/lib/auth/permissions"
import type { StaffRole } from "@/lib/auth/roles"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import { cn } from "cn"

type AdminFrameProps = {
  email: string
  displayName: string
  role: StaffRole
  roleLabel: string
  children: ReactNode
}

function AdminFrame({ email, displayName, role, roleLabel, children }: AdminFrameProps) {
  const items = adminNav.filter((item) => canViewSection(role, item.section))
  const who = displayName || email || "Cuenta del equipo"

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden min-h-svh flex-col border-r border-olive-line bg-surface-raised md:flex">
          <Brand />
          <AdminNav items={items} />
          <Account who={who} email={email} roleLabel={roleLabel} />
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-olive-line bg-background px-4 py-3 md:hidden">
            <MobileNav items={items} who={who} email={email} roleLabel={roleLabel} />
            <Logo size={36} alt="PIÙ" />
            <p className="min-w-0 flex-1 truncate font-heading text-sm font-bold">Panel</p>
            <LogoutButton compact />
          </header>
          <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3 px-4 py-5">
      <Logo size={40} alt="" />
      <span className="font-heading text-lg font-extrabold tracking-tight">PIÙ</span>
    </Link>
  )
}

function AdminNav({
  items,
  onNavigate,
}: {
  items: readonly { href: string; section: AdminSection; label: string; ready: boolean }[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav aria-label="Secciones del panel" className="flex flex-1 flex-col gap-1 px-3">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 text-sm font-semibold",
              active ? "bg-olive text-cream" : "text-foreground hover:bg-olive-hover"
            )}
          >
            <span>{item.label}</span>
            {item.ready ? null : <span className={cn("text-xs font-medium", active ? "text-cream" : "text-olive-muted")}>Pronto</span>}
          </Link>
        )
      })}
    </nav>
  )
}

function Account({ who, email, roleLabel }: { who: string; email: string; roleLabel: string }) {
  return (
    <div className="mt-auto flex flex-col gap-3 border-t border-olive-line p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{who}</p>
        {email && who !== email ? <p className="truncate text-xs text-olive-muted">{email}</p> : null}
        <p className="mt-1 text-xs font-semibold tracking-wide text-terracotta uppercase">{roleLabel}</p>
      </div>
      <LogoutButton />
      <Link href="/" className="text-sm font-semibold text-olive-muted underline-offset-4 hover:text-foreground hover:underline">
        Ver el sitio
      </Link>
    </div>
  )
}

function LogoutButton({ compact = false }: { compact?: boolean }) {
  const [pending, setPending] = useState(false)

  async function logout() {
    if (pending) return
    setPending(true)
    try {
      await fetch("/admin/session", {
        method: "DELETE",
        headers: { [adminRequestHeader]: adminRequestValue },
      })
    } finally {
      // Sin esto el panel cacheado seguiría en pantalla después de borrar la cookie.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- recarga completa para borrar la sesión
      window.location.assign("/admin/login")
    }
  }

  return (
    <Button
      type="button"
      variant={compact ? "ghost" : "secondary"}
      className={compact ? "px-3" : "w-full"}
      loading={pending}
      onClick={logout}
    >
      {compact ? "Salir" : "Cerrar sesión"}
    </Button>
  )
}

function MobileNav({
  items,
  who,
  email,
  roleLabel,
}: {
  items: readonly { href: string; section: AdminSection; label: string; ready: boolean }[]
  who: string
  email: string
  roleLabel: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="secondary" size="icon" aria-label="Abrir menú">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100%,20rem)] bg-background">
        <SheetTitle className="sr-only">Menú del panel</SheetTitle>
        <SheetDescription className="sr-only">Secciones y cierre de sesión</SheetDescription>
        <div className="flex h-full flex-col pt-8">
          <Brand />
          <AdminNav items={items} onNavigate={() => setOpen(false)} />
          <Account who={who} email={email} roleLabel={roleLabel} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { AdminFrame }
