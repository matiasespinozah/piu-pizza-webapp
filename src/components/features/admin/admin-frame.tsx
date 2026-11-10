"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { BookOpenIcon, CalendarDaysIcon, HomeIcon, SettingsIcon, UserRoundIcon, UtensilsCrossedIcon, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { adminNav, canViewSection, type AdminSection } from "@/lib/auth/permissions"
import type { StaffRole } from "@/lib/auth/roles"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import { cn } from "cn"

type NavItem = { href: string; section: AdminSection; label: string; ready: boolean }

const sectionIcon: Record<AdminSection, LucideIcon> = {
  inicio: HomeIcon,
  reservas: CalendarDaysIcon,
  mesas: UtensilsCrossedIcon,
  carta: BookOpenIcon,
  configuracion: SettingsIcon,
  personal: UserRoundIcon,
}

const sectionTitle: Record<AdminSection, string> = {
  inicio: "Inicio",
  reservas: "Reservas",
  mesas: "Mesas",
  carta: "Carta",
  configuracion: "Configuración",
  personal: "Personal",
}

type AdminFrameProps = {
  email: string
  displayName: string
  role: StaffRole
  roleLabel: string
  children: ReactNode
}

function AdminFrame({ email, displayName, role, roleLabel, children }: AdminFrameProps) {
  const pathname = usePathname()
  const items = adminNav.filter((item) => canViewSection(role, item.section))
  const barItems = items.filter((item) => item.section !== "personal")
  const who = displayName || email || "Cuenta del equipo"
  const current = sectionOf(pathname)

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-svh flex-col bg-olive text-cream md:flex">
          <Brand />
          <AdminNav items={items} pathname={pathname} />
          <Account who={who} email={email} roleLabel={roleLabel} />
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-olive px-4 text-cream md:hidden">
            <Logo size={32} alt="" />
            <div className="min-w-0 flex-1">
              <p className="font-heading text-base leading-none font-extrabold tracking-tight">PIÙ</p>
              <p className="mt-0.5 truncate text-xs text-cream/70">{sectionTitle[current]}</p>
            </div>
            <AccountSheet who={who} email={email} roleLabel={roleLabel} />
          </header>
          <main className="min-w-0 px-4 py-5 pb-28 sm:px-6 md:py-8 md:pb-8">{children}</main>
          <BottomNav items={barItems} pathname={pathname} />
        </div>
      </div>
    </div>
  )
}

function sectionOf(pathname: string): AdminSection {
  if (pathname.startsWith("/admin/reservas")) return "reservas"
  if (pathname.startsWith("/admin/mesas")) return "mesas"
  if (pathname.startsWith("/admin/carta")) return "carta"
  if (pathname.startsWith("/admin/configuracion")) return "configuracion"
  if (pathname.startsWith("/admin/personal")) return "personal"
  return "inicio"
}

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3 px-4 py-5">
      <Logo size={40} alt="" />
      <span className="min-w-0">
        <span className="block font-heading text-lg leading-none font-extrabold tracking-tight">PIÙ</span>
        <span className="mt-1 block text-xs text-cream/70">Admin</span>
      </span>
    </Link>
  )
}

function AdminNav({ items, pathname }: { items: readonly NavItem[]; pathname: string }) {
  return (
    <nav aria-label="Secciones del panel" className="flex flex-1 flex-col gap-1 px-3">
      {items.map((item) => {
        const active = isActive(pathname, item.href)
        const Icon = sectionIcon[item.section]
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold",
              active ? "bg-cream text-olive" : "text-cream/85 hover:bg-cream/10",
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">{item.label}</span>
            {item.ready ? null : <span className={cn("text-xs font-medium", active ? "text-olive-muted" : "text-cream/60")}>Pronto</span>}
          </Link>
        )
      })}
    </nav>
  )
}

function BottomNav({ items, pathname }: { items: readonly NavItem[]; pathname: string }) {
  return (
    <nav
      aria-label="Secciones del panel"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-olive-line bg-surface-raised pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = isActive(pathname, item.href)
          const Icon = sectionIcon[item.section]
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[0.6875rem] font-semibold",
                  active ? "text-terracotta" : "text-olive-muted",
                )}
              >
                <span className={cn("flex size-8 items-center justify-center rounded-xl", active && "bg-terracotta/15")}>
                  <Icon aria-hidden className="size-5" />
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function Account({ who, email, roleLabel }: { who: string; email: string; roleLabel: string }) {
  return (
    <div className="mt-auto flex flex-col gap-3 border-t border-cream/15 p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{who}</p>
        {email && who !== email ? <p className="truncate text-xs text-cream/70">{email}</p> : null}
        <p className="mt-1 text-xs font-semibold tracking-wide text-terracotta-soft uppercase">{roleLabel}</p>
      </div>
      <LogoutButton onDark />
      <Link href="/" className="text-sm font-semibold text-cream/70 underline-offset-4 hover:text-cream hover:underline">
        Ver el sitio
      </Link>
    </div>
  )
}

function AccountSheet({ who, email, roleLabel }: { who: string; email: string; roleLabel: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="text-cream hover:bg-cream/10" aria-label="Cuenta del equipo">
          <UserRoundIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(100%,20rem)] bg-background">
        <SheetTitle className="font-heading text-xl">Cuenta</SheetTitle>
        <SheetDescription className="sr-only">Datos de la sesión y cierre</SheetDescription>
        <div className="mt-6 flex flex-col gap-3">
          <p className="font-semibold text-olive">{who}</p>
          {email ? <p className="text-sm text-olive-muted">{email}</p> : null}
          <p className="text-xs font-semibold tracking-wide text-terracotta uppercase">{roleLabel}</p>
          <LogoutButton />
          <Link href="/" className="text-sm font-semibold text-olive underline-offset-4 hover:underline">
            Ver el sitio
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function LogoutButton({ onDark = false }: { onDark?: boolean }) {
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
      variant="secondary"
      className={cn("w-full", onDark && "border-transparent bg-cream text-olive hover:bg-cream/90")}
      loading={pending}
      onClick={logout}
    >
      Cerrar sesión
    </Button>
  )
}

export { AdminFrame }
