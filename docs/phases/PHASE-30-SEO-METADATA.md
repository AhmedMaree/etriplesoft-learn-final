# Phase 30 — SEO / Metadata / Public Discoverability

## 1. Status

IN PROGRESS

Evidence: src/i18n/page-metadata.ts and locale layout generate localized metadata/canonicals; tests check Arabic courses canonical. No sitemap/robots route is present. Production origin is hardcoded and not verified.

## 2. Goal

Finish public course/path/verification indexing policy.

## 3. Why This Phase Exists

This phase owns seo / metadata / public discoverability. Its verified contract enables [Phase 36](PHASE-36-CONTENT-TRANSLATION-AUDIT.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 09](PHASE-09-COURSE-CONTENT-INTEGRATION.md), [Phase 18](PHASE-18-CERTIFICATES.md), [Phase 21](PHASE-21-LEARNING-PATHS.md)

Blocks: [Phase 36](PHASE-36-CONTENT-TRANSLATION-AUDIT.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

src/i18n/page-metadata.ts and locale layout generate localized metadata/canonicals; tests check Arabic courses canonical. No sitemap/robots route is present. Production origin is hardcoded and not verified.

Update 2026-10-08: the public marketing pages (landing, catalog, course detail, paths, modules, about, contact, help, legal) now emit per-locale titles, descriptions and canonical paths via `src/features/marketing/lib/page-meta.ts`; the FAQ emits FAQPage JSON-LD. Still missing: sitemap, robots, alternate-language links and Open Graph images; production origin is still hardcoded. Their content is JSON-backed until Phases 09/21.

## 6. In Scope

- Finish public course/path/verification indexing policy
- Add sitemap/robots and localized canonical/alternate handling
- Keep private/auth/checkout/admin surfaces out of indexing

## 7. Out of Scope

New marketing site, invented ratings and paid SEO tooling.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

OPEN / DEFERRED: D23 — see [decision register](OPEN-DECISIONS.md).

## 9. Database Work

Not applicable.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. No new database permissions in this phase; preserve existing boundaries.

## 11. Backend / Server Work

Generate public metadata from exact-locale published content; cache/revalidate publication changes; verify deployment origin.

## 12. Frontend Work

Public titles/descriptions/social metadata and route not-found behavior.

## 13. English / Arabic

Verify English, Arabic, RTL, mixed LTR identifiers/email/code, Western digits, localized validation and metadata where applicable. Translate UI in messages; domain text uses the phase’s database translation records. Exact-locale content never silently falls back. Public titles/descriptions/social metadata and route not-found behavior.

## 14. Responsive Requirements

Required: 320, 375, 430, 768, 1024, 1280, 1440 and 1920px in BOTH en/LTR and ar/RTL. Verify actual authorized screen, overflow, wrapping, stacking, artwork, controls, navigation and error states.

## 15. Accessibility

Keyboard access, visible focus, semantic controls/headings, labels and linked errors, justified ARIA, contrast, screen-reader announcements, reduced motion and media alternatives. Review phase-specific controls in section 12.

## 16. Security Requirements

- Sitemap/metadata never reveals draft titles or learner data

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Avoid unnecessary client bundles, network calls or full dataset rendering. For documentation-only work this is not applicable.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Finish public course/path/verification indexing policy
4. Add sitemap/robots and localized canonical/alternate handling
5. Keep private/auth/checkout/admin surfaces out of indexing
6. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
7. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- Test published-only sitemap, correct canonical/hreflang and missing translation
- Test private/auth/admin robots policy
- Validate structured data only reflects real supported content

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

## 20. Manual Verification

- [ ] Manually exercise and inspect: Test published-only sitemap, correct canonical/hreflang and missing translation.
- [ ] Manually exercise and inspect: Test private/auth/admin robots policy.
- [ ] Manually exercise and inspect: Validate structured data only reflects real supported content.
- [ ] Review success, empty, invalid, loading and failure states as the intended role in EN/AR.
- [ ] Verify all eight widths, keyboard/focus and mixed technical values.

## 21. Security Verification

- [ ] Sitemap/metadata never reveals draft titles or learner data

## 22. Data Verification

Not applicable to new schema. Verify displayed/imported data or configuration against its authoritative source; no fabricated success evidence.

## 23. Acceptance Criteria

- [ ] Finish public course/path/verification indexing policy
- [ ] Add sitemap/robots and localized canonical/alternate handling
- [ ] Keep private/auth/checkout/admin surfaces out of indexing
- [ ] Every required predecessor is VERIFIED and blocking decisions are resolved.
- [ ] Phase-specific automated and negative cases pass with retained evidence.
- [ ] Manual checks pass; documentation and status tables match.
- [ ] English and Arabic, accessibility, approved visual parity and all eight widths pass.
- [ ] Typecheck, lint, relevant tests and production build pass for implementation changes.

## 24. Evidence Required

Record date, operator, commit plus dirty diff/artifact hash, environment, exact commands, exit codes and test counts. Attach phase-specific results from sections 19–22; for UI attach EN/AR screenshots at all eight widths and manual reviewer sign-off. For data attach migration IDs, generated-type comparison and anonymous/owner/cross-user/admin/RPC/storage results. For providers attach redacted sandbox/production receipts, replay/recovery outcomes and configuration evidence. Never include credentials or real learner PII.

## 25. Rollback / Recovery

Disable the affected entry point, preserve records and evidence, and revert only the reviewed application change. Use a forward corrective migration for persisted data; never reset a shared database.

## 26. Documentation Updates

Update this phase, ../PROJECT-ROADMAP.md, VERIFICATION-MATRIX.md, OPEN-DECISIONS.md and PRODUCTION-READINESS.md. Update ../ARCHITECTURE.md, ../ROUTES.md, ../I18N.md, ../DATABASE-ARCHITECTURE.md, ../SECURITY.md or ../QA-CHECKLIST.md only where behavior/contracts changed. Preserve unrelated user edits.

## 27. Completion Gate

PHASE IMPLEMENTED:
NO

AUTOMATED VERIFICATION:
NOT RUN

MANUAL VERIFICATION:
NOT RUN

SECURITY VERIFICATION:
FAIL

EN/AR VERIFICATION:
FAIL

READY TO MARK VERIFIED:
NO

READY FOR NEXT PHASE:
NO

FAIL here means the required gate has not been demonstrated; it is not a claim that an executed test failed. The requested gate vocabulary has no NOT RUN value for security/EN/AR. Automated/manual NOT RUN refer to this canonical phase gate, not denial of historical partial checks.

## 28. Next Phase

Recommended sequential candidate: [Phase 31](PHASE-31-ACCESSIBILITY.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.
