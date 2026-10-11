# Phase 08 — Curriculum & Resources Domain

## 1. Status

IN PROGRESS — APPLIED TO SHARED DEV; FINAL VERIFICATION INCOMPLETE

Evidence: migrations `20261011120000`, `20261011130000`, and `20261011140000` are applied to shared DEV project `ets-learn` (`szjtjikbybkezgziylir`). Local Phase 08 pgTAP passes 36/36, hosted anonymous/RPC validation passes 8/8, hosted type parity passes for all six tables and domain RPCs, and typecheck/lint/build pass. DEV curriculum tables and resource bucket contain no content. Manual storage/deletion-recovery checks and a clean full local database-suite run remain outstanding.

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

Still outstanding: manually inspect resource size/path and deletion recovery behavior, and run the full database suite against a disposable local/CI database without unrelated active-admin rows. No hosted file object was created, so no cleanup was needed.

Database/RLS: extend `supabase/tests/database/foundation_rls.sql` or new domain SQL suites and run `npm run db:test` in disposable local/CI Supabase. Extend `scripts/validate-hosted-rls.mjs` or a domain validator for hosted DEV and run the documented command; today `npm run db:test:hosted` covers identity only, so it cannot certify a new domain. Verify DEV target and supply credentials securely before any mutating test. Both policy behavior and constraint/transaction coverage are mandatory; environment unavailability is a blocker, not a pass.

## 20. Manual Verification

- [ ] Manually exercise and inspect: Test parent/position/locale constraints and transactional reorder.
- [ ] Manually exercise and inspect: Ensure outline response has no protected lesson body or object locator.
- [ ] Manually exercise and inspect: Test resource type/size/path validation and deletion recovery.
- [ ] Review the phase-specific records/configuration/evidence against this contract.

## 21. Security Verification

- [ ] Anonymous/learner cannot fetch private resources directly
- [ ] Draft ancestors and missing translation block publication
- [ ] Untrusted external resource schemes and malicious content are rejected

## 22. Data Verification

course_modules, module_translations, lessons, lesson_translations, lesson_resources, lesson_resource_translations. Parent FKs, unique positive positions, locale uniqueness, exactly one file key/external URL and archive restrictions. Private course-resources policies deny learner body/file access until Phase 10 entitlement exists.

Verify uniqueness, parent/owner relationships, ordering, exact-locale translations, deletion/history preservation, idempotency and generated-type alignment using actual inserted/read rows. Exercise rollback on an invalid multi-record write.

## 23. Acceptance Criteria

- [ ] Model ordered modules and typed lessons with required/optional and preview flags
- [ ] Add exact-locale lesson/module/resource translations
- [ ] Add private resource objects and narrow public outline projection
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
YES — local only; no shared DEV apply

AUTOMATED VERIFICATION:
PASS — focused curriculum suite 36/36, hosted curriculum validation 8/8, typecheck, lint and build pass. The broader local DB suite remains environment-blocked by the pre-existing active-admin fixture collision recorded above.

MANUAL VERIFICATION:
NOT RUN

SECURITY VERIFICATION:
FAIL — hosted anonymous direct reads are denied and storage is private/default-deny, but manual file-object download and deletion-recovery checks remain outstanding.

EN/AR VERIFICATION:
NOT APPLICABLE

READY TO MARK VERIFIED:
NO

READY FOR NEXT PHASE:
NO

FAIL here means the required gate has not been demonstrated; it is not a claim that an executed test failed. The requested gate vocabulary has no NOT RUN value for security/EN/AR. Automated/manual NOT RUN refer to this canonical phase gate, not denial of historical partial checks.

## 28. Next Phase

Recommended sequential candidate: [Phase 09](PHASE-09-COURSE-CONTENT-INTEGRATION.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.
