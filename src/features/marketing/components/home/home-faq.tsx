import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getMarketing } from "../../lib/get-marketing";

export async function HomeFaq() {
  const { m } = await getMarketing();
  const faq = m.home.faq;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <section className="mk-section mk-section--faq" aria-labelledby="mk-faq-title">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="mk-container">
        <div className="mk-section-head">
          <span className="mk-eyebrow">{faq.eyebrow}</span>
          <h2 id="mk-faq-title" className="mk-h2">
            {faq.title}
          </h2>
          <p className="mk-lead">{faq.lead}</p>
        </div>

        <div className="mk-faq-grid">
          {faq.items.map((item) => (
            <details key={item.question} className="mk-faq-item">
              <summary>
                {item.question}
                <ChevronDown size={20} aria-hidden="true" />
              </summary>
              <p className="mk-body">{item.answer}</p>
            </details>
          ))}
        </div>

        <div className="mk-help-bar">
          <div>
            <p className="mk-help-title">{faq.stillTitle}</p>
            <p className="mk-help-text">{faq.stillText}</p>
          </div>
          <div className="mk-help-actions">
            <Link href="/help" className="mk-btn mk-btn--outline mk-btn--sm">
              {faq.help}
            </Link>
            <Link href="/contact" className="mk-btn mk-btn--primary mk-btn--sm">
              {faq.contact}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
