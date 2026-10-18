import { FileText, LifeBuoy, RefreshCcw, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { getMarketingMessages } from "../../lib/messages";

export type SupportPage = "help" | "privacy" | "terms" | "refund";

const pages: { id: SupportPage; href: string; icon: LucideIcon }[] = [
  { id: "help", href: "/help", icon: LifeBuoy },
  { id: "privacy", href: "/privacy", icon: ShieldCheck },
  { id: "terms", href: "/terms", icon: FileText },
  { id: "refund", href: "/refund-policy", icon: RefreshCcw },
];

/** Tabs linking the Help Center and policy pages, mirroring the footer's Support column. */
export function SupportNav({ locale, current }: { locale: Locale; current: SupportPage }) {
  const f = getMarketingMessages(locale).footer;

  return (
    <nav className="mk-support-nav" aria-label={f.support}>
      {pages.map(({ id, href, icon: Icon }) => (
        <Link key={id} href={href} aria-current={id === current ? "page" : undefined}>
          <Icon size={16} aria-hidden="true" />
          {f[id]}
        </Link>
      ))}
    </nav>
  );
}
