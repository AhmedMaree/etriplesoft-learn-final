import { createPageMetadata } from "@/i18n/page-metadata";
import { CourseDetail } from "@/features/courses/components/course-detail";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "detailCourse", "/detail-course");
}

export default function CourseDetailRoute() {
  return <CourseDetail />;
}
