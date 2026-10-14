# Phase 10 — Enrollment & Entitlements

## Approved supplement — 2026-10-14

The user explicitly approved audited administrator-granted course access while paid checkout remains later. Migration `20261014040126_admin_course_access` adds the distinct `admin` source and an idempotent current-admin RPC with typed audit target/reason. The localized `/admin/enrollments` form is tested; learners cannot grant access or enroll paid courses for free. The requested existing account received development-test access to Odoo Development, whose price is unchanged. The earlier verified free-enrollment phase remains historical evidence; this supplement has automated checks but pending user acceptance and does not complete Phase 28 administration.

## 1. Status

VERIFIED — 2026-10-12

Evidence (2026-10-12): Required predecessors 05, 07 and 08 are VERIFIED. D14 is APPROVED: completed learners retain access until revoked/expired; re-enrollment after completion creates a new history row; active learners use the current published curriculum while progress for unchanged lesson IDs is preserved. Local and Hosted DEV implementation/security checks pass (see section 24 and the verification matrix). The user reviewed the Phase 10 captures and explicitly approved the manual EN/AR visual/accessibility checklist on 2026-10-12. A simulated transient network/RPC retry and a pre-migration logical backup remain absent and are recorded limitations; they do not change the approved phase gate result.

## 2. Goal

Implement individual free enrollment and current entitlement checks.

## 3. Why This Phase Exists

This phase owns enrollment & entitlements. Its verified contract enables [Phase 11](PHASE-11-MUX-VIDEO.md), [Phase 12](PHASE-12-LEARNING-PLAYER.md), [Phase 14](PHASE-14-ASSESSMENT-DOMAIN.md), [Phase 19](PHASE-19-ORDERS-CHECKOUT.md), [Phase 25](PHASE-25-AI-ASSISTANT.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 05](PHASE-05-AUTH-PROFILES-ONBOARDING.md), [Phase 07](PHASE-07-COURSE-DOMAIN.md), [Phase 08](PHASE-08-CURRICULUM-DOMAIN.md)

