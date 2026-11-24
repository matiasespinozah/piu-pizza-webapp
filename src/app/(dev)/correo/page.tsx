import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { renderReservationMail } from "@/lib/reservations/mail/render"
import { whatsappHref } from "@/lib/site"

import { MailPreview } from "./preview"

export const metadata: Metadata = {
  title: "Vista previa de correos",
  robots: { index: false, follow: false },
}

const sample = {
  customerName: "Ana Soto",
  referenceCode: "PIU-4821",
  date: "2026-11-27",
  time: "21:30",
  partySize: 4,
  zone: "terrace" as const,
  trackingToken: "vista-previa-local-no-es-una-reserva-real-00",
  whatsappUrl: whatsappHref,
  siteUrl: "https://piupizzas.cl",
  logoUrl: "https://piupizzas.cl/logos/logopiu.png",
}

export default function MailPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound()
  const trackingUrl = `https://piupizzas.cl/reservas/estado#${sample.trackingToken}`
  const received = renderReservationMail({ ...sample, kind: "received", tableLabel: null, trackingUrl })
  const confirmed = renderReservationMail({ ...sample, kind: "confirmed", tableLabel: "Terraza 4", trackingUrl })
  return <MailPreview received={received.html} confirmed={confirmed.html} />
}
