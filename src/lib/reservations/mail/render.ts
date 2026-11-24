import { formatVisitDate } from "@/lib/reservations/schedule"
import type { ReservationZone } from "@/lib/reservations/types"

type MailKind = "received" | "confirmed"

type ReservationMailContent = {
  kind: MailKind
  customerName: string
  referenceCode: string
  date: string
  time: string
  partySize: number
  zone: ReservationZone
  tableLabel: string | null
  trackingUrl: string
  whatsappUrl: string
  siteUrl: string
  logoUrl: string
}

const olive = "#2B341F"
const cream = "#F7F6F0"
const page = "#E8E9D9"
const terracotta = "#9C422F"
const codeBed = "#F3EBDD"
const line = "#E4E0D4"
const sage = "#E6EDD8"
const muted = "#5C6550"

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function zoneLabel(zone: ReservationZone) {
  return zone === "terrace" ? "Terraza" : "Salón"
}

function partyLabel(partySize: number) {
  return partySize === 1 ? "1 persona" : `${partySize} personas`
}

function mailSubject(kind: MailKind) {
  if (kind === "confirmed") return "PIÙ Pizza & Dolce | ¡Tu reserva está confirmada!"
  return "PIÙ Pizza & Dolce | Recibimos tu solicitud de reserva"
}

function detailRow(label: string, value: string) {
  return `<tr>
    <td style="padding:10px 16px;border-bottom:1px solid ${line};font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;color:${muted};width:38%;">${escapeHtml(label)}</td>
    <td style="padding:10px 16px;border-bottom:1px solid ${line};font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:20px;color:${olive};font-weight:600;">${escapeHtml(value)}</td>
  </tr>`
}

