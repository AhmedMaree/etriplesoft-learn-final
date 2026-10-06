import { createPageMetadata } from "@/i18n/page-metadata";
import { PageHeading } from "@/components/layout/page-heading";
import { Courses } from "@/features/courses/components/courses";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "courses", "/courses");
}

export default async function CoursesRoute({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  return (
    <>
      <PageHeading
        page="courses"
        title="All Courses"
        subtitle="Explore our comprehensive collection of Odoo courses and start your learning journey today."
      />
      <Courses query={q} />
    </>
  );
}
