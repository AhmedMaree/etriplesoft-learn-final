import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  ClipboardList,
  Code,
  Eye,
  Globe,
  Hammer,
  Hand,
  MapPin,
  Network,
  Star,
  TrendingUp,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { getMarketingMessages } from "../../lib/messages";
import { teamAnchorId } from "../../lib/team";

const storyIcons: LucideIcon[] = [ClipboardList, Wrench, BookOpen, Brain, Star];
const benefitIcons: LucideIcon[] = [Hammer, User, Hand, Building2, TrendingUp, Globe];
const valueIcons: LucideIcon[] = [Hammer, Eye, Briefcase, TrendingUp];

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AboutPage({ locale }: { locale: Locale }) {
  const m = getMarketingMessages(locale);
  const a = m.about;
  const steps = [...a.storySteps, ...a.storySteps];

  return (
    <>
      <section className="mk-container mk-block">
        <div className="mk-about-hero">
          <div className="mk-page-hero-text">
            <span className="mk-kicker">{a.eyebrow}</span>
            <h1 className="mk-page-title">{a.title}</h1>
            <p className="mk-lead">{a.lead}</p>
            <div className="mk-hero-actions">
              <Link href="/catalog" className="mk-btn mk-btn--primary">
                {a.exploreCourses}
                <ArrowRight size={18} className="mk-flip-rtl" aria-hidden="true" />
              </Link>
              <a href="#team" className="mk-btn mk-btn--outline">
                {a.meetTeam}
              </a>
            </div>
          </div>

          <div className="mk-about-art" role="img" aria-label={a.ecosystem.label}>
            <div className="mk-about-orbit">
              <div className="mk-about-core">
                <Network size={32} aria-hidden="true" />
                <span>{a.ecosystem.center}</span>
              </div>
              <div className="mk-about-node mk-about-node--top">
                <BarChart3 size={20} aria-hidden="true" />
                <span>{a.ecosystem.analysis}</span>
              </div>
              <div className="mk-about-node mk-about-node--bottom">
                <Wrench size={20} aria-hidden="true" />
                <span>{a.ecosystem.implementation}</span>
              </div>
              <div className="mk-about-node mk-about-node--start">
                <Code size={20} aria-hidden="true" />
                <span>{a.ecosystem.development}</span>
              </div>
              <div className="mk-about-node mk-about-node--end">
                <BookOpen size={20} aria-hidden="true" />
                <span>{a.ecosystem.content}</span>
              </div>
            </div>
            <div className="mk-about-badge">
              <BadgeCheck size={16} aria-hidden="true" />
              {a.partner}
            </div>
          </div>
        </div>
      </section>

      <section className="mk-container mk-block">
        <div className="mk-center-head">
          <h2 className="mk-h2-sm">{a.storyTitle}</h2>
          <p className="mk-lead">{a.storyLead}</p>
        </div>
        <div className="mk-marquee">
          <div className="mk-marquee-line" aria-hidden="true" />
          <ul className="mk-marquee-track" dir="ltr">
            {steps.map((label, index) => {
              const Icon = storyIcons[index % storyIcons.length];
              return (
                <li key={`${label}-${index}`} aria-hidden={index >= a.storySteps.length ? "true" : undefined}>
                  <span className="mk-marquee-icon">
                    <Icon size={24} aria-hidden="true" />
                  </span>
                  <span>{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mk-container mk-block">
        <div className="mk-pillars">
          {a.pillars.map((pillar, index) => (
            <article key={pillar}>
              <span className="mk-pillar-number">{String(index + 1).padStart(2, "0")}</span>
              <h3>{pillar}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="mk-band mk-band--low">
        <div className="mk-container">
          <h2 className="mk-h2-sm mk-center">{a.whyTitle}</h2>
          <div className="mk-benefits">
            {a.benefits.map((benefit, index) => {
              const Icon = benefitIcons[index] ?? Hammer;
              return (
                <div key={benefit}>
                  <Icon size={32} aria-hidden="true" />
                  <h3>{benefit}</h3>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mk-band mk-band--dark">
        <div className="mk-container">
          <h2 className="mk-h2-sm mk-center">{a.footprintTitle}</h2>
          <div className="mk-regions">
            {a.regions.map((region) => (
              <div key={region.title}>
                <MapPin size={48} aria-hidden="true" />
                <h3>{region.title}</h3>
                <p>{region.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="team" className="mk-band mk-band--low mk-anchor">
        <div className="mk-container">
          <h2 className="mk-h2-sm mk-center">{a.teamTitle}</h2>

          <h3 className="mk-h3-sm mk-team-heading">{a.leadershipTitle}</h3>
          <div className="mk-team mk-team--lead">
            {a.leadership.map((person) => (
              <div key={person.name} id={teamAnchorId(person.name)} className="mk-person mk-anchor">
                <span className="mk-avatar mk-avatar--lg">{initialsOf(person.name)}</span>
                <h4 dir="ltr">{person.name}</h4>
                <p className="mk-small">{person.role}</p>
                <p className="mk-body">{person.bio}</p>
              </div>
            ))}
          </div>

          <h3 className="mk-h3-sm mk-team-heading">{a.professionalTitle}</h3>
          <div className="mk-team mk-team--pro">
            {a.professionals.map((person) => (
              <div key={person.name} id={teamAnchorId(person.name)} className="mk-person mk-person--pro mk-anchor">
                <span className="mk-avatar">{initialsOf(person.name)}</span>
                <h4 dir="ltr">{person.name}</h4>
                <p className="mk-small">{person.role}</p>
                <p className="mk-body">{person.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-container mk-block">
        <h2 className="mk-h2-sm mk-center">{a.valuesTitle}</h2>
        <div className="mk-values">
          {a.values.map((value, index) => {
            const Icon = valueIcons[index] ?? Hammer;
            return (
              <div key={value}>
                <Icon size={48} aria-hidden="true" />
                <h3>{value}</h3>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mk-band mk-band--primary">
        <div className="mk-container mk-about-cta">
          <h2>{a.ctaTitle}</h2>
          <Link href="/catalog" className="mk-btn mk-btn--white">
            {a.ctaButton}
            <ArrowRight size={18} className="mk-flip-rtl" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