Blocks: [Phase 11](PHASE-11-MUX-VIDEO.md), [Phase 12](PHASE-12-LEARNING-PLAYER.md), [Phase 14](PHASE-14-ASSESSMENT-DOMAIN.md), [Phase 19](PHASE-19-ORDERS-CHECKOUT.md), [Phase 25](PHASE-25-AI-ASSISTANT.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

Phase 10 enrollment history/RLS, trusted free grant and audited revoke RPCs, exact-locale lesson/resource entitlement RPCs, and free course detail enrollment UI are implemented locally and on Hosted DEV. A learner player/lesson route remains owned by later Phase 12; Phase 10 exposes the narrow authorized lesson/resource data operations for that consumer.

## 6. In Scope

- Implement individual free enrollment and current entitlement checks
- Preserve revoked/expired/re-enrolled history with no default V1 expiry
- Authorize exact-locale published lesson/resource access and explicit previews

## 7. Out of Scope

Payment processing, completion computation and organization enrollment.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

APPROVED: D14 — see [decision register](OPEN-DECISIONS.md). D13 is APPROVED.

## 9. Database Work

`enrollments` uses user/course/grantor/revoker FKs, explicit lifecycle timestamps, one active row per user/course, nullable expiry with no V1 default, and retained history. Completed enrollments remain entitled until revoked/expired; completed re-enrollment creates a new row. Do NOT reference absent `order_items`; Phase 19 adds paid-source FK and uniqueness. Owner/status, course/status and expiry access paths are indexed.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections and explicitly published lesson previews only; enrollment rows remain invisible under RLS. Learner: own enrollment data and entitled exact-locale content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. Use this phase’s domain rules above and ../DATABASE-ARCHITECTURE.md. Protected translations require parent publication AND entitlement, unless the lesson is an explicit preview; catalog translations require publication but not enrollment; locale never grants access.

## 11. Backend / Server Work

Atomic free grant and trusted audited revoke operations; entitlement helper used by bodies, resources and future video/assessments. Completed access remains valid until revoked or expired, including after completion.

## 12. Frontend Work

Course enrollment/access states, login return, revoked access and resource-denied messages.

## 13. English / Arabic

Verify English, Arabic, RTL, mixed LTR identifiers/email/code, Western digits, localized validation and metadata where applicable. Translate UI in messages; domain text uses the phase’s database translation records. Exact-locale content never silently falls back. Course enrollment/access states, login return, revoked access and resource-denied messages.

## 14. Responsive Requirements

Required: 320, 375, 430, 768, 1024, 1280, 1440 and 1920px in BOTH en/LTR and ar/RTL. Verify actual authorized screen, overflow, wrapping, stacking, artwork, controls, navigation and error states.

## 15. Accessibility

Keyboard access, visible focus, semantic controls/headings, labels and linked errors, justified ARIA, contrast, screen-reader announcements, reduced motion and media alternatives. Review phase-specific controls in section 12.

## 16. Security Requirements

- Browser cannot grant paid access or change status
- User A cannot use User B enrollment ID
- Expired/revoked entitlement and unpublished locale deny protected resource URLs

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Bound list queries and paginate; measure query counts and avoid per-record N+1. Index actual parent/owner/locale access paths. Never share-cache private responses. Measure provider latency where used.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation. D14 was approved 2026-10-12.
3. Review constraints, indexes, FKs/deletion, grants/RLS and transaction boundaries for section 9. Only where this phase owns schema changes, create ordered migrations, add necessary DEV-only fixtures and regenerate types. Verification/infrastructure phases must not introduce new schema outside their stated scope.
4. Implement individual free enrollment and current entitlement checks
5. Preserve revoked/expired/re-enrolled history with no default V1 expiry
6. Authorize exact-locale published lesson/resource access and explicit previews
7. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
8. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- Concurrent free grants create one active entitlement
- Test revoked, expired, completed and re-enrolled behavior and historical rows
- Test body/resource access before/after revoke across locales

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

Database/RLS: extend `supabase/tests/database/foundation_rls.sql` or new domain SQL suites and run `npm run db:test` in disposable local/CI Supabase. Extend `scripts/validate-hosted-rls.mjs` or a domain validator for hosted DEV and run the documented command; today `npm run db:test:hosted` covers identity only, so it cannot certify a new domain. Verify DEV target and supply credentials securely before any mutating test. Both policy behavior and constraint/transaction coverage are mandatory; environment unavailability is a blocker, not a pass.

## 20. Manual Verification

- [ ] Manually exercise and inspect: Concurrent free grants create one active entitlement.
- [ ] Manually exercise and inspect: Test revoked, expired, completed and re-enrolled behavior and historical rows.
- [ ] Manually exercise and inspect: Test body/resource access before/after revoke across locales.
- [ ] Review success, empty, invalid, loading and failure states as the intended role in EN/AR.
- [ ] Verify all eight widths, keyboard/focus and mixed technical values.

## 21. Security Verification

- [ ] Browser cannot grant paid access or change status
- [ ] User A cannot use User B enrollment ID
- [ ] Expired/revoked entitlement and unpublished locale deny protected resource URLs

## 22. Data Verification

enrollments with user/course/grantor FKs, lifecycle checks, one active user/course and history retention. Do NOT reference absent order_items; Phase 19 adds paid-source FK and uniqueness. Add owner/status and course indexes.

Verify uniqueness, parent/owner relationships, ordering, exact-locale translations, deletion/history preservation, idempotency and generated-type alignment using actual inserted/read rows. Exercise rollback on an invalid multi-record write.

## 23. Acceptance Criteria

- [ ] Implement individual free enrollment and current entitlement checks
- [ ] Preserve revoked/expired/re-enrolled history with no default V1 expiry
- [ ] Authorize exact-locale published lesson/resource access and explicit previews
- [ ] Every required predecessor is VERIFIED and blocking decisions are resolved.
- [ ] Phase-specific automated and negative cases pass with retained evidence.
- [ ] Manual checks pass; documentation and status tables match.
- [ ] English and Arabic, accessibility, approved visual parity and all eight widths pass.
- [ ] Typecheck, lint, relevant tests and production build pass for implementation changes.

## 24. Evidence Required

Record date, operator, commit plus dirty diff/artifact hash, environment, exact commands, exit codes and test counts. Local migrations applied: `20261012120000_enrollment_entitlements.sql`, `20261012123000_allow_completed_enrollment_revocation.sql`, `20261012130000_enable_anonymous_enrollment_denial.sql`, and `20261012140000_typed_enrollment_audit_target.sql`; the same four were applied to Hosted DEV on 2026-10-12. Local commands/results: project-pinned `supabase test db` passed 263/263; `npm run db:test:concurrency` passed 8/8 concurrent calls with one active row and owned row cleaned; `npm run typecheck`, `npm run lint`, and `npm run build` exit 0; focused pending/detail responsive Playwright checks passed, and local authenticated lifecycle UI passed. The service-role table grant is absent from the migration and local SELECT/INSERT/UPDATE/DELETE checks pass. Hosted anonymous/owner/cross-user/admin/RPC results and the user's 2026-10-12 manual EN/AR approval are recorded in `PHASE-10-HOSTED-DEV-PREFLIGHT.md`. Never include credentials or real learner PII.

Hosted DEV execution (2026-10-12, operator: Claude Code on the user's instruction to apply to hosted DEV and continue to manual review): the four reviewed migrations were applied to `ets-learn` (`szjtjikbybkezgziylir`) with the project-pinned CLI after confirming the ref, that exactly these four were pending, and that the file SHA-256 values match the preflight table. Remote and local migration history now match (15 versions). Hosted types differ from `src/types/database.ts` only in member ordering/formatting. No full logical backup was taken before the push (it was not separately approved and needs a secure destination); the migrations are additive, so this is a recorded process deviation from the preflight, not a claim that a backup exists. `npm run db:test:hosted:enrollment` (`scripts/validate-hosted-enrollment.mjs`) passed 32/32 against Hosted DEV with real role-scoped sessions: anonymous denial, paid-course self-grant rejected, direct INSERT/UPDATE/DELETE denied, 8 concurrent grants gave 1 id and 1 active row, exact-locale EN/AR body access, no fallback for unpublished locale/draft lesson, cross-user isolation, learner and forged-`user_metadata` admin revoke denied, completed stays entitled, re-enrollment adds a history row, expired and revoked deny, preview stays public, authorized admin revoke audited against the exact enrollment id. Expiry/completion states were set with SQL through the linked CLI because the API intentionally does not expose them; in the hosted run the expired row and a revoked row belonged to the same learner, so the hosted result does not isolate expiry-only denial (the local pgTAP suite does). Retained test history: 3 archived `p10-*` courses (two come from aborted earlier runs of the script), 6 banned `@example.test` users, 6 enrollment rows, 1 enrollment audit row; none belong to real users. Rows cannot be deleted because history FKs are RESTRICT. The six-course demonstration set from `supabase/seed.sql` and `supabase/fixtures/course-curriculum.seed.sql` was imported to Hosted DEV on the user's instruction: 6 courses / 26 modules / 98 lessons, 0 enrollments; the public catalog returns 6 (EN) and 5 (AR; `odoo-system-admin` is English-only by design). It was written directly as SQL (not through the audited admin RPCs), so no admin audit rows exist for it, and it adds one banned placeholder author `seed-author@etriplesoft.invalid`. Typecheck, lint and production build pass; a production server against Hosted DEV served `/en|ar/courses` and `/en|ar/catalog` with 6/5 course links. Remaining before VERIFIED: human EN/AR visual, typography and accessibility sign-off.

The target/migration reconciliation, migration hashes, Hosted DEV test plan, backup/recovery proposal, local screenshot inventory, and human-review record are in [the Phase 10 Hosted DEV preflight pack](PHASE-10-HOSTED-DEV-PREFLIGHT.md). The four migrations and Hosted DEV fixture tests were executed as recorded above. No pre-migration logical backup was taken. The user reviewed the local captures in `tmp/phase10-manual-review/` and approved the manual EN/AR visual/accessibility checklist on 2026-10-12.

## 25. Rollback / Recovery

Disable the affected entry point, preserve records and evidence, and revert only the reviewed application change. Use a forward corrective migration for persisted data; never reset a shared database.

## 26. Documentation Updates

Update this phase, ../PROJECT-ROADMAP.md, VERIFICATION-MATRIX.md, OPEN-DECISIONS.md and PRODUCTION-READINESS.md. Update ../ARCHITECTURE.md, ../ROUTES.md, ../I18N.md, ../DATABASE-ARCHITECTURE.md, ../SECURITY.md or ../QA-CHECKLIST.md only where behavior/contracts changed. Preserve unrelated user edits.

## 27. Completion Gate

PHASE IMPLEMENTED:
YES (local and Hosted DEV)

AUTOMATED VERIFICATION:
PASS — local project-pinned `supabase test db` 263/263; local concurrency 8/8; hosted `npm run db:test:hosted:enrollment` 32/32; EN/AR UI states and required-width responsive checks passed; typecheck, lint and production build pass.

MANUAL VERIFICATION:
PASS — user reviewed the Phase 10 screenshot pack and approved the EN/AR visual/accessibility checklist on 2026-10-12. A simulated transient network/RPC retry remains untested.

SECURITY VERIFICATION:
PASS — local negative cases and the Hosted DEV negative/RPC suite (32/32) pass. Residual: no pre-migration backup was taken (see section 24).

EN/AR VERIFICATION:
PASS — required-width EN/AR behavior was captured and checked; user reviewed the screenshots and approved the visual/accessibility checklist on 2026-10-12.

READY TO MARK VERIFIED:
YES — all required gates pass; limitations are recorded above.

READY FOR NEXT PHASE:
YES — Phase 08 and Phase 10 dependencies are VERIFIED. Phase 11 is selected but blocked by unresolved D15.

Phase 10 is VERIFIED. The untested transient retry and missing pre-migration backup are recorded residual limitations; neither is represented as a passed test or as a backup having existed.

## 28. Next Phase

The user authorized progression to [Phase 11](PHASE-11-MUX-VIDEO.md) on 2026-10-12. Its required Phase 08 and Phase 10 dependencies are VERIFIED, but Phase 11 is BLOCKED until D15 provider ownership and operating-policy decisions are resolved.
