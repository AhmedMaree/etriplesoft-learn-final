import { createPageMetadata } from "@/i18n/page-metadata";
import { SignUp } from "@/features/auth/components/sign-up";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "signUp", "/sign-up");
}

export default function SignUpRoute() {
  return <SignUp />;
}
