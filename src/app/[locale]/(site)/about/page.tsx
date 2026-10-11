import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { AboutPage } from "@/features/marketing/components/company/about-page";
import { getMarketingMessages } from "@/features/marketing/lib/messages";
import { marketingMetadata } from "@/features/marketing/lib/page-meta";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { about } = getMarketingMessages(locale);
  return marketingMetadata(locale, about.metaTitle, about.metaDescription, "/about");
}

export default async function About({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <AboutPage locale={locale} />;
}
