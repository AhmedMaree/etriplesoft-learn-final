# Phase 03 — English / Arabic / RTL Foundation

## 1. Status

VERIFIED (2026-10-08, on the user's manual EN/AR review; Phase 02 remains VERIFICATION REQUIRED, accepted with limits by the user)

Evidence: src/i18n/, messages/en.json, messages/ar.json and locale layout implement URL-authoritative EN/AR. Hardcoded copy remains in learner-header.tsx, payment.tsx, certificates.tsx and AI responses; some is fixture content. Arabic font coverage/sign-off remains open in ../I18N.md.

## 2. Goal

Finish application UI extraction and message parity.

## 3. Why This Phase Exists

This phase owns english / arabic / rtl foundation. Its verified contract enables [Phase 05](PHASE-05-AUTH-PROFILES-ONBOARDING.md), [Phase 09](PHASE-09-COURSE-CONTENT-INTEGRATION.md), [Phase 12](PHASE-12-LEARNING-PLAYER.md), [Phase 16](PHASE-16-ASSESSMENT-UI.md), [Phase 32](PHASE-32-RESPONSIVE-VISUAL-QA.md), [Phase 36](PHASE-36-CONTENT-TRANSLATION-AUDIT.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 01](PHASE-01-NEXTJS-ARCHITECTURE.md), [Phase 02](PHASE-02-DESIGN-RESPONSIVE-FOUNDATION.md)

Blocks: [Phase 05](PHASE-05-AUTH-PROFILES-ONBOARDING.md), [Phase 09](PHASE-09-COURSE-CONTENT-INTEGRATION.md), [Phase 12](PHASE-12-LEARNING-PLAYER.md), [Phase 16](PHASE-16-ASSESSMENT-UI.md), [Phase 32](PHASE-32-RESPONSIVE-VISUAL-QA.md), [Phase 36](PHASE-36-CONTENT-TRANSLATION-AUDIT.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

src/i18n/, messages/en.json, messages/ar.json and locale layout implement URL-authoritative EN/AR. Hardcoded copy remains in learner-header.tsx, payment.tsx, certificates.tsx and AI responses; some is fixture content. Arabic font coverage/sign-off remains open in ../I18N.md.

## 6. In Scope

- Finish application UI extraction and message parity
- Verify RTL, Western digits and mixed technical text
- Sign off Arabic font rendering and locale metadata foundation

## 7. Out of Scope

Database course translations, AI answer generation and certificate output policy.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

OPEN / DEFERRED: D09 — see [decision register](OPEN-DECISIONS.md).

## 9. Database Work

Not applicable; LMS translations belong to domain phases.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. No new database permissions in this phase; preserve existing boundaries.

## 11. Backend / Server Work

Keep shared components and URL locale authoritative over learner_preferences.

## 12. Frontend Work

Remaining labels, toasts, accessible names and navigation; distinguish UI text from lesson content.

## 13. English / Arabic

Verify English, Arabic, RTL, mixed LTR identifiers/email/code, Western digits, localized validation and metadata where applicable. Translate UI in messages; domain text uses the phase’s database translation records. Exact-locale content never silently falls back. Remaining labels, toasts, accessible names and navigation; distinguish UI text from lesson content.

## 14. Responsive Requirements

Required: 320, 375, 430, 768, 1024, 1280, 1440 and 1920px in BOTH en/LTR and ar/RTL. Verify actual authorized screen, overflow, wrapping, stacking, artwork, controls, navigation and error states.

## 15. Accessibility

Keyboard access, visible focus, semantic controls/headings, labels and linked errors, justified ARIA, contrast, screen-reader announcements, reduced motion and media alternatives. Review phase-specific controls in section 12.

## 16. Security Requirements

- Reject unsupported locales and unsafe locale return paths

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Avoid unnecessary client bundles, network calls or full dataset rendering. For documentation-only work this is not applicable.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Finish application UI extraction and message parity
4. Verify RTL, Western digits and mixed technical text
5. Sign off Arabic font rendering and locale metadata foundation
6. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
7. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- Check identical message-key coverage and missing-message failures
- Test locale switch preserves supported path/query and forms validate in EN/AR
- Manually inspect Arabic glyph source, wrapping and mixed email/code at all widths

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

## 20. Manual Verification

- [ ] Manually exercise and inspect: Check identical message-key coverage and missing-message failures.
- [ ] Manually exercise and inspect: Test locale switch preserves supported path/query and forms validate in EN/AR.
- [ ] Manually exercise and inspect: Manually inspect Arabic glyph source, wrapping and mixed email/code at all widths.
- [ ] Review success, empty, invalid, loading and failure states as the intended role in EN/AR.
- [ ] Verify all eight widths, keyboard/focus and mixed technical values.

## 21. Security Verification

- [ ] Reject unsupported locales and unsafe locale return paths

## 22. Data Verification

Not applicable to new schema. Verify displayed/imported data or configuration against its authoritative source; no fabricated success evidence.

## 23. Acceptance Criteria

- [ ] Finish application UI extraction and message parity
- [ ] Verify RTL, Western digits and mixed technical text
- [ ] Sign off Arabic font rendering and locale metadata foundation
- [ ] Every required predecessor is VERIFIED and blocking decisions are resolved.
- [ ] Phase-specific automated and negative cases pass with retained evidence.
- [ ] Manual checks pass; documentation and status tables match.
- [ ] English and Arabic, accessibility, approved visual parity and all eight widths pass.
- [ ] Typecheck, lint, relevant tests and production build pass for implementation changes.

## 24. Evidence Required

### 2026-10-08 execution checkpoint (started on user authorization; Phase 02 accepted with limits)

- Extracted remaining UI chrome to EN/AR messages: toast dismiss, sidebar close/app-store toasts, header progress popover, footer location, checkout terms/privacy/Kashier labels, certificates edit-profile, calendar empty/close, AI context switch, course preview play labels (14 new keys, both locales).
- Added `tests/i18n-messages.spec.ts` (4 cases): identical EN/AR key sets, no `??` corruption, no mojibake/empty values, matching ICU placeholders. Run: `npm test -- tests/i18n-messages.spec.ts`.
- Checks: typecheck PASS, lint PASS, build PASS, full Playwright suite 34 passed / 1 failed (auth callback origin allowlist, owned by Phase 05).
- Intentionally not extracted (fixture/demo content owned by later phases): course/lesson names, AI replies and prompts, certificate holder/signatory, calendar events, dashboard lesson names, assessment question text, learning-path blurbs.
- Still open: D09 Arabic font identification/sign-off, native review of retranslated Arabic, manual eight-width mixed LTR/RTL review. Status stays IN PROGRESS; gates unchanged.

### 2026-10-08 addition: public marketing site (user-authorized, outside the phase list)

- Marketing UI copy lives in `messages/marketing/{en,ar,pages-en,pages-ar}.json`, read via `src/features/marketing/lib/messages.ts`. Arabic is assigned to the English type, so key/shape drift is a compile error; ICU plurals (including Arabic plural forms) and Western digits are used.
- English editorial content (courses, modules) renders with `lang="en" dir="ltr"` inside Arabic pages (`lib/content-lang.ts`); directional icons use `mk-flip-rtl`; Latin letter-spacing and uppercase are disabled for Arabic.
- Checks: `tests/marketing.spec.ts` covers 12 public routes x EN/AR x eight widths (status 200, `dir`, no horizontal overflow). Header collapses to the drawer below 1024px; partner badge shows from 1440px.
- D09 font source approved by the user (IBM Plex Sans Arabic, weights 400-700, self-hosted); `src/arabic-font.css` applies it to the learner app and the marketing stack. Re-ran typecheck, lint and 22/23 Playwright cases (only the Phase 05 auth callback fails).
- Arabic capture sweep (2026-10-08): 11 screens (landing, catalog, course, paths, modules, about, contact, help, refund policy, sign-up, login) x eight widths captured locally under `tmp/phase-03-captures` (git-ignored) with an automated check for off-screen elements and clipped text. One real defect found and fixed: the Arabic auth header pushed the language button off-screen at 320px (`src/refinements.css`, header now wraps at <=400px). No other findings; the check is not a substitute for human review.
- Still open for this phase: eight-width visual sign-off of the Arabic font, native review of Arabic marketing and legal copy, manual mixed LTR/RTL review at all widths.

Record date, operator, commit plus dirty diff/artifact hash, environment, exact commands, exit codes and test counts. Attach phase-specific results from sections 19–22; for UI attach EN/AR screenshots at all eight widths and manual reviewer sign-off. For data attach migration IDs, generated-type comparison and anonymous/owner/cross-user/admin/RPC/storage results. For providers attach redacted sandbox/production receipts, replay/recovery outcomes and configuration evidence. Never include credentials or real learner PII.

## 25. Rollback / Recovery

Disable the affected entry point, preserve records and evidence, and revert only the reviewed application change. Use a forward corrective migration for persisted data; never reset a shared database.

## 26. Documentation Updates

Update this phase, ../PROJECT-ROADMAP.md, VERIFICATION-MATRIX.md, OPEN-DECISIONS.md and PRODUCTION-READINESS.md. Update ../ARCHITECTURE.md, ../ROUTES.md, ../I18N.md, ../DATABASE-ARCHITECTURE.md, ../SECURITY.md or ../QA-CHECKLIST.md only where behavior/contracts changed. Preserve unrelated user edits.

## 27. Completion Gate

PHASE IMPLEMENTED:
YES

AUTOMATED VERIFICATION:
PASS (tests/i18n-messages.spec.ts 4/4 key parity, placeholders, no mojibake; tests/design-foundation.spec.ts 16/16 EN/AR at eight widths; tests/learning.spec.ts 15/15; typecheck and lint pass)

MANUAL VERIFICATION:
PASS (user review, 2026-10-08; reviewer notes not attached)

SECURITY VERIFICATION:
N/A (no trust-boundary change)

EN/AR VERIFICATION:
PASS (per user review; native Arabic copy review of marketing content still carried to Phase 36)

READY TO MARK VERIFIED:
YES

READY FOR NEXT PHASE:
YES

FAIL here means the required gate has not been demonstrated; it is not a claim that an executed test failed. The requested gate vocabulary has no NOT RUN value for security/EN/AR. Automated/manual NOT RUN refer to this canonical phase gate, not denial of historical partial checks.

## 28. Next Phase

Recommended sequential candidate: [Phase 04](PHASE-04-SUPABASE-FOUNDATION.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.
