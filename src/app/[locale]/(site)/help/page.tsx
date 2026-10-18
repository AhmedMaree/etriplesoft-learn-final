import { ChevronDown, Mail, MessageCircle, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { SupportNav } from "@/features/marketing/components/legal/support-nav";
import { BUSINESS_DETAILS } from "@/features/marketing/lib/business";
import { getMarketingMessages } from "@/features/marketing/lib/messages";
import { marketingMetadata } from "@/features/marketing/lib/page-meta";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { help } = getMarketingMessages(locale);
  return marketingMetadata(locale, help.metaTitle, help.metaDescription, "/help");
}

export default async function HelpPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const h = getMarketingMessages(locale).help;

  return (
    <>
      <section className="mk-page-hero mk-page-hero--low mk-page-hero--grid">
        <div className="mk-container">
          <div className="mk-narrow-wide">
            <span className="mk-kicker">{h.eyebrow}</span>
            <h1 className="mk-page-title">{h.title}</h1>
            <p className="mk-lead">{h.lead}</p>
          </div>
          <SupportNav locale={locale} current="help" />
        </div>
      </section>

      <div className="mk-container mk-help-layout">
        <div className="mk-faq-list mk-help-faq">
          {h.items.map((item, index) => (
            <details key={item.question} className="mk-faq-item mk-help-item">
              <summary>
                <span className="mk-help-q">
                  <span className="mk-policy-num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.question}
                </span>
                <ChevronDown size={20} aria-hidden="true" />
              </summary>
              <p className="mk-body">{item.answer}</p>
            </details>
          ))}
        </div>

        <aside className="mk-help-aside">
          <div className="mk-help-card">
            <span className="mk-policy-contact-icon">
              <MessageCircle size={20} aria-hidden="true" />
            </span>
            <p className="mk-help-title">{h.stillTitle}</p>
            <p className="mk-body">{h.stillText}</p>
            <Link href="/contact" className="mk-btn mk-btn--primary">
              {h.stillCta}
            </Link>
            <ul className="mk-help-channels">
              <li>
                <Mail size={16} aria-hidden="true" />
                <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} dir="ltr" className="mk-inline-link">
                  {BUSINESS_DETAILS.supportEmail}
                </a>
              </li>
              <li>
                <Phone size={16} aria-hidden="true" />
                <a href={`tel:${BUSINESS_DETAILS.telephoneHref}`} dir="ltr" className="mk-inline-link">
                  {BUSINESS_DETAILS.telephoneDisplay}
                </a>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
