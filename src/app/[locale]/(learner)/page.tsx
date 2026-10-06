import { createPageMetadata } from "@/i18n/page-metadata";
import { OverviewPage } from "@/features/dashboard/components/overview-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "overview", "/");
}

export default function HomePage() {
  return <OverviewPage />;
}
