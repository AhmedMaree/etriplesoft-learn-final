import { PageHeading } from "@/components/layout/page-heading";
import { Overview } from "@/features/dashboard/components/dashboard";

export function OverviewPage() {
  return (
    <>
      <PageHeading
        page="overview"
        title="Let’s keep learning!"
        subtitle="Build in-demand skills with expert-led Odoo courses and take your career to the next level."
      />
      <Overview />
    </>
  );
}
