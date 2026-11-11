"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { BookOpenIcon, CalendarDaysIcon, CalendarRangeIcon, HomeIcon, SettingsIcon, UserRoundIcon, UtensilsCrossedIcon, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Logo } from "@/components/ui/logo"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { adminNav, canViewSection, type AdminSection } from "@/lib/auth/permissions"
import type { StaffRole } from "@/lib/auth/roles"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import { cn } from "cn"
import { NotificationBell } from "@/components/features/admin/reservations/notification-bell"

import "./admin-shell.css"

type NavItem = { href: string; section: AdminSection; label: string; ready: boolean; exact?: boolean; icon?: LucideIcon }

const sectionIcon: Record<AdminSection, LucideIcon> = {
  inicio: HomeIcon,
  reservas: CalendarDaysIcon,
  mesas: UtensilsCrossedIcon,
  carta: BookOpenIcon,
  configuracion: SettingsIcon,
  personal: UserRoundIcon,
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
  const sideItems = sidebarItems(items)
  const who = displayName || email || "Cuenta del equipo"

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-svh flex-col bg-olive text-cream lg:flex">
          <Brand />
          <AdminNav items={sideItems} pathname={pathname} />
          <AccountMenu who={who} email={email} roleLabel={roleLabel} />
        </aside>

        <div className="min-w-0 bg-olive lg:bg-[#f3f1e6]">
          <header className="sticky top-0 z-40 flex h-[4.25rem] items-center gap-3 bg-olive px-4 text-cream lg:hidden">
            <Logo size={36} alt="PIÙ" className="rounded-full" />
            <p className="min-w-0 flex-1 truncate font-heading text-lg leading-none font-extrabold tracking-tight">
              PIÙ <span className="font-semibold text-cream/80">Admin</span>
            </p>
            <NotificationBell />
            <AccountSheet who={who} email={email} roleLabel={roleLabel} />
          </header>
          <div className="sticky top-0 z-30 hidden items-center justify-end gap-3 px-8 py-3 lg:flex">
            <NotificationBell tone="olive" />
          </div>
          <main className="admin-sheet min-w-0 rounded-t-[1.75rem] px-3.5 pt-4 pb-28 lg:rounded-none lg:px-8 lg:py-8 lg:pb-10 lg:pt-0">{children}</main>
          <BottomNav items={barItems} pathname={pathname} />
        </div>
      </div>
    </div>
  )
}

function sidebarItems(items: readonly NavItem[]) {
  return items.flatMap((item) => {
    if (item.section !== "reservas") return [item]
    return [
      { ...item, exact: true },
      {
        href: "/admin/reservas/disponibilidad",
        section: "reservas" as const,
        label: "Disponibilidad",
        ready: true,
        exact: true,
        icon: CalendarRangeIcon,
      },
    ]
  })
}

function isActive(pathname: string, href: string, exact = false) {
  if (href === "/admin") return pathname === "/admin"
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3 px-4 py-5">
      <Logo size={40} alt="" />
      <span className="min-w-0">
        <span className="block font-heading text-lg leading-none font-extrabold tracking-tight">PIÙ</span>
        <span className="mt-1 block text-xs text-cream/70">Administración</span>
      </span>
    </Link>
  )
}

function AdminNav({ items, pathname }: { items: readonly NavItem[]; pathname: string }) {
  return (
    <nav aria-label="Secciones del panel" className="flex flex-1 flex-col gap-1 px-3">
      {items.map((item) => {
        const active = isActive(pathname, item.href, item.exact)
        const Icon = item.icon ?? sectionIcon[item.section]
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
      className="admin-sheet fixed inset-x-0 bottom-0 z-40 border-t border-olive-line/70 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(43,52,31,0.06)] lg:hidden"
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
                  "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 px-0.5 text-center text-[0.625rem] leading-tight font-semibold",
                  active ? "text-olive" : "text-olive-muted",
                )}
              >
                <span className={cn("flex h-8 min-w-12 items-center justify-center rounded-2xl px-2", active && "bg-olive text-cream")}>
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

function accountIdentity(who: string, email: string) {
  const name = who && who !== email ? who : ""
  const source = name || email || "PIÙ"
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  const initials = `${parts[0]?.[0] ?? "P"}${parts[1]?.[0] ?? ""}`.toLocaleUpperCase("es-CL")
  return { name, email, initials }
}

function AccountAvatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-cream font-heading text-sm font-extrabold text-olive", className)}>
      {initials}
    </span>
  )
}

function AccountPanel({ who, email, roleLabel }: { who: string; email: string; roleLabel: string }) {
  const identity = accountIdentity(who, email)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <AccountAvatar initials={identity.initials} />
        <div className="min-w-0">
          {identity.name ? <p className="truncate font-heading text-base font-bold text-olive">{identity.name}</p> : null}
          {identity.email ? <p className="truncate text-sm text-olive-muted">{identity.email}</p> : null}
          <p className="text-xs font-semibold tracking-wide text-terracotta uppercase">{roleLabel}</p>
        </div>
      </div>
      <LogoutButton />
      <Link href="/" className="inline-flex h-11 items-center justify-center text-sm font-semibold text-olive">
        Ver el sitio
      </Link>
    </div>
  )
}

function AccountMenu({ who, email, roleLabel }: { who: string; email: string; roleLabel: string }) {
  const identity = accountIdentity(who, email)
  return (
    <div className="mt-auto border-t border-cream/15 p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
            aria-label="Mi cuenta"
          >
            <AccountAvatar initials={identity.initials} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="admin-sheet min-w-72 rounded-2xl p-4">
          <AccountPanel who={who} email={email} roleLabel={roleLabel} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function AccountSheet({ who, email, roleLabel }: { who: string; email: string; roleLabel: string }) {
  const [open, setOpen] = useState(false)
  const identity = accountIdentity(who, email)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
          aria-label="Mi cuenta"
        >
          <AccountAvatar initials={identity.initials} className="border border-cream/40" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="admin-sheet gap-0 rounded-t-[1.75rem] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <span aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-olive/15" />
        <SheetTitle className="font-heading text-base text-olive">Mi cuenta</SheetTitle>
        <SheetDescription className="sr-only">Nombre, correo, rol y cierre de sesión</SheetDescription>
        <div className="mt-4">
          <AccountPanel who={who} email={email} roleLabel={roleLabel} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function LogoutButton() {
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
      className="w-full"
      loading={pending}
      onClick={logout}
    >
      Cerrar sesión
    </Button>
  )
}

export { AdminFrame }
