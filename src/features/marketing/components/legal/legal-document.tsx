import type { Locale } from "@/i18n/config";
import { BUSINESS_DETAILS } from "../../lib/business";
import { formatMessage, getMarketingMessages } from "../../lib/messages";

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
      <section className="mk-page-hero mk-page-hero--low">
        <div className="mk-container mk-narrow-wide">
          <span className="mk-kicker">{legal.eyebrow}</span>
          <h1 className="mk-page-title">{content.title}</h1>
          <p className="mk-lead">
            {formatMessage(locale, legal.updated, { date })}. {content.lead}
          </p>
        </div>
      </section>

      <section className="mk-container mk-narrow-wide mk-page-body">
        <div className="mk-legal">
          {content.sections.map((section) => (
            <div key={section.title}>
              <h2 className="mk-h3-sm">{section.title}</h2>
              <p className="mk-body mk-legal-body">{section.body}</p>
            </div>
          ))}
          <div>
            <h2 className="mk-h3-sm">{legal.contactTitle}</h2>
            <p className="mk-body mk-legal-body">
              {content.contact}{" "}
              <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} dir="ltr" className="mk-inline-link">
                {BUSINESS_DETAILS.supportEmail}
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