function renderReservationMail(content: ReservationMailContent) {
  const confirmed = content.kind === "confirmed"
  const subject = mailSubject(content.kind)
  const title = confirmed ? "¡Tu reserva está confirmada!" : "Recibimos tu solicitud de reserva"
  const button = confirmed ? "Ver mi reserva confirmada" : "Ver estado de mi reserva"
  const status = confirmed ? "Confirmada" : "Pendiente de confirmación"
  const statusBg = confirmed ? sage : "#F6E4DA"
  const statusColor = confirmed ? olive : terracotta
  const visit = formatVisitDate(content.date)
  const hour = `${content.time} hrs`
  const table = content.tableLabel?.trim() ? content.tableLabel.trim() : ""
  const name = content.customerName.trim()
  const intro = confirmed
    ? `Hola, ${name}.\n\n¡Tenemos todo listo para recibirte en PIÙ Pizza & Dolce!\n\nTu solicitud fue confirmada por nuestro equipo. Te esperamos en la fecha y horario indicados.`
    : `Hola, ${name}.\n\nGracias por elegir PIÙ Pizza & Dolce. Hemos recibido tu solicitud y nuestro equipo la revisará para confirmar la disponibilidad.`
  const closing = confirmed
    ? "¡Te esperamos para disfrutar de una experiencia especial en PIÙ Pizza & Dolce!"
    : "Te avisaremos por correo cuando nuestro equipo confirme tu reserva."
  const follow = confirmed
    ? "Puedes consultar tu reserva en cualquier momento desde nuestra página web."
    : "Puedes consultar el estado de tu solicitud en cualquier momento desde nuestra página web."
  const rows = [
    detailRow("Nombre", name),
    detailRow("Fecha", visit),
    detailRow("Hora", hour),
    detailRow("Personas", partyLabel(content.partySize)),
    detailRow("Zona", zoneLabel(content.zone)),
    table ? detailRow("Mesa", table) : "",
    detailRow("Estado", status),
  ].join("")
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(`${title} ${content.referenceCode}`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${page};margin:0;padding:0;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${cream};border-radius:28px;overflow:hidden;">
<tr><td style="padding:28px 28px 8px;text-align:center;">
<img src="${escapeHtml(content.logoUrl)}" width="168" alt="PIÙ Pizza &amp; Dolce" style="display:block;margin:0 auto;border:0;width:168px;max-width:70%;height:auto;">
</td></tr>
<tr><td style="padding:12px 32px 0;font-family:Georgia,'Palatino Linotype',Palatino,serif;font-size:32px;line-height:38px;color:${olive};text-align:center;font-weight:normal;">${escapeHtml(title)}</td></tr>
<tr><td style="padding:16px 32px 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:${olive};text-align:center;">${escapeHtml(intro).replaceAll("\n", "<br>")}</td></tr>
<tr><td align="center" style="padding:18px 32px 0;">
<span style="display:inline-block;background:${statusBg};color:${statusColor};font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:18px;font-weight:700;letter-spacing:0.02em;border-radius:999px;padding:8px 14px;">Estado: ${escapeHtml(status)}</span>
</td></tr>
<tr><td style="padding:22px 32px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${codeBed};border-radius:18px;">
<tr><td style="padding:18px 16px 4px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:18px;letter-spacing:0.04em;color:${muted};text-align:center;">Tu código de seguimiento</td></tr>
<tr><td style="padding:0 16px 18px;font-family:Georgia,'Palatino Linotype',Palatino,serif;font-size:36px;line-height:42px;color:${terracotta};text-align:center;font-weight:bold;">${escapeHtml(content.referenceCode)}</td></tr>
</table>
</td></tr>
<tr><td style="padding:22px 32px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${line};border-radius:18px;overflow:hidden;">
<tr><td colspan="2" style="background:${olive};color:${cream};font-family:Georgia,'Palatino Linotype',Palatino,serif;font-size:18px;line-height:24px;padding:14px 16px;">Detalles de tu reserva</td></tr>
${rows}
</table>
</td></tr>
<tr><td style="padding:22px 32px 0;">
<a href="${escapeHtml(content.trackingUrl)}" style="display:block;background:${terracotta};color:${cream};font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:22px;font-weight:700;text-align:center;text-decoration:none;border-radius:999px;padding:16px 18px;">${escapeHtml(button)}</a>
</td></tr>
<tr><td style="padding:12px 36px 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:${muted};text-align:center;">${escapeHtml(follow)}</td></tr>
<tr><td style="padding:18px 36px 0;font-family:Georgia,'Palatino Linotype',Palatino,serif;font-size:16px;line-height:24px;color:${olive};text-align:center;">${escapeHtml(closing)}</td></tr>
<tr><td style="padding:22px 32px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${sage};border-radius:18px;">
<tr><td style="padding:16px 16px 4px;font-family:Georgia,'Palatino Linotype',Palatino,serif;font-size:18px;line-height:24px;color:${olive};text-align:center;">¿Dudas o consultas?</td></tr>
<tr><td style="padding:0 20px 12px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:21px;color:${olive};text-align:center;">Si necesitas ayuda con tu reserva, nuestro equipo estará encantado de ayudarte.</td></tr>
<tr><td style="padding:0 20px 16px;" align="center">
<a href="${escapeHtml(content.whatsappUrl)}" style="display:inline-block;background:${cream};color:${olive};font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:20px;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 18px;border:1px solid ${olive};">Contactar por WhatsApp</a>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:18px 32px 8px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:${muted};text-align:center;">Este es un correo automático. Por favor, no respondas a este mensaje.</td></tr>
<tr><td style="padding:0 32px 6px;font-family:Georgia,'Palatino Linotype',Palatino,serif;font-size:16px;line-height:22px;color:${olive};text-align:center;">PIÙ Pizza &amp; Dolce</td></tr>
<tr><td style="padding:0 32px 28px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:18px;text-align:center;"><a href="${escapeHtml(content.siteUrl)}" style="color:${olive};text-decoration:underline;">www.piupizzas.cl</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
  const text = [
    title,
    "",
    intro,
    "",
    `Estado: ${status}`,
    "",
    `Tu código de seguimiento: ${content.referenceCode}`,
    "",
    "Detalles de tu reserva",
    `Nombre: ${name}`,
    `Fecha: ${visit}`,
    `Hora: ${hour}`,
    `Personas: ${partyLabel(content.partySize)}`,
    `Zona: ${zoneLabel(content.zone)}`,
    table ? `Mesa: ${table}` : "",
    `Estado: ${status}`,
    "",
    `${button}: ${content.trackingUrl}`,
    follow,
    "",
    closing,
    "",
    "¿Dudas o consultas?",
    "Si necesitas ayuda con tu reserva, nuestro equipo estará encantado de ayudarte.",
    `Contactar por WhatsApp: ${content.whatsappUrl}`,
    "",
    "Este es un correo automático. Por favor, no respondas a este mensaje.",
    "PIÙ Pizza & Dolce",
    content.siteUrl,
  ]
    .filter((line) => line !== "")
    .join("\n")
  return { subject, html, text }
}

export { escapeHtml, mailSubject, renderReservationMail }
export type { MailKind, ReservationMailContent }
