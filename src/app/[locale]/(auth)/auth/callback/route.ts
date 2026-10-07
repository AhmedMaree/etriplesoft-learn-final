import { NextResponse, type NextRequest } from 'next/server'
import { isLocale } from '@/i18n/config'
import { safeReturnPath, trustedAuthOrigin } from '@/lib/supabase/auth-redirects'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeValue } = await params
  if (!isLocale(localeValue)) return NextResponse.redirect(new URL('/en/login?notice=invalidLink', trustedAuthOrigin()))

  const locale = localeValue
  const callback = request.nextUrl
  const requestedNext = safeReturnPath(locale, callback.searchParams.get('next'))
  const isRecovery = requestedNext === `/${locale}/reset-password`
  const code = callback.searchParams.get('code')

  if (!code || callback.searchParams.has('error')) {
    const path = isRecovery ? `/${locale}/reset-password?notice=recoveryExpired` : `/${locale}/login?notice=invalidLink`
    return NextResponse.redirect(new URL(path, trustedAuthOrigin()))
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.user) {
      const path = isRecovery ? `/${locale}/reset-password?notice=recoveryExpired` : `/${locale}/login?notice=expiredLink`
      return NextResponse.redirect(new URL(path, trustedAuthOrigin()))
    }

    await supabase
      .from('learner_preferences')
      .update({ preferred_locale: locale })
      .eq('user_id', data.user.id)

    return NextResponse.redirect(new URL(requestedNext, trustedAuthOrigin()))
  } catch {
    const path = isRecovery ? `/${locale}/reset-password?notice=recoveryExpired` : `/${locale}/login?notice=invalidLink`
    return NextResponse.redirect(new URL(path, trustedAuthOrigin()))
  }
}
