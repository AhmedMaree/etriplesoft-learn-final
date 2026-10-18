import { CalendarDays, Mail } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { BUSINESS_DETAILS } from "../../lib/business";
import { formatMessage, getMarketingMessages } from "../../lib/messages";
import { SupportNav } from "./support-nav";

type LegalDocumentProps = {
  locale: Locale;
  doc: "privacy" | "terms";
  /** ISO date (yyyy-mm-dd) of the last published revision. */
  updated: string;
};

export function LegalDocument({ locale, doc, updated }: LegalDocumentProps) {
  const legal = getMarketingMessages(locale).legal;
  const content = legal[doc];
  const date = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${updated}T00:00:00Z`),
  );

  return (
    <>
      <section className="mk-page-hero mk-page-hero--low mk-page-hero--grid">
        <div className="mk-container">
          <div className="mk-narrow-wide">
            <span className="mk-kicker">{legal.eyebrow}</span>
            <h1 className="mk-page-title">{content.title}</h1>
            <p className="mk-lead">{content.lead}</p>
            <p className="mk-policy-updated">
              <CalendarDays size={16} aria-hidden="true" />
              {formatMessage(locale, legal.updated, { date })}
            </p>
          </div>
          <SupportNav locale={locale} current={doc} />
        </div>
      </section>

      <div className="mk-container mk-policy-layout">
        <aside className="mk-policy-aside">
          <nav aria-label={legal.contents}>
            <h2 className="mk-summary-title">{legal.contents}</h2>
            <ol>
              {content.sections.map((section, index) => (
                <li key={section.title}>
                  <a href={`#section-${index + 1}`}>
                    <span className="mk-policy-toc-num">{index + 1}</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="mk-policy">
          {content.sections.map((section, index) => (
            <section id={`section-${index + 1}`} key={section.title} className="mk-policy-section mk-anchor">
              <h2 className="mk-h2-sm mk-policy-heading">
                <span className="mk-policy-num" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {section.title}
              </h2>
              <p className="mk-body mk-legal-body">{section.body}</p>
            </section>
          ))}

          <div className="mk-policy-contact">
            <span className="mk-policy-contact-icon">
              <Mail size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="mk-summary-title">{legal.contactTitle}</h2>
              <p className="mk-body">
                {content.contact}{" "}
                <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} dir="ltr" className="mk-inline-link">
                  {BUSINESS_DETAILS.supportEmail}
                </a>
              </p>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
