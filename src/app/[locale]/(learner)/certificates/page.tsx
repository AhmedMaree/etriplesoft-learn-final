import { createPageMetadata } from "@/i18n/page-metadata";
import { PageHeading } from "@/components/layout/page-heading";
import { Certificates } from "@/features/certificates/components/certificates";
import { isLocale } from '@/i18n/config'
import { notFound } from 'next/navigation'
import { requireAuthenticatedUser } from '@/lib/supabase/auth'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "certificates", "/certificates");
}

export default async function CertificatesRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  await requireAuthenticatedUser(locale, `/${locale}/certificates`)
  return (
    <>
      <PageHeading
        page="certificates"
        title="Certifications"
        subtitle="Track your learning journey and celebrate your achievements."
      />
      <Certificates />
    </>
  );
}
