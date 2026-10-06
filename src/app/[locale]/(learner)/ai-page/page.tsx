import { createPageMetadata } from "@/i18n/page-metadata";
import { PageHeading } from "@/components/layout/page-heading";
import { AIPage } from "@/features/ai-assistant/components/ai-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "ai", "/ai-page");
}

export default function AIAssistantRoute() {
  return (
    <>
      <PageHeading
        page="ai-page"
        title="Let’s keep learning!"
        subtitle="Build in-demand skills with expert-led Odoo courses and take your career to the next level."
      />
      <AIPage />
    </>
  );
}
