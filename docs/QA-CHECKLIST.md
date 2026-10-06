# QA checklist

## Route and behavior coverage

- [ ] `/` and `/overview` render the same overview.
- [ ] All named routes render: courses, AI assistant, community, messages, calendar, certificates, settings, course detail, assessment, payment, and signup.
- [ ] Legacy fragment links still resolve.
- [ ] Search and filtering, signup demo, settings persistence, assessment, calendar download, checkout demo, and mobile navigation work.
- [ ] Profile image, clipboard, print, and browser downloads remain available.

## Responsive checks

Check 320, 375, 430, 768, 1024, 1280, 1440, and 1920 pixels. Verify horizontal overflow, sidebar/drawer, grids, cards, forms, calendar, assessment, certificate, checkout, and settings.

## Bilingual and RTL checks

For each significant frontend feature after locale support is implemented, verify English and Arabic on desktop, tablet, and mobile at every required width: 320, 375, 430, 768, 1024, 1280, 1440, and 1920 pixels. Use representative routes in both locales; parameterize locale coverage where practical instead of duplicating every end-to-end test.

- [ ] Document language and direction are correct: English `lang="en" dir="ltr"`; Arabic `lang="ar" dir="rtl"`.
- [ ] Text wrapping, alignment, typography, line height, control height, and text clipping work in both languages.
- [ ] Arrows, chevrons, breadcrumbs, previous/next controls, navigation, pagination, and icon/text order follow directional meaning.
- [ ] Forms, labels, errors, input icons, dropdowns, and LTR values such as email addresses, URLs, IDs, and code remain readable.
- [ ] Cards, grids, artwork placement, sidebar/drawer, tabs, and buttons adapt without unintended overflow.
- [ ] Mixed Arabic and technical English terms remain ordered and legible.
- [ ] Logos, brand marks, photographs, screenshots, and non-directional icons are not mirrored accidentally.

Representative locale routes covered by the route matrix: `/en`, `/ar`, `/en/courses`, `/ar/courses`, `/en/settings`, `/ar/settings`, `/en/assessment`, `/ar/assessment`, `/en/sign-up`, and `/ar/sign-up`.

## Release checks

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test` / `npx playwright test`
- [x] `npm run build`
- [x] No page or console errors and no broken images on sampled localized routes.
- [ ] Compare key pages against the approved visual references.

## Verification record (2026-10-06)

- Playwright: 13 tests passed, including all localized routes at 320, 375, 430, 768, 1024, 1280, 1440, and 1920px with document direction and horizontal-overflow assertions.
- Manual locale switch checks passed in both directions for overview, courses, settings, assessment, and signup; the courses query string was preserved.
- Typecheck, lint, and production build passed.
- This run checked responsive overflow and route rendering, not screenshot parity at every width. Arabic font fallback/glyph coverage is not verified, and a hardcoded-string sweep found English UI copy remaining on settings, calendar, checkout, certificate summary, and some accessible control labels. Keep the related visual and translation checklist items open until those are reviewed.
