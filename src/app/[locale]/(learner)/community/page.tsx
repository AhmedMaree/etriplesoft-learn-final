import { createPageMetadata } from "@/i18n/page-metadata";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { Panel } from "@/components/ui/primitives";
import { PageHeading } from "@/components/layout/page-heading";
import { useTranslations } from "next-intl";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "community", "/community");
}

export default function CommunityRoute() {
  const t = useTranslations("common");
  return (
    <>
      <PageHeading
        page="community"
        title="Let’s keep learning!"
        subtitle="Build in-demand skills with expert-led Odoo courses and take your career to the next level."
      />
      <Panel>
        <h2>{t("learningCommunity")}</h2>
        <p>{t("communityPanel")}</p>
        <Link className="btn" href="/courses">
          {t("exploreCourses")} <ArrowRight size={18} />
        </Link>
      </Panel>
    </>
  );
}
