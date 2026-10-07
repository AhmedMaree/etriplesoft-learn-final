import { createPageMetadata } from "@/i18n/page-metadata";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { Panel } from "@/components/ui/primitives";
import { PageHeading } from "@/components/layout/page-heading";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "messages", "/messages");
}

export default async function MessagesRoute() {
  const t = await getTranslations("common");
  return (
    <>
      <PageHeading
        page="messages"
        title="Let’s keep learning!"
        subtitle="Build in-demand skills with expert-led Odoo courses and take your career to the next level."
      />
      <Panel>
        <h2>{t("messages")}</h2>
        <p>{t("messagesEmpty")}</p>
        <Link className="btn" href="/courses">
          {t("exploreCourses")} <ArrowRight size={18} />
        </Link>
      </Panel>
    </>
  );
}
