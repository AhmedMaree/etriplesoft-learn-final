import type { Metadata } from "next";
import { notFound } from "next/navigation";
import localFont from "next/font/local";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { LegacyHashRedirect } from "@/components/layout/legacy-hash-redirect";
import { ToastViewport } from "@/components/shared/toast-viewport";
import "../../styles.css";
import "../../refinements.css";

const learnFont = localFont({
  src: "../../../public/assets/learn-font.woff2",
  display: "swap",
  weight: "100 900",
});

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  if (!hasLocale(routing.locales, requestedLocale)) notFound();
  const locale = requestedLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    metadataBase: new URL("https://learn.etriplesoft.com"),
    title: { default: t("title"), template: "%s | ETripleSoft Learn" },
    description: t("description"),
    icons: { icon: "/assets/etriplesoft-icon.png" },
    alternates: {
      canonical: new URL(getPathname({ locale, href: "/" }), "https://learn.etriplesoft.com"),
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body className={learnFont.className}>
        <NextIntlClientProvider>
          <LegacyHashRedirect />
          {children}
          <ToastViewport />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
