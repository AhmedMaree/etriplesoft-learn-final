import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

export function Button({
  children,
  onClick,
  outline = false,
  className = "",
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  outline?: boolean;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`btn ${outline ? "outline" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function Title({
  children,
  link,
  onClick,
  href,
}: {
  children: ReactNode;
  link?: string;
  onClick?: () => void;
  href?: string;
}) {
  const t = useTranslations("common");
  const linkText = link ?? t("viewAll");
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {onClick ? (
        <button className="text-link" onClick={onClick}>
          {linkText}
          <ArrowRight size={16} />
        </button>
      ) : href ? (
        <Link className="text-link" href={href}>
          {linkText}
          <ArrowRight size={16} />
        </Link>
      ) : null}
    </div>
  );
}

export function IconBox({
  icon: Icon,
  color = "blue",
}: {
  icon: LucideIcon;
  color?: string;
}) {
  return (
    <span className={`icon-box ${color}`}>
      <Icon />
    </span>
  );
}

export function Progress({ value = 30 }: { value?: number }) {
  return (
    <div className="progress">
      <span style={{ width: value + "%" }} />
    </div>
  );
}
