'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'

export function AdminNav() {
  const t = useTranslations('admin')
  const pathname = usePathname()
  const links = [
    { href: '/admin', label: t('nav.roles') },
    { href: '/admin/audit', label: t('nav.audit') },
    { href: '/admin/enrollments', label: t('nav.enrollments') },
    { href: '/admin/assessments', label: t('nav.assessments') },
    { href: '/admin/courses', label: t('nav.courses') },
    { href: '/video-management', label: t('nav.videos') },
  ] as const

  return (
    <nav className="admin-nav" aria-label={t('nav.label')}>
      {links.map((link) => (
        <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}>
          {link.label}
        </Link>
      ))}
      <Link href="/overview" className="admin-nav-exit">{t('nav.exit')}</Link>
    </nav>
  )
}
