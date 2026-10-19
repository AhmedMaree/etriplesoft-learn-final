import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  ClipboardList,
  Code,
  Eye,
  Globe,
  GraduationCap,
  Hammer,
  Hand,
  Layers,
  MapPin,
  Network,
  Settings,
  Star,
  Target,
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
const pillarIcons: LucideIcon[] = [Target, Eye, Layers];

/** Pillars are stored as "Label: statement"; show the label as a kicker above the statement. */
function splitPillar(text: string) {
  const index = text.indexOf(":");
  if (index === -1) return { label: "", statement: text };
  return { label: text.slice(0, index).trim(), statement: text.slice(index + 1).trim() };
}

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
  const accentAt = a.title.lastIndexOf(a.titleAccent);
  const titleStart = accentAt > 0 ? a.title.slice(0, accentAt) : a.title;
  const titleAccent = accentAt > 0 ? a.titleAccent : "";

  return (
    <>
      <section className="mk-about-top">
        <div className="mk-container mk-block mk-about-hero">
          <div className="mk-page-hero-text">
            <span className="mk-kicker">{a.eyebrow}</span>
            <h1 className="mk-page-title">
              {titleStart}
              {titleAccent ? <span className="mk-about-accent">{titleAccent}</span> : null}
            </h1>
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
            <span className="mk-about-chip mk-about-chip--1" aria-hidden="true">
              <Target size={20} />
            </span>
            <span className="mk-about-chip mk-about-chip--2" aria-hidden="true">
              <GraduationCap size={20} />
            </span>
            <span className="mk-about-chip mk-about-chip--3" aria-hidden="true">
              <BarChart3 size={18} />
            </span>
            <span className="mk-about-chip mk-about-chip--4" aria-hidden="true">
              <Settings size={20} />
            </span>
            <div className="mk-about-orbit">
              <span className="mk-about-ring" aria-hidden="true" />
              <span className="mk-about-glow" aria-hidden="true" />
              <span className="mk-about-link mk-about-link--v" aria-hidden="true" />
              <span className="mk-about-link mk-about-link--h" aria-hidden="true" />
              <div className="mk-about-core">
                <Network size={36} aria-hidden="true" />
                <span>{a.ecosystem.center}</span>
              </div>
              <div className="mk-about-node mk-about-node--top">
                <BarChart3 size={28} aria-hidden="true" />
                <span>{a.ecosystem.analysis}</span>
              </div>
              <div className="mk-about-node mk-about-node--bottom">
                <Wrench size={28} aria-hidden="true" />
                <span>{a.ecosystem.implementation}</span>
              </div>
              <div className="mk-about-node mk-about-node--start">
                <Code size={28} aria-hidden="true" />
                <span>{a.ecosystem.development}</span>
              </div>
              <div className="mk-about-node mk-about-node--end">
                <BookOpen size={28} aria-hidden="true" />
                <span>{a.ecosystem.content}</span>
              </div>
            </div>
            <div className="mk-about-badge">
              <span className="mk-about-badge-star">
                <Star size={14} aria-hidden="true" />
              </span>
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
                  <span dir="auto">{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mk-container mk-block">
        <div className="mk-pillars">
          {a.pillars.map((pillar, index) => {
            const { label, statement } = splitPillar(pillar);
            const Icon = pillarIcons[index] ?? Target;
            return (
              <article key={pillar}>
                <div className="mk-pillar-top">
                  <span className="mk-about-icon">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span className="mk-pillar-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                {label ? <span className="mk-pillar-label">{label}</span> : null}
                <h3>{statement}</h3>
              </article>
            );
          })}
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
                  <span className="mk-about-icon">
                    <Icon size={22} aria-hidden="true" />
                  </span>
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
                <span className="mk-region-pin">
                  <MapPin size={28} aria-hidden="true" />
                </span>
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
                <span className="mk-about-icon mk-about-icon--lg">
                  <Icon size={28} aria-hidden="true" />
                </span>
                <h3>{value}</h3>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mk-container mk-block">
        <div className="mk-about-cta">
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
