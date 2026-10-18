// Billing countries offered at checkout with their international dialing codes.
// Names are rendered with Intl.DisplayNames so both locales stay in sync without message entries.
export const BILLING_COUNTRIES = [
  ["EG", "20"], ["SA", "966"], ["AE", "971"], ["KW", "965"], ["QA", "974"],
  ["BH", "973"], ["OM", "968"], ["JO", "962"], ["LB", "961"], ["IQ", "964"],
  ["PS", "970"], ["SY", "963"], ["YE", "967"], ["LY", "218"], ["TN", "216"],
  ["DZ", "213"], ["MA", "212"], ["SD", "249"], ["MR", "222"], ["TR", "90"],
  ["US", "1"], ["CA", "1"], ["GB", "44"], ["DE", "49"], ["FR", "33"],
  ["IT", "39"], ["ES", "34"], ["NL", "31"], ["IN", "91"], ["PK", "92"],
  ["NG", "234"], ["KE", "254"], ["ZA", "27"], ["MY", "60"], ["ID", "62"],
  ["AU", "61"],
] as const;

export type BillingCountry = (typeof BILLING_COUNTRIES)[number][0];

export const DEFAULT_BILLING_COUNTRY: BillingCountry = "EG";

export function billingCountryOptions(locale: string) {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  return BILLING_COUNTRIES.map(([code]) => ({ code, label: names.of(code) ?? code })).sort((a, b) =>
    a.code === DEFAULT_BILLING_COUNTRY
      ? -1
      : b.code === DEFAULT_BILLING_COUNTRY
        ? 1
        : a.label.localeCompare(b.label, locale),
  );
}

export function dialCode(country: string) {
  return BILLING_COUNTRIES.find(([code]) => code === country)?.[1] ?? null;
}

// Builds an E.164 number from a national number typed by the learner; null when invalid.
export function toE164(country: string, national: string) {
  const dial = dialCode(country);
  const digits = national.replace(/[\s().-]/g, "").replace(/^0+/, "");
  if (!dial || !/^[0-9]{4,14}$/.test(digits)) return null;
  const value = `+${dial}${digits}`;
  return /^\+[1-9][0-9]{6,14}$/.test(value) ? value : null;
}

// Splits a stored E.164 number back into the national part for the given country.
export function nationalNumber(country: string, e164: string | null) {
  const dial = dialCode(country);
  if (!e164 || !dial || !e164.startsWith(`+${dial}`)) return "";
  return e164.slice(dial.length + 1);
}
