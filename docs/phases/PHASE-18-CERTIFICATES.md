# Phase 18 — Certificates

## 1. Status

IN_PROGRESS

Evidence: certificates.tsx displays Ahmed Salah, March 2024 dates and fixed achievements. certificate-actions.tsx prints the page and copies its URL. Auth protection exists, but no issuance/verification backend.

## DEV implementation checkpoint — 2026-10-14

User-authorized learning continuation implements the relevant domain/services and UI described in [the learning guide](../LEARNING-FEATURES-GUIDE.md). Local automated evidence and hosted transactional checks exist. Full phase manual, content, operational and predecessor acceptance gates remain open; this is not VERIFIED. The earlier current-state descriptions below are baseline audit evidence, superseded by this checkpoint for implemented paths. Phase 27 is partial: quiz authoring, video management and audited operator resource/curriculum operations exist; full course/path/resource administration is not complete.

## 2. Goal

Issue certificates only from authoritative completion.

## 3. Why This Phase Exists

This phase owns certificates. Its verified contract enables [Phase 22](PHASE-22-LEARNER-DASHBOARD.md), [Phase 28](PHASE-28-LEARNER-ADMINISTRATION.md), [Phase 30](PHASE-30-SEO-METADATA.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 17](PHASE-17-COURSE-COMPLETION.md), [Phase 06](PHASE-06-ADMIN-AUTHORIZATION.md)

Blocks: [Phase 22](PHASE-22-LEARNER-DASHBOARD.md), [Phase 28](PHASE-28-LEARNER-ADMINISTRATION.md), [Phase 30](PHASE-30-SEO-METADATA.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

certificates.tsx displays Ahmed Salah, March 2024 dates and fixed achievements. certificate-actions.tsx prints the page and copies its URL. Auth protection exists, but no issuance/verification backend.

## 6. In Scope

- Issue certificates only from authoritative completion
- Support selected EN/AR output and public opaque-token verification
- Revoke/reissue with immutable history and remove fabricated learner achievements

## 7. Out of Scope

Badges/streak system and unapproved bilingual combined design.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

OPEN / DEFERRED: D06; D03 — see [decision register](OPEN-DECISIONS.md).

## 9. Database Work

certificates with completion FK, unique number/token hash, one active certificate/completion, locale, snapshots and replacement/revocation links. Private certificate-files only if download format approved.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. Use this phase’s domain rules above and ../DATABASE-ARCHITECTURE.md. Protected translations require parent publication AND entitlement; catalog translations require publication but not enrollment. Locale selection alone never grants access.

## 11. Backend / Server Work

Atomic issue/revoke/reissue and narrow public verification projection; renderer handles Arabic text and valid historical snapshots.

## 12. Frontend Work

/certificates and proposed public verification route; real owner values, empty state, printable/downloadable approved layout.

## 13. English / Arabic

Verify English, Arabic, RTL, mixed LTR identifiers/email/code, Western digits, localized validation and metadata where applicable. Translate UI in messages; domain text uses the phase’s database translation records. Exact-locale content never silently falls back. /certificates and proposed public verification route; real owner values, empty state, printable/downloadable approved layout.

## 14. Responsive Requirements

Required: 320, 375, 430, 768, 1024, 1280, 1440 and 1920px in BOTH en/LTR and ar/RTL. Verify actual authorized screen, overflow, wrapping, stacking, artwork, controls, navigation and error states.

## 15. Accessibility

Keyboard access, visible focus, semantic controls/headings, labels and linked errors, justified ARIA, contrast, screen-reader announcements, reduced motion and media alternatives. Review phase-specific controls in section 12.

## 16. Security Requirements

- Client score or URL cannot issue certificate
- Public lookup exposes no internal IDs/private profile
- Revoked token cannot show active status

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Bound list queries and paginate; measure query counts and avoid per-record N+1. Index actual parent/owner/locale access paths. Never share-cache private responses. Measure provider latency where used.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Review constraints, indexes, FKs/deletion, grants/RLS and transaction boundaries for section 9. Only where this phase owns schema changes, create ordered migrations, add necessary DEV-only fixtures and regenerate types. Verification/infrastructure phases must not introduce new schema outside their stated scope.
4. Issue certificates only from authoritative completion
5. Support selected EN/AR output and public opaque-token verification
6. Revoke/reissue with immutable history and remove fabricated learner achievements
7. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
8. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- Duplicate concurrent issuance yields one active certificate
- Verify valid/revoked/reissued/unknown token and privacy projection
- Review EN/AR rendering, print/download and immutable old course/name snapshots

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

Database/RLS: extend `supabase/tests/database/foundation_rls.sql` or new domain SQL suites and run `npm run db:test` in disposable local/CI Supabase. Extend `scripts/validate-hosted-rls.mjs` or a domain validator for hosted DEV and run the documented command; today `npm run db:test:hosted` covers identity only, so it cannot certify a new domain. Verify DEV target and supply credentials securely before any mutating test. Both policy behavior and constraint/transaction coverage are mandatory; environment unavailability is a blocker, not a pass.

## 20. Manual Verification

- [ ] Manually exercise and inspect: Duplicate concurrent issuance yields one active certificate.
- [ ] Manually exercise and inspect: Verify valid/revoked/reissued/unknown token and privacy projection.
- [ ] Manually exercise and inspect: Review EN/AR rendering, print/download and immutable old course/name snapshots.
- [ ] Review success, empty, invalid, loading and failure states as the intended role in EN/AR.
- [ ] Verify all eight widths, keyboard/focus and mixed technical values.

## 21. Security Verification

- [ ] Client score or URL cannot issue certificate
- [ ] Public lookup exposes no internal IDs/private profile
- [ ] Revoked token cannot show active status

## 22. Data Verification

certificates with completion FK, unique number/token hash, one active certificate/completion, locale, snapshots and replacement/revocation links. Private certificate-files only if download format approved.

Verify uniqueness, parent/owner relationships, ordering, exact-locale translations, deletion/history preservation, idempotency and generated-type alignment using actual inserted/read rows. Exercise rollback on an invalid multi-record write.

## 23. Acceptance Criteria

- [ ] Issue certificates only from authoritative completion
- [ ] Support selected EN/AR output and public opaque-token verification
- [ ] Revoke/reissue with immutable history and remove fabricated learner achievements
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

Recommended sequential candidate: [Phase 19](PHASE-19-ORDERS-CHECKOUT.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.
