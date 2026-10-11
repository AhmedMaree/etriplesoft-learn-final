import { Clock, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { BUSINESS_DETAILS } from "@/features/marketing/lib/business";
import { getMarketingMessages } from "@/features/marketing/lib/messages";
import { marketingMetadata } from "@/features/marketing/lib/page-meta";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { contact } = getMarketingMessages(locale);
  return marketingMetadata(locale, contact.metaTitle, contact.metaDescription, "/contact");
}

export default async function ContactPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const m = getMarketingMessages(locale);
  const c = m.contact;

  const channels: { Icon: LucideIcon; label: string; value: string; href?: string; ltr?: boolean }[] = [
    { Icon: MapPin, label: c.office, value: m.footer.address },
    {
      Icon: Phone,
      label: c.phone,
      value: BUSINESS_DETAILS.telephoneDisplay,
      href: `tel:${BUSINESS_DETAILS.telephoneHref}`,
      ltr: true,
    },
    {
      Icon: Mail,
      label: c.email,
      value: BUSINESS_DETAILS.supportEmail,
      href: `mailto:${BUSINESS_DETAILS.supportEmail}`,
      ltr: true,
    },
    { Icon: Clock, label: c.response, value: c.responseValue },
  ];
  const quickLinks = ["/catalog", "/learning-paths", "/help"] as const;

  return (
    <>
      <section className="mk-page-hero mk-page-hero--grid">
        <div className="mk-container">
          <span className="mk-kicker">{c.eyebrow}</span>
          <h1 className="mk-page-title">{c.title}</h1>
          <p className="mk-lead">{c.lead}</p>
        </div>
      </section>

      <section className="mk-container mk-page-body">
        <div className="mk-contact-layout">
          <div className="mk-channels">
            {channels.map(({ Icon, label, value, href, ltr }) => {
              const body = (
                <>
                  <span className="mk-channel-icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <p className="mk-label">{label}</p>
                  <p className="mk-channel-value" dir={ltr ? "ltr" : undefined}>
                    {value}
                  </p>
                </>
              );
              return href ? (
                <a key={label} href={href} className="mk-channel">
                  {body}
                </a>
              ) : (
                <div key={label} className="mk-channel">
                  {body}
                </div>
              );
            })}
          </div>

          <div className="mk-quick">
            <span className="mk-kicker">{c.quickEyebrow}</span>
            <h2 className="mk-h2-sm">{c.quickTitle}</h2>
            <ul>
              {c.quick.map((item, index) => (
                <li key={item.link}>
                  {item.before}{" "}
                  <Link href={quickLinks[index]}>{item.link}</Link>
                  {item.after.startsWith(".") ? item.after : ` ${item.after}`}
                </li>
              ))}
            </ul>
            <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} className="mk-btn mk-btn--primary">
              {c.emailCta}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
