import { CalendarDays, Mail, RefreshCcw, ShieldCheck, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { BUSINESS_DETAILS } from "../../lib/business";
import { getMarketingMessages } from "../../lib/messages";
import { SupportNav } from "./support-nav";

const sectionIds = [
  "course-fit-guarantee",
  "course-exchange",
  "course-problems",
  "refund-method",
  "submit-request",
  "statutory-rights",
  "business-contact",
] as const;

const summaryIcons: LucideIcon[] = [CalendarDays, RefreshCcw, ShieldCheck];

export function RefundPolicy({ locale }: { locale: Locale }) {
  const m = getMarketingMessages(locale);
  const p = m.legal.refund;
  const b = p.business;
  const emailHref = `mailto:${BUSINESS_DETAILS.supportEmail}?subject=${encodeURIComponent(p.emailSubject)}`;

  return (
    <>
      <section className="mk-page-hero mk-page-hero--low mk-page-hero--grid">
        <div className="mk-container">
          <div className="mk-narrow-wide mk-narrow-start">
            <span className="mk-kicker">{m.legal.eyebrow}</span>
            <h1 className="mk-page-title">{p.title}</h1>
            <p className="mk-lead">{p.intro}</p>
            <p className="mk-policy-updated">
              <CalendarDays size={16} aria-hidden="true" />
              {p.updated}
            </p>
          </div>
          <SupportNav locale={locale} current="refund" />

          <div className="mk-summary">
            {p.summary.map((item, index) => {
              const Icon = summaryIcons[index] ?? ShieldCheck;
              return (
                <div key={item.title}>
                  <span className="mk-summary-icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="mk-summary-title">{item.title}</p>
                    <p className="mk-body">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mk-container mk-policy-layout">
        <aside className="mk-policy-aside">
          <nav aria-label={p.contents}>
            <h2 className="mk-summary-title">{p.contents}</h2>
            <ol>
              {p.sections.map((section, index) => (
                <li key={section.title}>
                  <a href={`#${sectionIds[index]}`}>
                    <span className="mk-policy-toc-num">{index + 1}</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="mk-policy">
          {p.sections.map((section, index) => (
            <section id={sectionIds[index]} key={section.title} className="mk-policy-section mk-anchor">
              <h2 className="mk-h2-sm mk-policy-heading">
                <span className="mk-policy-num" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {section.title}
              </h2>
              {section.intro && <p className="mk-body mk-legal-body">{section.intro}</p>}
              {section.bullets && (
                <ul className="mk-bullets">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
              {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mk-body mk-legal-body">
                    {paragraph}
                  </p>
                ))}
              {section.callout && <blockquote className="mk-callout">{section.callout}</blockquote>}

              {index === 4 && (
                <a href={emailHref} className="mk-btn mk-btn--primary mk-policy-mail">
                  <Mail size={16} aria-hidden="true" />
                  {p.emailCta}
                </a>
              )}

              {index === sectionIds.length - 1 && (
                <dl className="mk-business">
                  <BusinessDetail label={b.registeredBusinessName} value={BUSINESS_DETAILS.registeredBusinessName ?? b.notPublished} />
                  <BusinessDetail label={b.tradingName} value={BUSINESS_DETAILS.tradingName} />
                  <BusinessDetail label={b.address} value={m.footer.address} />
                  <BusinessDetail
                    label={b.supportEmail}
                    value={
                      <a dir="ltr" className="mk-inline-link" href={`mailto:${BUSINESS_DETAILS.supportEmail}`}>
                        {BUSINESS_DETAILS.supportEmail}
                      </a>
                    }
                  />
                  <BusinessDetail
                    label={b.telephone}
                    value={
                      <a dir="ltr" className="mk-inline-link" href={`tel:${BUSINESS_DETAILS.telephoneHref}`}>
                        {BUSINESS_DETAILS.telephoneDisplay}
                      </a>
                    }
                  />
                  <BusinessDetail
                    label={b.website}
                    value={
                      <a dir="ltr" className="mk-inline-link" href={BUSINESS_DETAILS.websiteUrl}>
                        {BUSINESS_DETAILS.websiteLabel}
                      </a>
                    }
                  />
                  <BusinessDetail label={b.commercialRegistration} value={BUSINESS_DETAILS.commercialRegistrationNumber ?? b.notPublished} />
                  <BusinessDetail label={b.taxRegistration} value={BUSINESS_DETAILS.taxRegistrationNumber ?? b.notPublished} />
                </dl>
              )}
            </section>
          ))}

          <nav className="mk-policy-links" aria-label={m.legal.related}>
            <Link href="/terms">{m.footer.terms}</Link>
            <Link href="/privacy">{m.footer.privacy}</Link>
          </nav>
        </article>
      </div>
    </>
  );
}

function BusinessDetail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
