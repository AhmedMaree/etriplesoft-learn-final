import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { RefundPolicy } from "@/features/marketing/components/legal/refund-policy";
import { getMarketingMessages } from "@/features/marketing/lib/messages";
import { marketingMetadata } from "@/features/marketing/lib/page-meta";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { refund } = getMarketingMessages(locale).legal;
  return marketingMetadata(locale, refund.metaTitle, refund.metaDescription, "/refund-policy");
}

export default async function RefundPolicyPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <RefundPolicy locale={locale} />;
}
