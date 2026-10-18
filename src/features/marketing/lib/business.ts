export const BUSINESS_DETAILS = {
  registeredBusinessName: null as string | null,
  tradingName: "ETripleSoft Learn",
  address: "New Cairo, Egypt",
  supportEmail: "info@etriplesoft.com",
  telephoneDisplay: "+20 100 210 6952",
  telephoneHref: "+201002106952",
  websiteLabel: "learn.etriplesoft.com",
  websiteUrl: "https://learn.etriplesoft.com",
  odooPartnerUrl: "https://www.odoo.com/partners/e-triplesoft-10996064",
  commercialRegistrationNumber: null as string | null,
  taxRegistrationNumber: null as string | null,
} as const;

/** Odoo serves its Arabic partner page under `/ar`; English is the unprefixed default. */
export function getOdooPartnerUrl(locale: string) {
  return locale === "ar"
    ? BUSINESS_DETAILS.odooPartnerUrl.replace("https://www.odoo.com/", "https://www.odoo.com/ar/")
    : BUSINESS_DETAILS.odooPartnerUrl;
}

export const LEGAL_POLICY_VERSIONS = {
  refundPolicy: "2026-09-06",
  privacyPolicy: "2026-10-08",
  termsOfService: "2026-10-08",
} as const;
