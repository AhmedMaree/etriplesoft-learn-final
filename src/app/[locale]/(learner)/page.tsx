import { createPageMetadata } from "@/i18n/page-metadata";
import { OverviewPage } from "@/features/dashboard/components/overview-page";
import { isLocale } from '@/i18n/config'
import { notFound } from 'next/navigation'
import { requireAuthenticatedUser } from '@/lib/supabase/auth'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "overview", "/");
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: value } = await params
  if (!isLocale(value)) notFound()
  await requireAuthenticatedUser(value, `/${value}`)
  return <OverviewPage />;
}
