import type { StaffRole } from "@/lib/auth/roles"

const adminSections = ["inicio", "reservas", "mesas", "carta", "configuracion", "personal"] as const

type AdminSection = (typeof adminSections)[number]

const sectionRoles: Record<AdminSection, readonly StaffRole[]> = {
  inicio: ["superadmin", "admin"],
  reservas: ["superadmin", "admin"],
  mesas: ["superadmin", "admin"],
  carta: ["superadmin", "admin"],
  configuracion: ["superadmin"],
  personal: ["superadmin"],
}

const adminNav = [
  { href: "/admin", section: "inicio", label: "Inicio", ready: true },
  { href: "/admin/reservas", section: "reservas", label: "Reservas", ready: false },
  { href: "/admin/mesas", section: "mesas", label: "Mesas", ready: false },
  { href: "/admin/carta", section: "carta", label: "Carta", ready: false },
  { href: "/admin/configuracion", section: "configuracion", label: "Configuración", ready: false },
  { href: "/admin/personal", section: "personal", label: "Personal", ready: false },
] as const

function canViewSection(role: StaffRole, section: AdminSection) {
  return sectionRoles[section].includes(role)
}

function roleLabel(role: StaffRole) {
  return role === "superadmin" ? "Propietario" : "Administración"
}

export { adminNav, adminSections, canViewSection, roleLabel }
export type { AdminSection }
