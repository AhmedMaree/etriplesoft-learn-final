import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { LegalDocument } from "@/features/marketing/components/legal/legal-document";
import { LEGAL_POLICY_VERSIONS } from "@/features/marketing/lib/business";
import { getMarketingMessages } from "@/features/marketing/lib/messages";
import { marketingMetadata } from "@/features/marketing/lib/page-meta";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { privacy } = getMarketingMessages(locale).legal;
  return marketingMetadata(locale, privacy.metaTitle, privacy.metaDescription, "/privacy");
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <LegalDocument locale={locale} doc="privacy" updated={LEGAL_POLICY_VERSIONS.privacyPolicy} />;
}
