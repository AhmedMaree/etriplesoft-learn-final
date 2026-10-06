import { createPageMetadata } from "@/i18n/page-metadata";
import { PageHeading } from "@/components/layout/page-heading";
import { Assessment } from "@/features/assessments/components/assessment";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "assessment", "/assessment");
}

export default function AssessmentRoute() {
  return (
    <>
      <PageHeading
        page="assessment"
        title="Let’s keep learning!"
        subtitle="Build in-demand skills with expert-led Odoo courses and take your career to the next level."
      />
      <Assessment />
    </>
  );
}
