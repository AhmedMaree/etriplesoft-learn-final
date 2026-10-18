import Image from "next/image";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calculator,
  ChartColumn,
  CircleCheck,
  FileText,
  IdCard,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { formatMessage, type MarketingMessages } from "../../lib/messages";

const apps = [
  { key: "crm", Icon: Users, tone: "teal" },
  { key: "sales", Icon: ChartColumn, tone: "amber" },
  { key: "inventory", Icon: Package, tone: "violet" },
  { key: "accounting", Icon: Calculator, tone: "rose" },
  { key: "purchase", Icon: ShoppingCart, tone: "blue" },
  { key: "hr", Icon: IdCard, tone: "indigo" },
] as const;

const features = [
  { Icon: Award, tone: "green" },
  { Icon: FileText, tone: "amber" },
  { Icon: Users, tone: "violet" },
] as const;

type CatalogHeroProps = {
  locale: Locale;
  copy: MarketingMessages["catalog"];
  courseCount: number;
};

export function CatalogHero({ locale, copy, courseCount }: CatalogHeroProps) {
  const hero = copy.hero;

  return (
    <section className="mk-page-hero mk-catalog-hero-section" aria-labelledby="mk-catalog-title">
      <div className="mk-container">
        <div className="mk-catalog-hero">
          <div className="mk-catalog-copy">
            <span className="mk-kicker mk-catalog-kicker">{copy.eyebrow}</span>
            <h1 id="mk-catalog-title" className="mk-page-title mk-catalog-title">
              {hero.titleStart} <span className="mk-accent">{hero.titleAccent}</span> {hero.titleEnd}
            </h1>
            <p className="mk-lead">{hero.lead}</p>
            <div className="mk-catalog-actions">
              <a href="#courses" className="mk-btn mk-btn--primary">
                {hero.start}
                <ArrowRight size={18} className="mk-flip-rtl" aria-hidden="true" />
              </a>
              <Link href="/learning-paths" className="mk-btn mk-btn--outline">
                {hero.paths}
              </Link>
            </div>
          </div>

          {/* The photo is never mirrored, so the overlay cards sit over its open left side in both locales. */}
          <div className="mk-catalog-art" role="img" aria-label={hero.artLabel}>
            <Image
              src="/assets/learner-hero.png"
              alt=""
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 50vw"
            />
            <div className="mk-catalog-card mk-catalog-apps" aria-hidden="true">
              <div className="mk-catalog-card-title">{hero.appsTitle}</div>
              <ul>
                {apps.map(({ key, Icon, tone }) => (
                  <li key={key}>
                    <span className="mk-catalog-app-icon" data-tone={tone}>
                      <Icon size={16} />
                    </span>
                    {hero.apps[key]}
                  </li>
                ))}
              </ul>
            </div>
            <ul className="mk-catalog-card mk-catalog-checklist" aria-hidden="true">
              {hero.checklist.map((item) => (
                <li key={item}>
                  <CircleCheck size={16} />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mk-catalog-card mk-catalog-count" aria-hidden="true">
              <span className="mk-catalog-count-icon">
                <BookOpen size={18} />
              </span>
              <span>
                <strong>{formatMessage(locale, hero.courseCount, { n: courseCount, count: String(courseCount) })}</strong>
                <small>{hero.courseCountSub}</small>
              </span>
            </div>
          </div>
        </div>

        <ul className="mk-catalog-features" aria-label={hero.featuresLabel}>
          {features.map(({ Icon, tone }, index) => {
            const feature = hero.features[index];
            return (
              <li key={feature.title}>
                <span className="mk-catalog-feature-icon" data-tone={tone} aria-hidden="true">
                  <Icon size={22} />
                </span>
                <span>
                  <strong>{feature.title}</strong>
                  <small>{feature.text}</small>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
