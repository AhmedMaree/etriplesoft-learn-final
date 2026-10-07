import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AuthPage } from '@/features/auth/components/auth-page'
import { isLocale } from '@/i18n/config'
import { safeReturnPath } from '@/lib/supabase/auth-redirects'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale, namespace: 'pageMetadata' })
  return { title: t('forgotPassword') }
}

export default async function ForgotPasswordRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return <AuthPage locale={locale} mode="forgot" next={safeReturnPath(locale)} />
}
