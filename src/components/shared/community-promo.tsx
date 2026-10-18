import { Link } from '@/i18n/navigation';
import { Users, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { demoFeaturesEnabled } from '@/lib/features';

export function Community({ title, description, action }: { title?: string; description?: string; action?: string }) {
  const t = useTranslations("common");
  if (!demoFeaturesEnabled) return null;
  return (
    <div className="community-banner">
      <Users size={34} />
      <div>
        <strong>{title ?? t("communityBanner")}</strong>
        <p>{description ?? t("communityBannerCopy")}</p>
      </div>
      <Link className="btn outline" href="/community">
        {action ?? t("visitCommunity")} <ArrowRight className="flip-rtl" size={17} aria-hidden="true" />
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
