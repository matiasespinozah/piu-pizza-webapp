import type { StaffRole } from "@/lib/auth/roles"

const adminSections = ["inicio", "reservas", "mesas", "carta", "configuracion", "personal", "atencion"] as const

type AdminSection = (typeof adminSections)[number]
type GateSection = AdminSection | "metricas"

const sectionRoles: Record<GateSection, readonly StaffRole[]> = {
  inicio: ["superadmin", "admin"],
  reservas: ["superadmin", "admin"],
  mesas: ["superadmin", "admin"],
  carta: ["superadmin", "admin"],
  configuracion: ["superadmin"],
  personal: ["superadmin"],
  atencion: ["mesero"],
  metricas: ["superadmin"],
}

const adminNav = [
  { href: "/admin", section: "inicio", label: "Inicio", ready: true },
  { href: "/admin/reservas", section: "reservas", label: "Reservas", ready: true },
  { href: "/admin/carta", section: "carta", label: "Carta", ready: true },
  { href: "/admin/configuracion", section: "configuracion", label: "Configuración", ready: true },
  { href: "/admin/personal", section: "personal", label: "Personal", ready: true },
] as const

function canViewSection(role: StaffRole, section: GateSection) {
  return sectionRoles[section].includes(role)
}

function roleLabel(role: StaffRole) {
  if (role === "superadmin") return "Propietario"
  if (role === "mesero") return "Mesero"
  return "Administración"
}

function homeForRole(role: StaffRole) {
  return role === "mesero" ? "/admin/atencion" : "/admin"
}

export { adminNav, adminSections, canViewSection, homeForRole, roleLabel }
export type { AdminSection, GateSection }
