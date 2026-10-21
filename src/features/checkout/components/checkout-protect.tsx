import { Check, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** "Your purchase is protected" panel shared by every checkout step. */
export function CheckoutProtect() {
  const t = useTranslations("realCheckout");
  return (
    <section
      className="checkout-protect"
      aria-labelledby="checkout-protect-title"
    >
      <h2 id="checkout-protect-title">
        <ShieldCheck aria-hidden="true" />
        {t("protectedTitle")}
      </h2>
      <ul>
        <li>
          <Check aria-hidden="true" />
          <span>
            <strong>{t("guaranteeTitle")}</strong>
            {t("guaranteeText")}{" "}
            <Link href="/refund-policy">{t("refundPolicy")}</Link>
          </span>
        </li>
        <li>
          <Check aria-hidden="true" />
          <span>
            <strong>{t("instantTitle")}</strong>
            {t("instantText")}
          </span>
        </li>
        <li>
          <Check aria-hidden="true" />
          <span>
            <strong>{t("secureTitle")}</strong>
            {t("secureText")}
          </span>
        </li>
      </ul>
    </section>
  );
}
