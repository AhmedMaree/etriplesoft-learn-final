import 'server-only'

// Transactional email through Resend's batch API. Optional: without RESEND_API_KEY and EMAIL_FROM nothing
// is sent and callers fall back to their manual flow (for example copying an invitation link). The key is
// server-only; never expose it as NEXT_PUBLIC_*. Account emails (confirmation, password reset) are sent by
// Supabase Auth through Resend SMTP, configured in the Supabase dashboard, not here.
export type EmailMessage = {
  to: string
  subject: string
  html: string
  text: string
  // Resend tags: ASCII letters, digits, underscores and dashes only.
  tag?: string
}

export type EmailResult = 'sent' | 'disabled' | 'failed'

const ENDPOINT = 'https://api.resend.com/emails/batch'
const BATCH_LIMIT = 100

export function emailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim()
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined
  // "Name <address@domain>" or a bare address; the domain must be verified in Resend.
  if (!apiKey || !from || !/^(?:[^<>]+<)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/.test(from)) return null
  return { apiKey, from, replyTo }
}

/** Sends up to a few hundred messages in batches of 100. Never throws; reports the outcome. */
export async function sendEmails(messages: EmailMessage[], idempotencyKey?: string): Promise<EmailResult> {
  const config = emailConfiguration()
  if (!config) return 'disabled'
  if (messages.length === 0) return 'sent'
  try {
    for (let start = 0; start < messages.length; start += BATCH_LIMIT) {
      const batch = messages.slice(start, start + BATCH_LIMIT).map((message) => ({
        from: config.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(config.replyTo ? { reply_to: config.replyTo } : {}),
        ...(message.tag ? { tags: [{ name: 'category', value: message.tag }] } : {}),
      }))
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'etriplesoft-learn/1.0',
          // Resend keeps idempotency keys for 24 hours, so a retried request is not sent twice.
          ...(idempotencyKey ? { 'Idempotency-Key': `${idempotencyKey}:${start}`.slice(0, 256) } : {}),
        },
        body: JSON.stringify(batch),
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) return 'failed'
    }
    return 'sent'
  } catch {
    return 'failed'
  }
}

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ENTITIES[character])

export type EmailSection = {
  locale: 'en' | 'ar'
  heading: string
  paragraphs: string[]
  button?: { label: string; href: string }
  footer?: string
}

/**
 * One message with a section per language (English first, then Arabic right to left), since the
 * recipient's language is not known before they sign in. Inline styles only, for email clients.
 */
export function renderEmail(title: string, sections: EmailSection[]): { html: string; text: string } {
  const html = sections
    .map((section) => {
      const rtl = section.locale === 'ar'
      const align = rtl ? 'right' : 'left'
      const font = rtl ? "Tahoma, 'Segoe UI', Arial, sans-serif" : "'Segoe UI', Arial, sans-serif"
      const paragraphs = section.paragraphs
        .map((text) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#344054;text-align:${align}">${escapeHtml(text)}</p>`)
        .join('')
      const button = section.button
        ? `<p style="margin:20px 0;text-align:${align}"><a href="${escapeHtml(section.button.href)}" style="display:inline-block;padding:12px 22px;border-radius:8px;background:#0066ff;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none">${escapeHtml(section.button.label)}</a></p>`
        : ''
      const footer = section.footer
        ? `<p style="margin:0;font-size:13px;line-height:1.5;color:#667085;text-align:${align}">${escapeHtml(section.footer)}</p>`
        : ''
      return `<div dir="${rtl ? 'rtl' : 'ltr'}" lang="${section.locale}" style="padding:28px 32px;font-family:${font}"><h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#080d26;text-align:${align}">${escapeHtml(section.heading)}</h1>${paragraphs}${button}${footer}</div>`
    })
    .join('<hr style="margin:0;border:0;border-top:1px solid #e7eaf1">')
  const document = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:24px 12px;background:#f5f6f6"><div style="max-width:600px;margin:0 auto;border:1px solid #e7eaf1;border-radius:12px;background:#ffffff;overflow:hidden"><div style="padding:18px 32px;border-bottom:1px solid #e7eaf1;font-family:'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:700;color:#0066ff">ETripleSoft Learn</div>${html}</div></body></html>`
  const text = sections
    .map((section) => [section.heading, ...section.paragraphs, section.button ? `${section.button.label}: ${section.button.href}` : '', section.footer ?? ''].filter(Boolean).join('\n\n'))
    .join('\n\n— — —\n\n')
  return { html: document, text }
}
