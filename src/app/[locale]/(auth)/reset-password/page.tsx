import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AuthPage } from '@/features/auth/components/auth-page'
import { getCurrentUser } from '@/lib/supabase/auth'
import { isLocale } from '@/i18n/config'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale, namespace: 'pageMetadata' })
  return { title: t('resetPassword') }
}

export default async function ResetPasswordRoute({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ notice?: string }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!isLocale(locale)) notFound()
  const user = await getCurrentUser()
  return <AuthPage locale={locale} mode="reset" next={`/${locale}`} notice={user ? query.notice : 'recoveryExpired'} />
}
