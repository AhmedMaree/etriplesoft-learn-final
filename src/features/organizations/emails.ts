import 'server-only'

import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { trustedAuthOrigin } from '@/lib/supabase/auth-redirects'
import { emailConfiguration, renderEmail, sendEmails, type EmailMessage, type EmailSection } from '@/lib/email/resend'

const LOCALES = ['en', 'ar'] as const

// Links in emails always use the configured public origin, never the request's Host header.
function origin() {
  try {
    return trustedAuthOrigin()
  } catch {
    return null
  }
}

function formatDate(value: string | undefined, locale: 'en' | 'ar') {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en', { dateStyle: 'long', timeZone: 'Africa/Cairo' }).format(date)
}

async function messages() {
  const [en, ar] = await Promise.all(LOCALES.map((locale) => getTranslations({ locale, namespace: 'emails' })))
  return { en, ar }
}

/**
 * Emails each new invitation link to its recipient. Runs with the inviter's session, so the reads are
 * authorized like the invitation itself. Returns true only when every message was handed to Resend.
 */
export async function emailInvitations(orgId: string, role: 'manager' | 'member', invited: { email: string; code: string }[]): Promise<boolean> {
  const base = origin()
  if (!emailConfiguration() || !base || invited.length === 0) return false
  const supabase = await createClient()
  const [org, pending, t] = await Promise.all([
    supabase.rpc('org_get', { p_org: orgId }),
    supabase.rpc('org_list_invitations', { p_org: orgId }),
    messages(),
  ])
  const name = org.data?.[0]?.name
  if (!name) return false
  const expires = new Map((pending.data ?? []).map((row) => [row.email, row.expires_at]))
  const list: EmailMessage[] = invited.map(({ email, code }) => {
    const sections: EmailSection[] = LOCALES.map((locale) => ({
      locale,
      heading: t[locale]('invitation.heading', { name }),
      paragraphs: [t[locale]('invitation.body', { name, role: t[locale](`roles.${role}`) }), t[locale]('invitation.consent')],
      button: { label: t[locale]('invitation.button'), href: `${base}/${locale}/join?code=${code}` },
      footer: t[locale]('invitation.footer', { email, date: formatDate(expires.get(email), locale) }),
    }))
    const subject = `${t.en('invitation.subject', { name })} · ${t.ar('invitation.subject', { name })}`
    return { to: email, subject, ...renderEmail(subject, sections), tag: 'organization_invitation' }
  })
  return (await sendEmails(list)) === 'sent'
}

/** Tells members a course was assigned to them, with a link to the course. Never blocks the assignment. */
export async function emailAssignments(orgId: string, courseId: string, userIds: string[]): Promise<void> {
  const base = origin()
  if (!emailConfiguration() || !base || userIds.length === 0) return
  const supabase = await createClient()
  const [org, members, licensesEn, licensesAr, t] = await Promise.all([
    supabase.rpc('org_get', { p_org: orgId }),
    supabase.rpc('org_list_members', { p_org: orgId }),
    supabase.rpc('org_list_licenses', { p_org: orgId, p_locale: 'en' }),
    supabase.rpc('org_list_licenses', { p_org: orgId, p_locale: 'ar' }),
    messages(),
  ])
  const name = org.data?.[0]?.name
  const en = licensesEn.data?.find((row) => row.course_id === courseId)
  const ar = licensesAr.data?.find((row) => row.course_id === courseId)
  if (!name || !en) return
  const titles = { en: en.course_title, ar: ar?.course_title ?? en.course_title }
  const recipients = (members.data ?? []).filter((member) => userIds.includes(member.user_id))
  const list: EmailMessage[] = recipients.map((member) => {
    const sections: EmailSection[] = LOCALES.map((locale) => ({
      locale,
      heading: t[locale]('assignment.heading', { course: titles[locale] }),
      paragraphs: [t[locale]('assignment.body', { name, course: titles[locale] })],
      button: { label: t[locale]('assignment.button'), href: `${base}/${locale}/courses?course=${en.course_slug}` },
      footer: t[locale]('assignment.footer', { name }),
    }))
    const subject = `${t.en('assignment.subject', { course: titles.en })} · ${t.ar('assignment.subject', { course: titles.ar })}`
    return { to: member.email, subject, ...renderEmail(subject, sections), tag: 'organization_assignment' }
  })
  await sendEmails(list)
}
