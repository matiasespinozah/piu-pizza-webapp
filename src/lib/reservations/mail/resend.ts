import type { MailTransport } from "@/lib/reservations/mail/dispatch"
import { whatsappHref } from "@/lib/site"

const defaultFrom = "PIÙ Pizza & Dolce <reservas@piupizzas.cl>"

class MailDeliveryError extends Error {
  readonly unknown: boolean

  constructor(unknown: boolean) {
    super(unknown ? "unknown" : "provider")
    this.unknown = unknown
  }
}

function resendTransport(env: Record<string, string | undefined>): MailTransport {
  const from = env.PIU_RESERVATION_EMAIL_FROM?.trim() || defaultFrom
  return async (message) => {
    let response: Response
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      })
    } catch {
      throw new MailDeliveryError(true)
    }
    if (!response.ok) throw new MailDeliveryError(false)
    const body = (await response.json()) as { id?: unknown }
    if (typeof body.id !== "string" || !body.id) throw new MailDeliveryError(false)
    return { id: body.id }
  }
}

function mailLinks(env: Record<string, string | undefined>) {
  const origin = (env.PIU_PUBLIC_SITE_URL || "https://piupizzas.cl").replace(/\/$/, "")
  return {
    origin,
    siteUrl: origin,
    whatsappUrl: whatsappHref,
    logoUrl: `${origin}/logos/logopiu.png`,
  }
}

export { MailDeliveryError, mailLinks, resendTransport }
