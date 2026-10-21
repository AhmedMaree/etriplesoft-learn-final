'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import {
  BookOpen,
  Building2,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TicketPercent,
  UserPlus,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { LocaleSwitcher } from '@/components/shared/locale-switcher'

type NavItem = { href: string; label: string; icon: LucideIcon }

// `/admin` is the overview; every other entry is active for its own sub-routes too (e.g. a course editor).
function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminShell({
  children,
  showNav,
  user,
}: {
  children: ReactNode
  showNav: boolean
  user?: { name: string; email: string }
}) {
  const t = useTranslations('admin')
  const common = useTranslations('common')
  const pathname = usePathname()
  // The drawer belongs to the path it was opened on, so navigating closes it; Escape closes it too.
  const [openPath, setOpenPath] = useState<string | null>(null)
  const open = openPath === pathname
  const setOpen = (value: boolean) => setOpenPath(value ? pathname : null)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpenPath(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: t('nav.groups.general'),
      items: [
        { href: '/admin', label: t('nav.overview'), icon: LayoutDashboard },
        { href: '/admin/analytics', label: t('nav.analytics'), icon: ChartColumn },
      ],
    },
    {
      label: t('nav.groups.content'),
      items: [
        { href: '/admin/courses', label: t('nav.courses'), icon: BookOpen },
        { href: '/admin/assessments', label: t('nav.assessments'), icon: ClipboardCheck },
        { href: '/admin/calendar', label: t('nav.calendar'), icon: CalendarDays },
        { href: '/admin/videos', label: t('nav.videos'), icon: Video },
        { href: '/admin/ai', label: t('nav.ai'), icon: Sparkles },
      ],
    },
    {
      label: t('nav.groups.learners'),
      items: [
        { href: '/admin/enrollments', label: t('nav.enrollments'), icon: UserPlus },
        { href: '/admin/coupons', label: t('nav.coupons'), icon: TicketPercent },
        { href: '/admin/organizations', label: t('nav.organizations'), icon: Building2 },
        { href: '/admin/institutions', label: t('nav.institutions'), icon: Landmark },
      ],
    },
    {
      label: t('nav.groups.security'),
      items: [
        { href: '/admin/roles', label: t('nav.roles'), icon: ShieldCheck },
        { href: '/admin/audit', label: t('nav.audit'), icon: ScrollText },
      ],
    },
  ]
  const current = groups.flatMap((group) => group.items).find((item) => isActive(pathname, item.href))
  const initials = (user?.name || user?.email || '?').trim().slice(0, 1).toUpperCase()

  return (
    <div className={`admin-shell ${showNav ? '' : 'admin-shell-bare'}`}>
      <a className="admin-skip" href="#admin-main">{t('shell.skip')}</a>
      {showNav && open && <button type="button" className="admin-scrim" aria-label={common('close')} onClick={() => setOpen(false)} />}
      {showNav && (
        <aside className={`admin-sidebar ${open ? 'open' : ''}`} id="admin-sidebar">
          <div className="admin-brand">
            <Link href="/admin" aria-label={t('shell.title')}>
              <Image src="/assets/logo-display.svg" alt="ETripleSoft Learn" width={871} height={278} loading="eager" />
            </Link>
            <span className="admin-brand-tag">{t('shell.badge')}</span>
            <button type="button" className="admin-icon-button admin-drawer-close" aria-label={common('close')} onClick={() => setOpen(false)}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <nav className="admin-nav" aria-label={t('nav.label')}>
            {groups.map((group) => (
              <div className="admin-nav-group" key={group.label}>
                <p className="admin-nav-heading">{group.label}</p>
                {group.items.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} aria-current={isActive(pathname, href) ? 'page' : undefined}>
                    <Icon size={18} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="admin-sidebar-foot">
            {user && (
              <div className="admin-user">
                <span className="admin-avatar" aria-hidden="true">{initials}</span>
                <span className="admin-user-text">
                  <strong>{user.name || t('table.unnamed')}</strong>
                  <span dir="ltr">{user.email}</span>
                </span>
              </div>
            )}
            <Link href="/overview" className="admin-nav-exit">
              <LogOut size={18} aria-hidden="true" className="admin-flip" />
              <span>{t('nav.exit')}</span>
            </Link>
          </div>
        </aside>
      )}
      <div className="admin-frame">
        <header className="admin-topbar">
          {showNav && (
            <button
              type="button"
              className="admin-icon-button admin-menu-button"
              aria-label={common('openNavigation')}
              aria-controls="admin-sidebar"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          )}
          <p className="admin-crumbs">
            <span>{t('shell.title')}</span>
            {current && (
              <>
                <span aria-hidden="true">/</span>
                <strong>{current.label}</strong>
              </>
            )}
          </p>
          <LocaleSwitcher className="admin-locale" />
        </header>
        <main className="admin-main" id="admin-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
