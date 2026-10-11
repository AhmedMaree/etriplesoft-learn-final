# Phase 04 — Supabase Database Foundation

## 1. Status

VERIFIED (2026-10-08, by user decision; the one accepted limit, the missing local pgTAP run, was closed the same day once Docker was installed: see Evidence checkpoint 2)

Evidence: Four SQL migrations exist: 20261006113243 identity/roles/audit; 20261006131900 trigger ACL; 20261006140220 display name/avatars; 20261007110000 onboarding. src/types/database.ts exposes five application tables. Hosted application is reported in docs, not independently rechecked in this audit. Latest onboarding RLS/trigger behavioral evidence is missing.

## 2. Goal

Reconcile local migrations and hosted DEV history without resets.

## 3. Why This Phase Exists

This phase owns supabase database foundation. Its verified contract enables [Phase 05](PHASE-05-AUTH-PROFILES-ONBOARDING.md), [Phase 06](PHASE-06-ADMIN-AUTHORIZATION.md), [Phase 07](PHASE-07-COURSE-DOMAIN.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 00](PHASE-00-PROJECT-BASELINE.md)

Blocks: [Phase 05](PHASE-05-AUTH-PROFILES-ONBOARDING.md), [Phase 06](PHASE-06-ADMIN-AUTHORIZATION.md), [Phase 07](PHASE-07-COURSE-DOMAIN.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

Four SQL migrations exist: 20261006113243 identity/roles/audit; 20261006131900 trigger ACL; 20261006140220 display name/avatars; 20261007110000 onboarding. src/types/database.ts exposes five application tables. Hosted application is reported in docs, not independently rechecked in this audit. Latest onboarding RLS/trigger behavioral evidence is missing.

## 6. In Scope

- Reconcile local migrations and hosted DEV history without resets
- Validate grants, RLS, triggers and private avatar storage
- Regenerate and compare types after any corrective migration

## 7. Out of Scope

New course schema or production provisioning.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

OPEN / DEFERRED: D10 — see [decision register](OPEN-DECISIONS.md).

## 9. Database Work

Existing profiles, learner_preferences, learner_profiles, user_roles, admin_audit_log; no LMS tables. Inspect FK deletion, column grants, role uniqueness, append-only audit and trigger execute ACLs.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. Use this phase’s domain rules above and ../DATABASE-ARCHITECTURE.md. Protected translations require parent publication AND entitlement; catalog translations require publication but not enrollment. Locale selection alone never grants access.

## 11. Backend / Server Work

Review typed browser/server clients, session refresh and DEV target guards. No service-role application dependency.

## 12. Frontend Work

Not applicable; foundation verification only.

## 13. English / Arabic

No new user-facing UI. Preserve EN/AR locale constraints and exact-locale contracts where data is involved; downstream user-facing phase must verify presentation.

## 14. Responsive Requirements

Not applicable to this phase’s UI; downstream consuming UI must pass all eight widths in both locales.

## 15. Accessibility

Not applicable to new UI; preserve accessible error/data contracts for consumers.

## 16. Security Requirements

- Anonymous cannot read private tables; A cannot read/update B
- Owner cannot reassign IDs, insert learner_profiles or grant roles
- Invalid onboarding metadata fails safely and creates no partial identity; audit is immutable

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Bound list queries and paginate; measure query counts and avoid per-record N+1. Index actual parent/owner/locale access paths. Never share-cache private responses. Measure provider latency where used.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Review constraints, indexes, FKs/deletion, grants/RLS and transaction boundaries for section 9. Only where this phase owns schema changes, create ordered migrations, add necessary DEV-only fixtures and regenerate types. Verification/infrastructure phases must not introduce new schema outside their stated scope.
4. Reconcile local migrations and hosted DEV history without resets
5. Validate grants, RLS, triggers and private avatar storage
6. Regenerate and compare types after any corrective migration
7. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
8. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- npm run db:test:hosted with securely supplied process-only service credential and verified DEV ref
- npm run db:test in a disposable local/CI database for constraints and trigger cases; this is currently not evidenced
- Validate malformed metadata, role forgery, avatar upsert/delete and generated-type schema parity

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

Database/RLS: extend `supabase/tests/database/foundation_rls.sql` or new domain SQL suites and run `npm run db:test` in disposable local/CI Supabase. Extend `scripts/validate-hosted-rls.mjs` or a domain validator for hosted DEV and run the documented command; today `npm run db:test:hosted` covers identity only, so it cannot certify a new domain. Verify DEV target and supply credentials securely before any mutating test. Both policy behavior and constraint/transaction coverage are mandatory; environment unavailability is a blocker, not a pass.

## 20. Manual Verification

- [ ] Manually exercise and inspect: npm run db:test:hosted with securely supplied process-only service credential and verified DEV ref.
- [ ] Manually exercise and inspect: npm run db:test in a disposable local/CI database for constraints and trigger cases; this is currently not evidenced.
- [ ] Manually exercise and inspect: Validate malformed metadata, role forgery, avatar upsert/delete and generated-type schema parity.
- [ ] Review the phase-specific records/configuration/evidence against this contract.

## 21. Security Verification

- [ ] Anonymous cannot read private tables; A cannot read/update B
- [ ] Owner cannot reassign IDs, insert learner_profiles or grant roles
- [ ] Invalid onboarding metadata fails safely and creates no partial identity; audit is immutable

## 22. Data Verification

Existing profiles, learner_preferences, learner_profiles, user_roles, admin_audit_log; no LMS tables. Inspect FK deletion, column grants, role uniqueness, append-only audit and trigger execute ACLs.

Verify uniqueness, parent/owner relationships, ordering, exact-locale translations, deletion/history preservation, idempotency and generated-type alignment using actual inserted/read rows. Exercise rollback on an invalid multi-record write.

## 23. Acceptance Criteria

- [ ] Reconcile local migrations and hosted DEV history without resets
- [ ] Validate grants, RLS, triggers and private avatar storage
- [ ] Regenerate and compare types after any corrective migration
- [ ] Every required predecessor is VERIFIED and blocking decisions are resolved.
- [ ] Phase-specific automated and negative cases pass with retained evidence.
- [ ] Manual checks pass; documentation and status tables match.
- [ ] Typecheck, lint, relevant tests and production build pass for implementation changes.

## 24. Evidence Required

Record date, operator, commit plus dirty diff/artifact hash, environment, exact commands, exit codes and test counts. Attach phase-specific results from sections 19–22; for UI attach EN/AR screenshots at all eight widths and manual reviewer sign-off. For data attach migration IDs, generated-type comparison and anonymous/owner/cross-user/admin/RPC/storage results. For providers attach redacted sandbox/production receipts, replay/recovery outcomes and configuration evidence. Never include credentials or real learner PII.

## Evidence checkpoint — 2026-10-08

Operator: Claude Code (user-authorized). Environment: linked DEV project, working tree on `d710c94` plus uncommitted work.

| Check | Command | Result |
|---|---|---|
| Migration history parity | `npx supabase migration list` (read-only) | PASS — all four IDs present locally and remotely, no drift |
| Generated-type parity | `supabase gen types typescript --linked --schema public` to scratch file, diffed against `src/types/database.ts` (line endings normalised) | PASS — identical |
| Typecheck / lint | `npm run typecheck`, `npm run lint` | PASS (exit 0) |
| Onboarding migration review | Read `20261007110000_learner_onboarding_profiles.sql` | Constraints, owner-only RLS, column-level UPDATE grants, `SECURITY DEFINER` with empty `search_path`, EXECUTE revoked; no role/permission metadata is read |
| Hosted RLS suite | `npm run db:test:hosted` (service-role key fetched via CLI for the verified DEV ref and passed process-only; never printed or written) | PASS — 61/61 (10 anonymous denials, per-user owner/cross-user/role-forgery/learner-profile-forgery cases for two users incl. trigger persistence with forged `role`/`permissions` metadata ignored, avatar upload/cross-path/MIME/size/cross-read/anonymous-read, cleanup). Exit 0 |
| Hosted test data | Created 2 disposable auth users (`codex-rls-validation-<run>-a/-b@example.test`) and 1 avatar object | Both users and the avatar deleted by the suite's own cleanup (rows 58-60 PASS) |
| Env note | `.env.local` begins with a UTF-8 BOM, so `node --env-file` misreads the first variable name (`NEXT_PUBLIC_SUPABASE_URL`) and the script fails its env check | Worked around for the run by passing the URL inline; file not modified. Removing the BOM fixes `npm run db:test:hosted` |
| Local pgTAP suite | `npm run db:test` | NOT RUN — Docker is not installed on this machine |

Update: hosted security evidence is now present (61/61). The user then marked the phase VERIFIED, accepting the missing local pgTAP run as a documented limit. Constraint and trigger edge cases (malformed onboarding metadata, audit immutability) are covered only by the hosted suite and static review until that local run exists.

## Evidence checkpoint 2 — 2026-10-08 (local pgTAP, accepted limit closed)

Docker Desktop was installed; `npx supabase start` (auth, storage and database services) built a disposable local database from all local migrations (including the later admin ones), proving they apply cleanly from scratch.

`npm run db:test` first FAILED: `foundation_rls.sql` stopped at a SQL error ("WITH clause containing a data-modifying statement must be at the top level") after 32 of 46 planned cases, an error in the two cross-user UPDATE tests, not in the schema. Fixed by moving each `WITH changed AS (UPDATE ...)` to the top level of its statement; the assertions are unchanged.

Rerun: **PASS — 2 files, 74 cases** (`foundation_rls.sql` 46, `admin_authorization.sql` 28), exit 0. This covers the constraint, trigger, RLS and append-only-audit cases that previously rested on the hosted suite and static review alone.

## 25. Rollback / Recovery

Disable the affected entry point, preserve records and evidence, and revert only the reviewed application change. Use a forward corrective migration for persisted data; never reset a shared database.

## 26. Documentation Updates

Update this phase, ../PROJECT-ROADMAP.md, VERIFICATION-MATRIX.md, OPEN-DECISIONS.md and PRODUCTION-READINESS.md. Update ../ARCHITECTURE.md, ../ROUTES.md, ../I18N.md, ../DATABASE-ARCHITECTURE.md, ../SECURITY.md or ../QA-CHECKLIST.md only where behavior/contracts changed. Preserve unrelated user edits.

## 27. Completion Gate

PHASE IMPLEMENTED:
YES

AUTOMATED VERIFICATION:
PASS (hosted 61/61, migration and type parity, typecheck, lint; local pgTAP not run — accepted limit)

MANUAL VERIFICATION:
PASS (migration review; user sign-off 2026-10-08)

SECURITY VERIFICATION:
PASS (hosted anonymous, owner, cross-user, role-forgery and avatar cases)

EN/AR VERIFICATION:
NOT APPLICABLE

READY TO MARK VERIFIED:
YES

READY FOR NEXT PHASE:
YES

FAIL here means the required gate has not been demonstrated; it is not a claim that an executed test failed. The requested gate vocabulary has no NOT RUN value for security/EN/AR. Automated/manual NOT RUN refer to this canonical phase gate, not denial of historical partial checks.

## 28. Next Phase

Recommended sequential candidate: [Phase 05](PHASE-05-AUTH-PROFILES-ONBOARDING.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.
