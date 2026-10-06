import { createPageMetadata } from "@/i18n/page-metadata";
import { PageHeading } from "@/components/layout/page-heading";
import { Payment } from "@/features/checkout/components/payment";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "checkout", "/payment");
}

export default function PaymentRoute() {
  return (
    <>
      <PageHeading
        page="payment"
        title="Complete Your Enrollment"
        subtitle="Secure your spot and start learning with ETripleSoft Learn."
      />
      <Payment />
    </>
  );
}
