"use client";

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Star, Mail, MapPin, Phone } from 'lucide-react';
import { useDemoToast } from '@/lib/browser/demo-toast';
import { ASSET_BASE } from '@/lib/assets';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { useTranslations } from 'next-intl';

export const SOCIALS: [string, string, string][] = [
  [
    "Facebook",
    "https://www.facebook.com/etriplesoft",
    "M15.1 8.5h-2v-1.3c0-.6.4-.7.7-.7h1.3V4.1h-1.8c-2 0-2.5 1.5-2.5 2.5v1.9H9.6v2.5h1.2V18h2.3v-7h1.7l.3-2.5Z",
  ],
  [
    "Instagram",
    "https://www.instagram.com/etriplesoft",
    "M12 4.6c2.4 0 2.7 0 3.6.1.9 0 1.4.2 1.7.3.4.2.7.4 1 .7.3.3.5.6.7 1 .1.3.3.8.3 1.7 0 .9.1 1.2.1 3.6s0 2.7-.1 3.6c0 .9-.2 1.4-.3 1.7-.2.4-.4.7-.7 1-.3.3-.6.5-1 .7-.3.1-.8.3-1.7.3-.9 0-1.2.1-3.6.1s-2.7 0-3.6-.1c-.9 0-1.4-.2-1.7-.3-.4-.2-.7-.4-1-.7-.3-.3-.5-.6-.7-1-.1-.3-.3-.8-.3-1.7 0-.9-.1-1.2-.1-3.6s0-2.7.1-3.6c0-.9.2-1.4.3-1.7.2-.4.4-.7.7-1 .3-.3.6-.5 1-.7.3-.1.8-.3 1.7-.3.9 0 1.2-.1 3.6-.1Zm0 3.6a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm0 6.3a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Zm4.8-6.4a.9.9 0 1 1-1.8 0 .9.9 0 0 1 1.8 0Z",
  ],
  [
    "LinkedIn",
    "https://www.linkedin.com/company/etriplesoft",
    "M7.6 18H5.2V9.7h2.4V18ZM6.4 8.6a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8ZM18.8 18h-2.4v-4.1c0-1-.4-1.7-1.3-1.7-.7 0-1.1.5-1.3 1-.1.2-.1.4-.1.7V18H11.3s0-7.5 0-8.3h2.4v1.2c.3-.5 1-1.3 2.4-1.3 1.7 0 3 1.1 3 3.6V18Z",
  ],
];

export const FOOTER_LINKS: [string, [string, string][]][] = [
  [
    "Learn",
    [
      ["Courses", "#courses"],
      ["Learning Paths", "#courses"],
      ["Odoo Modules", "#courses"],
    ],
  ],
  [
    "Company",
    [
      ["About", ""],
      ["Contact", ""],
    ],
  ],
  [
    "Support",
    [
      ["Help Center", ""],
      ["Privacy Policy", ""],
      ["Terms of Service", ""],
      ["Refund & Course Exchange Policy", ""],
    ],
  ],
];

export function SiteFooter() {
  const t = useTranslations("common");
  const notify = useDemoToast();

  const soon = () => notify(t("soon"));
  const footerHeadings = { Learn: t("footerLearn"), Company: t("footerCompany"), Support: t("footerSupport") };
  const footerLabels: Record<string, string> = {
    Courses: t("footerCourses"), "Learning Paths": t("footerPaths"), "Odoo Modules": t("footerModules"),
    About: t("footerAbout"), Contact: t("footerContact"), "Help Center": t("footerHelp"),
    "Privacy Policy": t("footerPrivacy"), "Terms of Service": t("footerTerms"),
    "Refund & Course Exchange Policy": t("footerRefund"),
  };
  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-about">
        <Link className="site-footer-logo" href="/">
            <Image
              src={ASSET_BASE + "logo-display.svg"}
              alt="ETripleSoft Learn"
              width={871}
              height={278}
            />
          </Link>
          <p>{t("footerDescription")}</p>
          <p className="site-footer-quote">â€œ{t("footerQuote")}â€</p>
          <ul className="site-footer-contact">
            <li>
              <MapPin size={17} />
              <span>New Cairo, Egypt</span>
            </li>
            <li>
              <Phone size={17} />
              <a href="tel:+201002106952">+20 100 210 6952</a>
            </li>
            <li>
              <Mail size={17} />
              <a href="mailto:info@etriplesoft.com">info@etriplesoft.com</a>
            </li>
          </ul>
          <div className="site-footer-social">
            {SOCIALS.map(([name, href, d]) => (
              <a
                key={name}
                href={href}
                aria-label={name}
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={d} />
                </svg>
              </a>
            ))}
          </div>
        </div>
        <nav className="site-footer-nav">
          {FOOTER_LINKS.map(([heading, links]) => (
            <div key={heading}>
              <h2>{footerHeadings[heading as keyof typeof footerHeadings]}</h2>
              <ul>
                {links.map(([label, href]) => (
                  <li key={label}>
                    {href ? (
                      <a href={href}>{footerLabels[label] ?? label}</a>
                    ) : (
                      <button type="button" onClick={() => soon()}>
                        {footerLabels[label] ?? label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="site-footer-bottom">
        <small>Â© 2026 ETripleSoft Learn. {t("copyright")}</small>
        <span className="partner-badge">
          <Star size={13} />
          Odoo Gold Partner Â· MENA Region
        </span>
        <LocaleSwitcher className="site-footer-lang" />
      </div>
    </footer>
  );
}
