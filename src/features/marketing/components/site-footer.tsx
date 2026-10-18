import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { getMarketing } from "../lib/get-marketing";
import { formatMessage } from "../lib/messages";
import { BUSINESS_DETAILS, getOdooPartnerUrl } from "../lib/business";
import { FacebookIcon, InstagramIcon, LinkedinIcon } from "./social-icons";

/** `localeSwitcher` is for the learner app, whose header has no language control of its own. */
export async function SiteFooter({ localeSwitcher = false }: { localeSwitcher?: boolean } = {}) {
  const { locale, m } = await getMarketing();
  const f = m.footer;
  const columns = [
    {
      title: f.learn,
      links: [
        { href: "/catalog", label: f.courses },
        { href: "/learning-paths", label: f.learningPaths },
        { href: "/odoo-modules", label: f.modules },
      ],
    },
    {
      title: f.company,
      links: [
        { href: "/about", label: f.aboutUs },
        { href: "/contact", label: f.contact },
      ],
    },
    {
      title: f.support,
      links: [
        { href: "/help", label: f.help },
        { href: "/privacy", label: f.privacy },
        { href: "/terms", label: f.terms },
        { href: "/refund-policy", label: f.refund },
      ],
    },
  ] as const;
  const social = [
    { href: "https://facebook.com/etriplesoft", label: f.facebook, Icon: FacebookIcon },
    { href: "https://instagram.com/etriplesoft", label: f.instagram, Icon: InstagramIcon },
    { href: "https://linkedin.com/company/etriplesoft", label: f.linkedin, Icon: LinkedinIcon },
  ];

  return (
    <footer className="mk-footer">
      <div className="mk-container mk-footer-grid">
        <div className="mk-footer-brand">
          <Link href="/" aria-label={m.shell.homeLabel}>
            <Image src="/marketing/brand/logo-lockup.png" alt={m.shell.logoAlt} width={916} height={301} />
          </Link>
          <p className="mk-body">{f.about}</p>
          <p className="mk-body mk-footer-quote">{f.quote}</p>
          <ul className="mk-footer-contact">
            <li>
              <MapPin size={16} aria-hidden="true" />
              <span>{f.address}</span>
            </li>
            <li>
              <Phone size={16} aria-hidden="true" />
              <a href={`tel:${BUSINESS_DETAILS.telephoneHref}`} dir="ltr">
                {BUSINESS_DETAILS.telephoneDisplay}
              </a>
            </li>
            <li>
              <Mail size={16} aria-hidden="true" />
              <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} dir="ltr">
                {BUSINESS_DETAILS.supportEmail}
              </a>
            </li>
          </ul>
          <ul className="mk-footer-social" aria-label={f.social}>
            {social.map(({ href, label, Icon }) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Icon width={16} height={16} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mk-footer-columns">
        {columns.map((column) => (
          <div key={column.title} className="mk-footer-column">
            <h2 className="mk-footer-heading">{column.title}</h2>
            <ul>
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        </div>
      </div>

      <div className="mk-container mk-footer-bottom">
        <p>{formatMessage(locale, f.rights, { year: String(new Date().getFullYear()) })}</p>
        <a className="mk-partner" href={getOdooPartnerUrl(locale)} target="_blank" rel="noopener noreferrer">
          <span aria-hidden="true">⭐</span>
          {m.shell.partner}
        </a>
        {localeSwitcher && <LocaleSwitcher className="mk-locale" />}
      </div>
    </footer>
  );
}
