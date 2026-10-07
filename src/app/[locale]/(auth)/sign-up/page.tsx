import { createPageMetadata } from "@/i18n/page-metadata";
import { AuthPage } from "@/features/auth/components/auth-page";
import { getCurrentUser } from "@/lib/supabase/auth";
import { safeReturnPath } from "@/lib/supabase/auth-redirects";
import { isLocale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "signUp", "/sign-up");
}

export default async function SignUpRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ locale: localeValue }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(localeValue)) notFound();
  const next = safeReturnPath(localeValue, query.next);
  if (await getCurrentUser()) redirect(next);
  return <AuthPage locale={localeValue} mode="signup" next={next} />;
}
