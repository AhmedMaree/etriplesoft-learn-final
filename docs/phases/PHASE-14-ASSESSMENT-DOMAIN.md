# Phase 14 — Assessment Domain

## 1. Status

IN_PROGRESS

Evidence: demo-assessment.ts ships questions/options and assessmentCorrectAnswers. There are no quiz tables. ../DATABASE-ARCHITECTURE.md defines immutable quiz versions.

## DEV implementation checkpoint — 2026-10-14

User-authorized learning continuation implements the relevant domain/services and UI described in [the learning guide](../LEARNING-FEATURES-GUIDE.md). Local automated evidence and hosted transactional checks exist. Full phase manual, content, operational and predecessor acceptance gates remain open; this is not VERIFIED. The earlier current-state descriptions below are baseline audit evidence, superseded by this checkpoint for implemented paths. Phase 27 is partial: quiz authoring, video management and audited operator resource/curriculum operations exist; full course/path/resource administration is not complete.

## 2. Goal

Model single/multiple choice and true/false with immutable published versions.

## 3. Why This Phase Exists

This phase owns assessment domain. Its verified contract enables [Phase 15](PHASE-15-ASSESSMENT-ATTEMPTS.md), [Phase 27](PHASE-27-COURSE-ADMINISTRATION.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 08](PHASE-08-CURRICULUM-DOMAIN.md), [Phase 10](PHASE-10-ENROLLMENT-ENTITLEMENTS.md)

Blocks: [Phase 15](PHASE-15-ASSESSMENT-ATTEMPTS.md), [Phase 27](PHASE-27-COURSE-ADMINISTRATION.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

demo-assessment.ts ships questions/options and assessmentCorrectAnswers. There are no quiz tables. ../DATABASE-ARCHITECTURE.md defines immutable quiz versions.

## 6. In Scope

- Model single/multiple choice and true/false with immutable published versions
- Localize question/option presentation independently from scoring identity
- Isolate answer keys and explanations subject to reveal policy

## 7. Out of Scope

Attempt execution, client grading and manual/free-text grading.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

OPEN / DEFERRED: D07; D16 — see [decision register](OPEN-DECISIONS.md).

## 9. Database Work

quizzes, quiz_versions, quiz_translations, questions, question_translations, question_options, option_translations, quiz_answer_keys. Composite FKs, ordered uniqueness, answer-key cardinality, valid rules and version immutability; restricted historical deletion.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. Use this phase’s domain rules above and ../DATABASE-ARCHITECTURE.md. Protected translations require parent publication AND entitlement; catalog translations require publication but not enrollment. Locale selection alone never grants access.

## 11. Backend / Server Work

Trusted publish validator and safe learner projection; explanations must not leak correctness before allowed reveal.

## 12. Frontend Work

Not applicable; authoring UI Phase 27 and learner UI Phase 16.

## 13. English / Arabic

No new user-facing UI. Preserve EN/AR locale constraints and exact-locale contracts where data is involved; downstream user-facing phase must verify presentation.

## 14. Responsive Requirements

Not applicable to this phase’s UI; downstream consuming UI must pass all eight widths in both locales.

## 15. Accessibility

Not applicable to new UI; preserve accessible error/data contracts for consumers.

## 16. Security Requirements

- Learner/instructor cannot select answer keys directly
- Cross-version options and unpublished locale are inaccessible

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Bound list queries and paginate; measure query counts and avoid per-record N+1. Index actual parent/owner/locale access paths. Never share-cache private responses. Measure provider latency where used.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Review constraints, indexes, FKs/deletion, grants/RLS and transaction boundaries for section 9. Only where this phase owns schema changes, create ordered migrations, add necessary DEV-only fixtures and regenerate types. Verification/infrastructure phases must not introduce new schema outside their stated scope.
4. Model single/multiple choice and true/false with immutable published versions
5. Localize question/option presentation independently from scoring identity
6. Isolate answer keys and explanations subject to reveal policy
7. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
8. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- Test incomplete keys/translations cannot publish
- Published version edits fail; new version preserves old content
- Inspect serialized safe projections for answer keys and explanations

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

Database/RLS: extend `supabase/tests/database/foundation_rls.sql` or new domain SQL suites and run `npm run db:test` in disposable local/CI Supabase. Extend `scripts/validate-hosted-rls.mjs` or a domain validator for hosted DEV and run the documented command; today `npm run db:test:hosted` covers identity only, so it cannot certify a new domain. Verify DEV target and supply credentials securely before any mutating test. Both policy behavior and constraint/transaction coverage are mandatory; environment unavailability is a blocker, not a pass.

## 20. Manual Verification

- [ ] Manually exercise and inspect: Test incomplete keys/translations cannot publish.
- [ ] Manually exercise and inspect: Published version edits fail; new version preserves old content.
- [ ] Manually exercise and inspect: Inspect serialized safe projections for answer keys and explanations.
- [ ] Review the phase-specific records/configuration/evidence against this contract.

## 21. Security Verification

- [ ] Learner/instructor cannot select answer keys directly
- [ ] Cross-version options and unpublished locale are inaccessible

## 22. Data Verification

quizzes, quiz_versions, quiz_translations, questions, question_translations, question_options, option_translations, quiz_answer_keys. Composite FKs, ordered uniqueness, answer-key cardinality, valid rules and version immutability; restricted historical deletion.

Verify uniqueness, parent/owner relationships, ordering, exact-locale translations, deletion/history preservation, idempotency and generated-type alignment using actual inserted/read rows. Exercise rollback on an invalid multi-record write.

## 23. Acceptance Criteria

- [ ] Model single/multiple choice and true/false with immutable published versions
- [ ] Localize question/option presentation independently from scoring identity
- [ ] Isolate answer keys and explanations subject to reveal policy
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

Recommended sequential candidate: [Phase 15](PHASE-15-ASSESSMENT-ATTEMPTS.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.
