import { z } from "zod"

import type { ReservationStatus, ReservationZone } from "@/lib/reservations/types"

/**
 * Nombres de colección. El navegador no escribe ninguna.
 * La justificación está en docs/arquitectura/firebase.md.
 */
const collections = {
  reservations: "reservations",
  tables: "tables",
  categories: "categories",
  products: "products",
  staff: "staff",
  restaurantSettings: "restaurantSettings",
  auditLogs: "auditLogs",
  reservationHolds: "reservationHolds",
  reservationRate: "reservationRate",
  reservationAccess: "reservationAccess",
  reservationStatusRate: "reservationStatusRate",
  reservationDays: "reservationDays",
  invitations: "invitations",
  invitationRate: "invitationRate",
  staffNotifications: "staffNotifications",
} as const

const settingsDocId = "operations"

const reservationZoneSchema = z.enum(["salon", "terrace"])

const reservationStatusSchema = z.enum([
  "pending",
  "confirmed",
  "rejected",
  "reschedule_requested",
  "cancelled",
  "arrived",
  "completed",
])

const reservationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/),
  partySize: z.number().int().positive().max(100),
  preferredZone: reservationZoneSchema,
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z.string().trim().min(8).max(20),
  notes: z.string().trim().max(280),
  status: reservationStatusSchema,
})

const tableSchema = z.object({
  zone: reservationZoneSchema,
  label: z.string().trim().min(1).max(40),
  /** Null hasta que el restaurante defina los puestos. No se inventa un número. */
  seats: z.number().int().positive().nullable(),
  /** Mesas que se juntan para un grupo. Null si la mesa está sola. */
  joinGroupId: z.string().trim().min(1).max(40).nullable(),
  blocked: z.boolean(),
})

const categorySchema = z.object({
  slug: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).nullable(),
  sortOrder: z.number().int(),
  isVisible: z.boolean(),
})

const productSchema = z.object({
  categoryId: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500),
  /** Pesos chilenos, entero. Nunca un decimal. */
  priceClp: z.number().int().nonnegative(),
  imageUrl: z.string().trim().min(1).nullable(),
  availability: z.enum(["available", "unavailable"]),
  isFeatured: z.boolean(),
  isVisible: z.boolean(),
  sortOrder: z.number().int(),
})

const restaurantSettingsSchema = z.object({
  timeZone: z.literal("America/Santiago"),
  maxParty: z.object({
    salon: z.number().int().positive(),
    terrace: z.number().int().positive(),
  }),
  /** Cupo que se deja para quien llega sin reserva. Null: todavía no está definido. */
  walkInHold: z.number().int().nonnegative().nullable(),
  anticipation: z.object({
    weekdayLeadHours: z.number().int().positive().nullable(),
    weekendPreviousDayCutoff: z.string().trim().min(1).nullable(),
  }),
})

const staffDirectorySchema = z.object({
  email: z.string().trim().max(120),
  displayName: z.string().trim().max(80),
  /** pending no tiene claim. El rol del panel sigue viviendo solo en Authentication. */
  status: z.enum(["pending", "active", "rejected", "suspended"]),
  intendedRole: z.enum(["admin", "superadmin"]).nullable(),
  invitedBy: z.string().trim().max(128).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

const invitationSchema = z.object({
  email: z.string().trim().max(120),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  createdBy: z.string().trim().min(1).max(128),
  status: z.enum(["open", "used", "revoked"]),
  usedAt: z.string().datetime().nullable(),
  usedBy: z.string().trim().max(128).nullable(),
  lockId: z.string().trim().max(80).nullable(),
  lockUntil: z.string().datetime().nullable(),
})

const auditLogSchema = z.object({
  actorUid: z.string().trim().min(1).max(128),
  action: z.string().trim().min(1).max(80),
  targetPath: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(280),
  at: z.string().datetime(),
})

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never
const zoneMatches: Exact<ReservationZone, z.infer<typeof reservationZoneSchema>> = true
const statusMatches: Exact<ReservationStatus, z.infer<typeof reservationStatusSchema>> = true

export {
  auditLogSchema,
  categorySchema,
  collections,
  productSchema,
  reservationSchema,
  reservationStatusSchema,
  restaurantSettingsSchema,
  invitationSchema,
  settingsDocId,
  staffDirectorySchema,
  statusMatches,
  tableSchema,
  zoneMatches,
}
