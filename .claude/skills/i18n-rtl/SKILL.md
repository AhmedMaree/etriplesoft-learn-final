---
name: i18n-rtl
description: Use when implementing or reviewing English/Arabic localization, locale routing, translated UI, RTL/LTR layouts, Arabic typography, directional controls, or bilingual responsive behavior in ETripleSoft Learn.
---

# Internationalization and RTL

Use this skill for ETripleSoft Learn localization and bilingual frontend work. Follow `AGENTS.md`, the approved design, and [docs/I18N.md](../../../docs/I18N.md); this skill does not authorize restructuring or redesign by itself.

## Product and architecture rules

- Supported locales are English `en` (LTR) and Arabic `ar` (RTL); default locale is `en`.
- Use the planned `next-intl` solution for locale routing, UI messages in Server and Client Components, locale-aware navigation/switching, date/number formatting, and pluralization. During implementation, consult the installed Next.js and `next-intl` docs for current APIs.
- The target route tree is shared under `src/app/[locale]/`. The locale layout sets `lang` and `dir` centrally (`en`/`ltr`, `ar`/`rtl`). Route groups stay out of public URLs.
- Share pages, feature logic, and components. Do not create language-specific component/page trees or repeated locale ternaries. Use feature-organized messages and extract UI strings incrementally.
- UI labels belong in message resources such as `messages/en.json` and `messages/ar.json`. Course, lesson, instructor, question, and choice content belongs to a future database localization design; do not put substantial LMS content in message JSON or invent its schema.

## RTL and visual behavior

- Preserve the approved visual identity and page composition in both locales. Localization is not permission to redesign.
- Prefer logical CSS properties where appropriate. Review physical left/right styles contextually; do not mechanically rewrite all of them or build a huge global `[dir="rtl"]` override sheet.
- Adapt directional arrows, chevrons, breadcrumbs, back/next controls, progression, navigation, pagination, and icon/text ordering according to meaning.
- Do not mirror logos, brand marks, screenshots, photos, video, meaning-sensitive charts, play/download symbols, or non-directional icons automatically.
- Arabic font selection is TBD until visual evaluation. Review Arabic glyphs, line height, wrapping, weights, controls, paragraph density, and clipping independently. Do not carry Latin letter spacing into Arabic without validation.
- Check mixed Arabic and English technical content. Keep code, URLs, IDs, email addresses, and other LTR values legible in RTL contexts; preserve product terminology such as Odoo, Python, PostgreSQL, API, and CRM.
- Keep AI interface locale, course/source language, and requested answer language independent. Assessment scoring/attempt logic remains language-independent; question presentation can be localized. Future certificates must allow a locale choice without deciding output language now.

## Implementation and QA

1. Inspect current route, component, styling, message, and interaction patterns before editing. Read relevant repository documentation and the current framework/library guide when implementing routing or APIs.
2. Keep translation keys organized by feature/domain and use locale-aware formatting instead of concatenated values.
3. Verify both English and Arabic at 320, 375, 430, 768, 1024, 1280, 1440, and 1920px. Check direction, wrapping, typography, navigation/arrows, forms, icon order, cards, artwork, mixed-direction strings, and overflow.
4. Add or update representative locale route coverage with parameterized tests where practical; do not duplicate every E2E case for each locale.

Apply this skill for frontend components with user-visible text or direction, layouts, navigation, forms, and metadata when localization is in scope. It is mandatory for major frontend restructuring, new reusable UI with text/direction, locale routing changes, Arabic implementation, and RTL bug fixes. For visual changes also follow `visual-parity` and `responsive-qa` as required by `AGENTS.md`.
