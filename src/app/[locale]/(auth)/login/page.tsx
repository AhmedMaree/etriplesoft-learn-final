import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AuthPage } from '@/features/auth/components/auth-page'
import { getCurrentUser } from '@/lib/supabase/auth'
import { safeReturnPath } from '@/lib/supabase/auth-redirects'
import { isLocale } from '@/i18n/config'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale, namespace: 'pageMetadata' })
  return { title: t('login') }
}

export default async function LoginRoute({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ next?: string; notice?: string }>
}) {
  const [{ locale: value }, query] = await Promise.all([params, searchParams])
  if (!isLocale(value)) notFound()
  const next = safeReturnPath(value, query.next)
  if (await getCurrentUser()) redirect(next)
  return <AuthPage locale={value} mode="login" next={next} notice={query.notice} />
}
