# Phase 08 — Curriculum & Resources Domain

## 1. Status

VERIFIED (2026-10-11): migrations applied to shared DEV; focused, hosted and storage checks passed.

Evidence: migrations `20261011120000`, `20261011130000`, and `20261011140000` are applied to shared DEV project `ets-learn` (`szjtjikbybkezgziylir`). Local Phase 08 pgTAP passes 36/36, hosted anonymous/RPC validation passes 8/8, hosted type parity passes for all six tables and domain RPCs, and typecheck/lint/build pass. A local private-bucket smoke uploaded a temporary object with the service client, confirmed anonymous download denial, removed the object, and confirmed it was no longer downloadable; local resource-object count returned to zero. Hosted checks confirmed RLS/grants, private bucket configuration, and zero curriculum rows/objects. The unrelated full local database suite remains blocked by the pre-existing admin-authorization test fixture assumption; focused Phase 06, 07, and 08 suites were run independently, and no persistent local or hosted data was removed or changed by validation.

## 2. Goal

Model ordered modules and typed lessons with required/optional and preview flags.

## 3. Why This Phase Exists

This phase owns curriculum & resources domain. Its verified contract enables [Phase 09](PHASE-09-COURSE-CONTENT-INTEGRATION.md), [Phase 10](PHASE-10-ENROLLMENT-ENTITLEMENTS.md), [Phase 11](PHASE-11-MUX-VIDEO.md), [Phase 14](PHASE-14-ASSESSMENT-DOMAIN.md), [Phase 25](PHASE-25-AI-ASSISTANT.md), [Phase 27](PHASE-27-COURSE-ADMINISTRATION.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 07](PHASE-07-COURSE-DOMAIN.md)

