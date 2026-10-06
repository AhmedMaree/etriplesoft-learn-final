import { Link } from '@/i18n/navigation';
import { Users, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function Community() {
  const t = useTranslations("common");
  return (
    <div className="community-banner">
      <Users size={34} />
      <div>
        <strong>{t("communityBanner")}</strong>
        <p>{t("communityBannerCopy")}</p>
      </div>
      <Link className="btn outline" href="/community">
        {t("visitCommunity")} <ArrowRight size={17} />
      </Link>
      <span className="community-count">
        <Users />{" "}
        <b>
          10K+<small>{t("activeLearners")}</small>
        </b>
      </span>
    </div>
  );
}
