'use client'

import { useActionState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/config'
import { BookOpen, Sparkles, Award, ArrowRight, BarChart3, FileText, User, Mail, Lock } from 'lucide-react'
import { Button, IconBox } from '@/components/ui/primitives'
import { Field } from '@/components/ui/field'
import { ASSET_BASE } from '@/lib/assets'
import { useTranslations } from 'next-intl'
import { LocaleSwitcher } from '@/components/shared/locale-switcher'
import { forgotPasswordAction, loginAction, resendConfirmationAction, resetPasswordAction, signupAction } from '@/features/auth/actions'
import type { AuthActionState } from '@/features/auth/action-state'

export type AuthPageMode = 'signup' | 'login' | 'forgot' | 'reset'

export function AuthPage({
  locale,
  mode,
  next,
  notice,
}: {
  locale: Locale
  mode: AuthPageMode
  next: string
  notice?: string
}) {
  const t = useTranslations('auth')
  const signup = useActionState<AuthActionState, FormData>(signupAction.bind(null, locale, next), {})
  const login = useActionState<AuthActionState, FormData>(loginAction.bind(null, locale, next), {})
  const forgot = useActionState<AuthActionState, FormData>(forgotPasswordAction.bind(null, locale), {})
  const reset = useActionState<AuthActionState, FormData>(resetPasswordAction, {})
  const resend = useActionState<AuthActionState, FormData>(resendConfirmationAction.bind(null, locale), {})
  const state = mode === 'signup' ? signup[0] : mode === 'login' ? login[0] : mode === 'forgot' ? forgot[0] : reset[0]
  const pending = mode === 'signup' ? signup[2] : mode === 'login' ? login[2] : mode === 'forgot' ? forgot[2] : reset[2]
  const formAction = mode === 'signup' ? signup[1] : mode === 'login' ? login[1] : mode === 'forgot' ? forgot[1] : reset[1]
  const heading = mode === 'signup' ? t('signUp') : mode === 'login' ? t('welcomeAgain') : mode === 'forgot' ? t('forgotTitle') : t('resetTitle')
  const copy = mode === 'signup' ? t('createFuture') : mode === 'login' ? t('loginCopy') : mode === 'forgot' ? t('forgotCopy') : t('resetCopy')
  const approvedNotices = ['recoveryExpired', 'invalidLink', 'expiredLink'] as const
  const noticeKey = approvedNotices.find((key) => key === notice)
  const error = state.error ? t(`errors.${state.error}`) : noticeKey ? t(`notices.${noticeKey}`) : ''
  const success = state.success ? t(`notices.${state.success}`) : ''

  return (
    <div className="signup-page">
      <header>
        <Link href="/">
          <Image src={ASSET_BASE + 'logo-display.svg'} alt="ETripleSoft Learn" width={871} height={278} />
        </Link>
        <div className="signup-header-actions">
          <LocaleSwitcher className="signup-locale" />
          <span>{mode === 'signup' ? t('alreadyAccount') : t('newTo')}</span>
          <Link className="btn outline" href={mode === 'signup' ? '/login' : '/sign-up'}>
            {mode === 'signup' ? t('login') : t('signUpAction')} <ArrowRight size={19} />
          </Link>
        </div>
      </header>
      <div className="signup-layout">
        <section className="signup-intro">
          <Image className="signup-photo" src={ASSET_BASE + 'learner-hero.png'} alt={t('heroAlt')} width={1536} height={1024} sizes="(max-width: 900px) 100vw, 50vw" priority />
          <div className="signup-copy">
            <div className="eyebrow">{t('tagline')}</div>
            <h1>{t('heroHeadingStart')}<br /><span>{t('heroHeadingEnd')}</span></h1>
            <p>{t('heroCopyStart')}<br />{t('heroCopyEnd')}</p>
          </div>
          <div className="signup-benefits">
            {[BookOpen, BarChart3, FileText, Award, Sparkles].map((Icon, index) => (
              <div key={index}>
                <IconBox icon={Icon} color={index % 2 ? 'green' : 'blue'} />
                <div>
                  <h3>{[t('benefitEnroll'), t('benefitProgress'), t('benefitQuizzes'), t('benefitCertificates'), t('benefitAi')][index]}</h3>
                  <p>{[t('benefitEnrollCopy'), t('benefitProgressCopy'), t('benefitQuizzesCopy'), t('benefitCertificatesCopy'), t('benefitAiCopy')][index]}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="handwriting">{t('handwritingStart')}<br />{t('handwritingEnd')}</div>
        </section>

        <section className={`signup-form panel${mode === 'signup' ? '' : ' login-mode'}`}>
          <h1>{heading}</h1>
          <p>{copy}</p>
          {error && <p className="auth-message error" role="alert">{error}</p>}
          {success && <p className="auth-message success" role="status">{success}</p>}
          {state.success === 'verificationSent' ? (
            <div className="auth-resend">
              <form action={resend[1]}>
                <input type="hidden" name="email" value={state.email ?? ''} />
                <Button type="submit" disabled={resend[2]}>{resend[2] ? t('sending') : t('resendConfirmation')}</Button>
              </form>
              {resend[0].success && <p role="status">{t(`notices.${resend[0].success}`)}</p>}
            </div>
          ) : state.success === 'passwordUpdated' ? (
            <Link className="btn create-account" href="/login">{t('login')} <ArrowRight size={21} /></Link>
          ) : (
            <form className="auth-fields" action={formAction}>
              <div className="form-grid">
                {(mode === 'signup' || mode === 'login' || mode === 'forgot') && (
                  <Field label={t('email')} name="email" icon={Mail} type="email" placeholder={t('emailExample')} required autoComplete="email" dir="ltr" />
                )}
                {mode === 'signup' && <Field label={t('yourName')} name="display_name" icon={User} placeholder={t('yourNameExample')} required autoComplete="name" maxLength={120} />}
                {(mode === 'signup' || mode === 'login') && <Field label={t('password')} name="password" icon={Lock} type="password" placeholder={mode === 'login' ? t('enterPassword') : t('createPassword')} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} />}
                {mode === 'signup' && <Field label={t('confirmPassword')} name="confirm_password" icon={Lock} type="password" placeholder={t('confirmPasswordPlaceholder')} required autoComplete="new-password" minLength={8} />}
                {mode === 'reset' && <>
                  <Field label={t('password')} name="password" icon={Lock} type="password" placeholder={t('createPassword')} required autoComplete="new-password" minLength={8} />
                  <Field label={t('confirmPassword')} name="confirm_password" icon={Lock} type="password" placeholder={t('confirmPasswordPlaceholder')} required autoComplete="new-password" minLength={8} />
                </>}
              </div>
              {mode === 'login' && <div className="login-options"><Link className="text-link" href="/forgot-password">{t('forgotPassword')}</Link></div>}
              <Button type="submit" className="create-account" disabled={pending}>
                {pending ? t('sending') : mode === 'signup' ? t('createAccount') : mode === 'login' ? t('login') : mode === 'forgot' ? t('sendRecovery') : t('updatePassword')}
                <ArrowRight size={21} />
              </Button>
            </form>
          )}
          {state.error === 'emailUnverified' && state.email && (
            <form action={resend[1]} className="auth-resend">
              <input type="hidden" name="email" value={state.email} />
              <Button type="submit" disabled={resend[2]}>{resend[2] ? t('sending') : t('resendConfirmation')}</Button>
              {resend[0].success && <p role="status">{t(`notices.${resend[0].success}`)}</p>}
            </form>
          )}
          {(mode === 'signup' || mode === 'login') && <p className="login-link">{mode === 'signup' ? t('alreadyAccount') : t('noAccount')} <Link className="text-link" href={mode === 'signup' ? '/login' : '/sign-up'}>{mode === 'signup' ? t('login') : t('signUpAction')}</Link></p>}
          {mode === 'forgot' && <p className="login-link"><Link className="text-link" href="/login">{t('backToLogin')}</Link></p>}
        </section>
      </div>
    </div>
  )
}
