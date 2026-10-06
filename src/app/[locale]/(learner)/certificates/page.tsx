import { createPageMetadata } from "@/i18n/page-metadata";
import { PageHeading } from "@/components/layout/page-heading";
import { Certificates } from "@/features/certificates/components/certificates";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "certificates", "/certificates");
}

export default function CertificatesRoute() {
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
