import type { ReactNode } from 'react'

// Shared heading block for every admin screen: one h1, a supporting line and optional actions.
export function AdminPageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="admin-page-header">
      <div className="admin-page-heading">
        {eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="admin-lead">{description}</p>}
        {children}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  )
}
