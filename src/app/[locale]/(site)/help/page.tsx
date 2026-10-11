import { ChevronDown } from "lucide-react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
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
      <section className="mk-page-hero mk-page-hero--grid">
        <div className="mk-container">
          <span className="mk-kicker">{h.eyebrow}</span>
          <h1 className="mk-page-title">{h.title}</h1>
          <p className="mk-lead">{h.lead}</p>
        </div>
      </section>

      <section className="mk-container mk-narrow mk-page-body">
        <div className="mk-faq-list">
          {h.items.map((item) => (
            <details key={item.question} className="mk-faq-item">
              <summary>
                {item.question}
                <ChevronDown size={20} aria-hidden="true" />
              </summary>
              <p className="mk-body">{item.answer}</p>
            </details>
          ))}
        </div>

        <div className="mk-still">
          <p className="mk-help-title">{h.stillTitle}</p>
          <p className="mk-body">{h.stillText}</p>
          <Link href="/contact" className="mk-btn mk-btn--primary">
            {h.stillCta}
          </Link>
        </div>
      </section>
    </>
  );
}
