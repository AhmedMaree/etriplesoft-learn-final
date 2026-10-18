import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getMarketing } from "../../lib/get-marketing";

export async function FinalCta() {
  const { m } = await getMarketing();
  const cta = m.home.cta;

  return (
    <section className="mk-final-cta" aria-labelledby="mk-cta-title">
      <div className="mk-container">
        <div className="mk-final-cta-card">
          <div className="mk-final-cta-copy">
            <span className="mk-final-cta-kicker">{cta.kicker}</span>
            <h2 id="mk-cta-title">{cta.title}</h2>
            <p>{cta.lead}</p>
          </div>
          <div className="mk-final-cta-actions">
            <Link href="/sign-up" className="mk-btn mk-btn--white">
              {cta.create}
              <ArrowRight size={16} className="mk-flip-rtl" aria-hidden="true" />
            </Link>
            <Link href="/catalog" className="mk-btn mk-btn--ghost-light">
              {cta.browse}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
