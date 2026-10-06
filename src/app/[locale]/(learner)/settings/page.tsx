import { createPageMetadata } from "@/i18n/page-metadata";
import { PageHeading } from "@/components/layout/page-heading";
import { SettingsPage } from "@/features/settings/components/settings-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "settings", "/settings");
}

export default function SettingsRoute() {
  return (
    <>
      <PageHeading
        page="settings"
        title="Settings"
        subtitle="Manage your account, preferences, and learning experience."
      />
      <SettingsPage />
    </>
  );
}
