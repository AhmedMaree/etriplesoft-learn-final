/**
 * Course, module and team-bio records are English editorial content (docs/I18N.md).
 * Spread onto elements that render it so Arabic pages keep correct direction and punctuation.
 */
export const EN = { lang: "en", dir: "ltr" } as const;

export const AR = { lang: "ar", dir: "rtl" } as const;

/** Language and direction for course editorial text, set explicitly so mixed Arabic/English sentences stay right-to-left. */
export function contentAttrs(contentLang: "en" | "ar" | undefined) {
  return contentLang === "ar" ? AR : EN;
}
