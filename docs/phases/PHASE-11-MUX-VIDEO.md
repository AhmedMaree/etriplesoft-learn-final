# Phase 11 — Protected Video / Mux Infrastructure

## 1. Status

PLANNED

Evidence: No Mux dependency, asset metadata table or signing endpoint exists. Current course detail uses static artwork.

## 2. Goal

Store locale-specific or explicitly neutral video metadata.

## 3. Why This Phase Exists

This phase owns protected video / mux infrastructure. Its verified contract enables [Phase 12](PHASE-12-LEARNING-PLAYER.md), [Phase 27](PHASE-27-COURSE-ADMINISTRATION.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 08](PHASE-08-CURRICULUM-DOMAIN.md), [Phase 10](PHASE-10-ENROLLMENT-ENTITLEMENTS.md)

Blocks: [Phase 12](PHASE-12-LEARNING-PLAYER.md), [Phase 27](PHASE-27-COURSE-ADMINISTRATION.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

No Mux dependency, asset metadata table or signing endpoint exists. Current course detail uses static artwork.

## 6. In Scope

- Store locale-specific or explicitly neutral video metadata
- Process authenticated provider asset lifecycle events
- Issue short-lived signed playback after authoritative entitlement checks

## 7. Out of Scope

Progress credit, learner player UI and Supabase video-byte storage.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

OPEN / DEFERRED: D13; D15 — see [decision register](OPEN-DECISIONS.md). The user confirmed on 2026-10-11 that English and Arabic course versions use the same video assets; model shared assets as explicitly language-neutral while keeping playback authorization server-side.

## 9. Database Work

lesson_videos with lesson FK, provider asset uniqueness, exact-locale/neutral exclusivity, states and durations; provider metadata server-only. Restrict deletion with progress history.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. Use this phase’s domain rules above and ../DATABASE-ARCHITECTURE.md. Protected translations require parent publication AND entitlement; catalog translations require publication but not enrollment. Locale selection alone never grants access.

## 11. Backend / Server Work

Server-only provider adapter, authenticated upload workflow and verified idempotent webhook handling; short-lived token issuance and revocation policy.

## 12. Frontend Work

Not applicable beyond infrastructure error contracts; player is Phase 12.

## 13. English / Arabic

No new user-facing UI. Preserve EN/AR locale constraints and exact-locale contracts where data is involved; downstream user-facing phase must verify presentation.

## 14. Responsive Requirements

Not applicable to this phase’s UI; downstream consuming UI must pass all eight widths in both locales.

## 15. Accessibility

Not applicable to new UI; preserve accessible error/data contracts for consumers.

## 16. Security Requirements

- Reject forged/replayed provider events
- No signing secret or private asset metadata in browser
- User cannot request playback for another course by substituting IDs

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Bound list queries and paginate; measure query counts and avoid per-record N+1. Index actual parent/owner/locale access paths. Never share-cache private responses. Measure provider latency where used.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Review constraints, indexes, FKs/deletion, grants/RLS and transaction boundaries for section 9. Only where this phase owns schema changes, create ordered migrations, add necessary DEV-only fixtures and regenerate types. Verification/infrastructure phases must not introduce new schema outside their stated scope.
4. Store locale-specific or explicitly neutral video metadata
5. Process authenticated provider asset lifecycle events
6. Issue short-lived signed playback after authoritative entitlement checks
7. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
8. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- Provider sandbox asset upload/ready/error and duplicate-event tests
- Signed playback succeeds only for entitled published locale
- Token expiry, revocation window and unsupported locale asset tests

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

Database/RLS: extend `supabase/tests/database/foundation_rls.sql` or new domain SQL suites and run `npm run db:test` in disposable local/CI Supabase. Extend `scripts/validate-hosted-rls.mjs` or a domain validator for hosted DEV and run the documented command; today `npm run db:test:hosted` covers identity only, so it cannot certify a new domain. Verify DEV target and supply credentials securely before any mutating test. Both policy behavior and constraint/transaction coverage are mandatory; environment unavailability is a blocker, not a pass.

## 20. Manual Verification

- [ ] Manually exercise and inspect: Provider sandbox asset upload/ready/error and duplicate-event tests.
- [ ] Manually exercise and inspect: Signed playback succeeds only for entitled published locale.
- [ ] Manually exercise and inspect: Token expiry, revocation window and unsupported locale asset tests.
- [ ] Review the phase-specific records/configuration/evidence against this contract.

## 21. Security Verification

- [ ] Reject forged/replayed provider events
- [ ] No signing secret or private asset metadata in browser
- [ ] User cannot request playback for another course by substituting IDs

## 22. Data Verification

lesson_videos with lesson FK, provider asset uniqueness, exact-locale/neutral exclusivity, states and durations; provider metadata server-only. Restrict deletion with progress history.

Verify uniqueness, parent/owner relationships, ordering, exact-locale translations, deletion/history preservation, idempotency and generated-type alignment using actual inserted/read rows. Exercise rollback on an invalid multi-record write.

## 23. Acceptance Criteria

- [ ] Store locale-specific or explicitly neutral video metadata
- [ ] Process authenticated provider asset lifecycle events
- [ ] Issue short-lived signed playback after authoritative entitlement checks
- [ ] Every required predecessor is VERIFIED and blocking decisions are resolved.
- [ ] Phase-specific automated and negative cases pass with retained evidence.
- [ ] Manual checks pass; documentation and status tables match.
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
NOT APPLICABLE

READY TO MARK VERIFIED:
NO

READY FOR NEXT PHASE:
NO

FAIL here means the required gate has not been demonstrated; it is not a claim that an executed test failed. The requested gate vocabulary has no NOT RUN value for security/EN/AR. Automated/manual NOT RUN refer to this canonical phase gate, not denial of historical partial checks.

## 28. Next Phase

Recommended sequential candidate: [Phase 12](PHASE-12-LEARNING-PLAYER.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.