Blocks: [Phase 09](PHASE-09-COURSE-CONTENT-INTEGRATION.md), [Phase 10](PHASE-10-ENROLLMENT-ENTITLEMENTS.md), [Phase 11](PHASE-11-MUX-VIDEO.md), [Phase 14](PHASE-14-ASSESSMENT-DOMAIN.md), [Phase 25](PHASE-25-AI-ASSISTANT.md), [Phase 27](PHASE-27-COURSE-ADMINISTRATION.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

The application still displays static curriculum from `lessonNames` in demo-courses.ts and course-detail.tsx. Phase 08 schema exists locally and on shared DEV. No course curriculum or resource records have been imported, and the learner UI is not connected to it.

## 6. In Scope

- Model ordered modules and typed lessons with required/optional and preview flags
- Add exact-locale lesson/module/resource translations
- Add private resource objects and narrow public outline projection

## 7. Out of Scope

Mux asset delivery, progress tracking and learner access before enrollment.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

OPEN / DEFERRED: D12 remains a launch-content decision for later integration. D13's preview flag and exact-locale no-fallback rules are settled for this schema; stable route and locale-unavailable UX decisions remain open for Phases 09–12. See [decision register](OPEN-DECISIONS.md).

## 9. Database Work

Creates `course_modules`, `module_translations`, `lessons`, `lesson_translations`, `lesson_resources`, and `lesson_resource_translations`, with parent FKs, positive unique ordering, locale uniqueness, exclusive file-key/external-URL locators, and restricted deletion. Adds typed curriculum targets and action constraints to the existing `admin_audit_log`; creates private `course-resources` bucket (50 MiB limit) without browser object policies. Existing tables are not dropped. The safe outline RPC is exact-locale and excludes lesson body and resource locators. Private lesson bodies and resource metadata remain inaccessible directly; learner delivery awaits entitlement work in Phase 10.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. Use this phase’s domain rules above and ../DATABASE-ARCHITECTURE.md. Protected translations require parent publication AND entitlement; catalog translations require publication but not enrollment. Locale selection alone never grants access.

## 11. Backend / Server Work

Authoring validation, transactional reorder and safe outline queries; body/resource authorization stays default-deny. No circular dependency on enrollment.

## 12. Frontend Work

Not applicable; no learner player in this phase.

## 13. English / Arabic

No new user-facing UI. Preserve EN/AR locale constraints and exact-locale contracts where data is involved; downstream user-facing phase must verify presentation.

## 14. Responsive Requirements

Not applicable to this phase’s UI; downstream consuming UI must pass all eight widths in both locales.

## 15. Accessibility

Not applicable to new UI; preserve accessible error/data contracts for consumers.

## 16. Security Requirements

- Anonymous/learner cannot fetch private resources directly
- Draft ancestors and missing translation block publication
- Untrusted external resource schemes and malicious content are rejected

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Bound list queries and paginate; measure query counts and avoid per-record N+1. Index actual parent/owner/locale access paths. Never share-cache private responses. Measure provider latency where used.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Review constraints, indexes, FKs/deletion, grants/RLS and transaction boundaries for section 9. Only where this phase owns schema changes, create ordered migrations, add necessary DEV-only fixtures and regenerate types. Verification/infrastructure phases must not introduce new schema outside their stated scope.
4. Model ordered modules and typed lessons with required/optional and preview flags
5. Add exact-locale lesson/module/resource translations
6. Add private resource objects and narrow public outline projection
7. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
8. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- Test parent/position/locale constraints and transactional reorder
- Ensure outline response has no protected lesson body or object locator
- Test resource type/size/path validation and deletion recovery

Local evidence (2026-10-11): `npm.cmd exec -- supabase test db supabase/tests/database/curriculum_domain.sql` passes 36/36. The course-domain and foundation RLS suites also pass. The full local DB run is blocked by the admin-authorization suite's assumption that its fixture admin is the only active admin; the persistent local DB contains an additional active admin, so that test's last-admin expectation does not hold in this environment. No local data was removed to force the assumption. `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd run build` pass.

Hosted DEV evidence (2026-10-11): migration history includes all three Phase 08 migrations. `npm.cmd run db:test:hosted:curriculum` passes 8/8 (safe outline RPC, invalid locale, and direct anonymous access denied across all six tables); `npm.cmd run db:test:hosted:course` passes 8/8. SQL inspection confirms RLS on all six tables, zero direct `anon`/`authenticated` table grants, a private `course-resources` bucket with a 50 MiB limit, no storage object policies for that bucket (the four existing policies are avatar-only), and zero curriculum rows or resource objects. Supabase hosted type generation matches the checked-in six tables and curriculum RPC signatures. The hosted validators are read-only; no hosted test fixtures or data were created.

Full-suite limitation: a clean full-suite run could not be produced from this running local stack. The existing admin test assumes its fixture admin is the only active admin, while the persistent local database has an unrelated active admin. Attempts against a disposable database were stopped and cleaned up when the cloned schema did not include the test extension/seed baseline. This does not affect the Phase 08 focused 36/36 suite or hosted checks. No hosted file object or course/curriculum record was created.

Database/RLS: extend `supabase/tests/database/foundation_rls.sql` or new domain SQL suites and run `npm run db:test` in disposable local/CI Supabase. Extend `scripts/validate-hosted-rls.mjs` or a domain validator for hosted DEV and run the documented command; today `npm run db:test:hosted` covers identity only, so it cannot certify a new domain. Verify DEV target and supply credentials securely before any mutating test. Both policy behavior and constraint/transaction coverage are mandatory; environment unavailability is a blocker, not a pass.

## 20. Manual Verification

- [x] Exercise parent/position/locale constraints, atomic reordering and rollback via focused Phase 08 pgTAP (36/36).
- [x] Verify the exact-locale outline projection omits protected body/resource locators via local pgTAP and hosted RPC checks (8/8).
- [x] Verify the 50 MiB bucket configuration, generated file-key path and unsafe-URL rejection; service upload succeeded, anonymous download was denied, and service cleanup was confirmed.
- [x] Review hosted table RLS/grants, bucket privacy, migration history, generated types and empty DEV data state.

## 21. Security Verification

- [x] Anonymous direct table/RPC access and bucket object download are denied; no learner grant is present before Phase 10.
- [x] Draft ancestors and missing translation block publication (focused Phase 08 tests).
- [x] Untrusted external resource schemes and invalid locator configuration are rejected (focused Phase 08 tests).

## 22. Data Verification

course_modules, module_translations, lessons, lesson_translations, lesson_resources, lesson_resource_translations. Parent FKs, unique positive positions, locale uniqueness, exactly one file key/external URL and archive restrictions. Private course-resources policies deny learner body/file access until Phase 10 entitlement exists.

Verify uniqueness, parent/owner relationships, ordering, exact-locale translations, deletion/history preservation, idempotency and generated-type alignment using actual inserted/read rows. Exercise rollback on an invalid multi-record write.

## 23. Acceptance Criteria

- [x] Model ordered modules and typed lessons with required/optional and preview flags
- [x] Add exact-locale lesson/module/resource translations
- [x] Add private resource objects and narrow public outline projection
- [x] Every required predecessor is VERIFIED and Phase 08 decisions are settled; later route/content decisions remain assigned to Phase 09.
- [x] Phase-specific automated and negative cases pass with retained evidence.
- [x] Manual storage/configuration and focused domain review pass; the unrelated full-suite fixture limitation is documented.
- [x] Typecheck, lint, relevant tests and production build pass for implementation changes.

## 24. Evidence Required

Record date, operator, commit plus dirty diff/artifact hash, environment, exact commands, exit codes and test counts. Attach phase-specific results from sections 19–22; for UI attach EN/AR screenshots at all eight widths and manual reviewer sign-off. For data attach migration IDs, generated-type comparison and anonymous/owner/cross-user/admin/RPC/storage results. For providers attach redacted sandbox/production receipts, replay/recovery outcomes and configuration evidence. Never include credentials or real learner PII.

## 25. Rollback / Recovery

Disable the affected entry point, preserve records and evidence, and revert only the reviewed application change. Use a forward corrective migration for persisted data; never reset a shared database.

## 26. Documentation Updates

Update this phase, ../PROJECT-ROADMAP.md, VERIFICATION-MATRIX.md, OPEN-DECISIONS.md and PRODUCTION-READINESS.md. Update ../ARCHITECTURE.md, ../ROUTES.md, ../I18N.md, ../DATABASE-ARCHITECTURE.md, ../SECURITY.md or ../QA-CHECKLIST.md only where behavior/contracts changed. Preserve unrelated user edits.

## 27. Completion Gate

PHASE IMPLEMENTED:
YES — applied to shared DEV; migrations `20261011120000`, `20261011130000`, `20261011140000`

AUTOMATED VERIFICATION:
PASS — focused curriculum suite 36/36, hosted curriculum validation 8/8, hosted course validation 8/8, hosted type parity, typecheck, lint and build pass. The unrelated full local DB suite has the documented pre-existing active-admin fixture collision; isolated setup attempts were cleaned up.

MANUAL VERIFICATION:
PASS — local bucket upload/anonymous-download-denial/cleanup smoke and Phase 08 constraint, exact-locale, rollback and safe-outline checks passed.

SECURITY VERIFICATION:
PASS — hosted direct reads are denied and storage is private/default-deny; local anonymous object download was denied and cleanup verified; publication, URL and locator negative cases pass.

EN/AR VERIFICATION:
NOT APPLICABLE

READY TO MARK VERIFIED:
YES

READY FOR NEXT PHASE:
YES — Phase 09 has separate open product decisions D12 (launch content) and D13 (stable routes/locale-unavailable behavior); resolve those before implementing affected behavior.

Full-suite limitation: see section 19. The unrelated active-admin fixture assumption prevented a clean aggregate local-suite run; Phase 08's focused database and hosted security evidence is complete. No shared data was deleted to force that unrelated fixture.

## 28. Next Phase

Next authorized phase: [Phase 09](PHASE-09-COURSE-CONTENT-INTEGRATION.md). Its technical baseline may proceed; D12/D13 decisions still gate real launch content and stable route/locale-unavailable behavior.
