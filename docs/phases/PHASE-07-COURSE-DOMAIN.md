# Phase 07 — Course Domain

## 1. Status

VERIFIED (2026-10-11): local and hosted DEV verification passed; the user approved the shared DEV migration and final sign-off.

Evidence: the original demo course fixtures remain in `src/features/courses/data/demo-courses.ts`. Phase 07 now provides the hosted DEV schema and typed repository for course identity, translations, publication and attribution; Phase 09 still owns catalog UI integration.

## 2. Goal

Implement course identity, slug, lifecycle and per-locale publication.

## 3. Why This Phase Exists

This phase owns course domain. Its verified contract enables [Phase 08](PHASE-08-CURRICULUM-DOMAIN.md), [Phase 09](PHASE-09-COURSE-CONTENT-INTEGRATION.md), [Phase 10](PHASE-10-ENROLLMENT-ENTITLEMENTS.md), [Phase 19](PHASE-19-ORDERS-CHECKOUT.md), [Phase 21](PHASE-21-LEARNING-PATHS.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 04](PHASE-04-SUPABASE-FOUNDATION.md), [Phase 06](PHASE-06-ADMIN-AUTHORIZATION.md)

Blocks: [Phase 08](PHASE-08-CURRICULUM-DOMAIN.md), [Phase 09](PHASE-09-COURSE-CONTENT-INTEGRATION.md), [Phase 10](PHASE-10-ENROLLMENT-ENTITLEMENTS.md), [Phase 19](PHASE-19-ORDERS-CHECKOUT.md), [Phase 21](PHASE-21-LEARNING-PATHS.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

The six course fixtures and instructor strings remain in `src/features/courses/data/demo-courses.ts`. Hosted DEV now has the Phase 07 course tables and types; Phase 09 will connect the UI to them.

## 6. In Scope

- Implement course identity, slug, lifecycle and per-locale publication
- Implement ordered instructor attribution without permissions
- Expose narrow published catalog projections and deterministic DEV seed content

## 7. Out of Scope

Curriculum, reviews/ratings engine, enrollments and catalog UI integration.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

APPROVED: D01 — EGP only.

PARTIALLY APPROVED: D12 — seed six demo courses as local/CI placeholders and omit ratings; launch course prices, categories and Arabic content remain open. See [decision register](OPEN-DECISIONS.md).

## 9. Database Work

courses, course_translations, course_instructors. Unique slug and entity/locale; positive unique attribution position; nonnegative minor-unit price; valid currency; author/profile FKs; archive referenced courses. Index status/locale/catalog filters.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. Use this phase’s domain rules above and ../DATABASE-ARCHITECTURE.md. Protected translations require parent publication AND entitlement; catalog translations require publication but not enrollment. Locale selection alone never grants access.

## 11. Backend / Server Work

Typed course repository and validated publication operations behind Phase 06 admin authority. Public projections must not expose full profiles.

## 12. Frontend Work

Not applicable; catalog UI connection belongs to Phase 09.

## 13. English / Arabic

No new user-facing UI. Preserve EN/AR locale constraints and exact-locale contracts where data is involved; downstream user-facing phase must verify presentation.

## 14. Responsive Requirements

Not applicable to this phase’s UI; downstream consuming UI must pass all eight widths in both locales.

## 15. Accessibility

Not applicable to new UI; preserve accessible error/data contracts for consumers.

## 16. Security Requirements

- Anonymous cannot read drafts or protected profile fields
- Instructor attribution cannot publish or edit
- Missing Arabic publication never falls back to English

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Bound list queries and paginate; measure query counts and avoid per-record N+1. Index actual parent/owner/locale access paths. Never share-cache private responses. Measure provider latency where used.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Review constraints, indexes, FKs/deletion, grants/RLS and transaction boundaries for section 9. Only where this phase owns schema changes, create ordered migrations, add necessary DEV-only fixtures and regenerate types. Verification/infrastructure phases must not introduce new schema outside their stated scope.
4. Implement course identity, slug, lifecycle and per-locale publication
5. Implement ordered instructor attribution without permissions
6. Expose narrow published catalog projections and deterministic DEV seed content
7. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
8. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- DB constraints and published/draft/exact-locale projection tests
- Test duplicate slug/locale/order and invalid price rejection
- Test instructor profile projection excludes email/onboarding/private fields

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

Database/RLS: local pgTAP and repository cases cover constraints, transaction behavior and negative access. `npm run db:test:hosted:course` runs read-only anonymous catalog, RLS and column-grant checks on the verified DEV project; it creates no test data. Hosted validation complements, but does not replace, local negative and transaction coverage.

## 20. Manual Verification

- [x] Manually exercise and inspect: DB constraints and published/draft/exact-locale projection tests (local pgTAP and repository suite; hosted read-only behavior checked).
- [x] Manually exercise and inspect: Test duplicate slug/locale/order and invalid price rejection (local pgTAP and repository suite).
- [x] Manually exercise and inspect: Test instructor profile projection excludes email/onboarding/private fields (local suite; hosted profile-ID column denied).
- [x] Review the phase-specific records/configuration/evidence against this contract.

## 21. Security Verification

- [x] Anonymous cannot read drafts or protected profile fields
- [x] Instructor attribution cannot publish or edit
- [x] Missing Arabic publication never falls back to English

## 22. Data Verification

courses, course_translations, course_instructors. Unique slug and entity/locale; positive unique attribution position; nonnegative minor-unit price; valid currency; author/profile FKs; archive referenced courses. Index status/locale/catalog filters.

Verify uniqueness, parent/owner relationships, ordering, exact-locale translations, deletion/history preservation, idempotency and generated-type alignment using actual inserted/read rows. Exercise rollback on an invalid multi-record write.

## 23. Acceptance Criteria

- [x] Implement course identity, slug, lifecycle and per-locale publication
- [x] Implement ordered instructor attribution without permissions
- [x] Expose narrow published catalog projections and deterministic DEV seed content
- [x] Every required predecessor is VERIFIED and blocking decisions are resolved.
- [x] Phase-specific automated and negative cases pass with retained evidence.
- [x] Manual checks pass; documentation and status tables match.
- [x] Typecheck, lint, relevant tests and production build pass for implementation changes.

## 24. Evidence Required

Record date, operator, commit plus dirty diff/artifact hash, environment, exact commands, exit codes and test counts. Attach phase-specific results from sections 19–22; for UI attach EN/AR screenshots at all eight widths and manual reviewer sign-off. For data attach migration IDs, generated-type comparison and anonymous/owner/cross-user/admin/RPC/storage results. For providers attach redacted sandbox/production receipts, replay/recovery outcomes and configuration evidence. Never include credentials or real learner PII.

## Implementation record and evidence (2026-10-10)

Decisions used: D01 approved (EGP only) and D12 partially approved (seed the six demo courses as DEV placeholders, no ratings). Revision `d710c94` plus the uncommitted working tree.

### What was built

- **Migration `20261011065834_course_domain.sql`** (applied to hosted DEV on 2026-10-11; Supabase recorded version `20261011065834` while applying SQL originally held in `20261010120000_course_domain.sql`):
  - `courses` (unique slug, draft/published/archived, level and category keys, `price_minor >= 0`, EGP-only currency, creator and updater FKs restricted), `course_translations` (PK course and locale, per-locale publication, no fallback), `course_instructors` (ordered attribution, display-name snapshot, optional profile link, unique course and position, no permissions).
  - Lifecycle trigger holds even for direct privileged writes: a published course's slug is frozen, publishing needs at least one published translation, archived must return to draft before publishing.
  - RLS and column grants: anonymous and signed-in readers see only published rows and only catalog-safe columns (no creator, profile link or draft state); no client has INSERT, UPDATE or DELETE.
  - Public projections `catalog_list_courses(locale, ...)` and `catalog_get_course(slug, locale)` are SECURITY INVOKER, require an exact `en` or `ar`, return a course only when it has a published translation in that locale, and are bounded to 50 rows.
  - Admin functions behind the Phase 06 authority check, each audited in the same transaction: create, update, set status, upsert translation, set translation publication (refuses to unpublish the last published translation of a published course), replace instructors atomically, list, get.
  - Typed audit extended with target `course` and a `course_id` column; the Phase 06 audit viewer lists these rows unchanged (action names show raw until Phase 27 adds labels).
- **Seed `supabase/seed.sql`** (local and CI only): six demo courses with EN text, AR text for five, instructor display names, one English-only course (`odoo-system-admin`, Arabic draft unpublished) to exercise exact-locale behavior. Prices, levels and Arabic text are placeholders pending Phase 09/36 content approval and native review.
- **Repository `src/features/courses/server/course-repository.ts`**: typed wrappers over the database functions taking the caller's client, with typed errors (`forbidden`, `notFound`, `slugTaken`, `rule`, `invalid`). No service-role client, no UI (Phase 09 connects the catalog; Phase 27 builds admin screens).
- **Types** regenerated from the local database; the change to `src/types/database.ts` is additive (formatting normalized to the repository style, `__InternalSupabase` header kept).

### Verification (local disposable Docker Supabase)

| Check | Result |
|---|---|
| `npm run db:test` | PASS 146 cases: `course_domain.sql` 72, `admin_authorization.sql` 28, `foundation_rls.sql` 46 |
| `tests/course-domain.spec.ts` (`PHASE07_LIVE=1`, real admin, learner and anonymous clients) | PASS 8/8 |
| `npm run typecheck`, `npm run lint`, `npm run build` | PASS |
| Regular `npx playwright test` (no credentials) | 59 passed, 38 skipped (credential-gated, with reasons), 0 failed |

### Hosted DEV verification (2026-10-11)

Operator: Codex, with explicit user approval. Target: `ets-learn` DEV, project ref `szjtjikbybkezgziylir`; the configured app URL, `SUPABASE_DEV_PROJECT_REF`, and Supabase CLI link matched before applying the migration. The SQL SHA-256 was `7DD031D675B89864193E9FD680EBD36289A42B995646F6967B3F1690C3C3F47A`.

| Check | Result |
|---|---|
| Apply course-domain SQL | PASS; recorded remotely as migration version `20261011065834`, name `20261010120000_course_domain` |
| Hosted schema | PASS; three course tables exist with RLS enabled; `admin_audit_log.course_id` exists as `uuid`; course row count is 0 (no hosted seed applied) |
| Hosted grants | PASS; anonymous public-column reads are granted, private creator/profile columns are denied, anonymous INSERT/UPDATE/DELETE are denied, and anonymous execution of `admin_create_course` is denied |
| Hosted catalog behavior | PASS; anonymous English and Arabic catalog RPCs succeed and return 0 rows; unsupported `fr` is rejected with SQLSTATE `22023` |
| Private-column behavior | PASS; anonymous reads of `courses.created_by` and `course_instructors.profile_id` are rejected with SQLSTATE `42501` |
| Repeatable hosted check | `npm run db:test:hosted:course`: PASS, 8/8; read-only, no users/courses/translations/instructors/audit rows created |
| Hosted/local type parity | PASS; generated hosted types and `src/types/database.ts` match exactly after normalizing local generated formatting |
| Application checks after type alignment | `npm run typecheck`, `npm run lint`, `npm run build`: PASS |

The migration adds the three course tables and alters the existing `admin_audit_log` table by adding `course_id` and extending its typed-target/action constraints. It does not drop tables or course data. The local migration filename was aligned to the version recorded by Supabase so future CLI migration history remains in sync.

Supabase advisors reported the private append-only `admin_audit_log` no-policy notice, warnings for the course RLS helper and authenticated admin `SECURITY DEFINER` RPCs, and an unrelated existing Auth leaked-password-protection warning. Admin RPCs call `assert_active_admin`; the course helper returns only a publication boolean and supports non-recursive RLS. Performance advisor notices marked the new, currently empty course indexes as unused. No course test rows were created.

The old course site confirms EGP for all listed paid courses; the join-only course has no displayed price. This supports D01 and does not approve importing placeholder seed prices as launch prices. The user also confirmed that English and Arabic course versions use the same video assets; Phase 11 will model those assets as explicitly language-neutral.

Coverage against the contract: duplicate slug, invalid slug, negative price, unknown level and category, non-EGP currency rejected; instructor position uniqueness and duplicate-profile rejection; invalid multi-row instructor write rolls back and leaves the previous list intact; anonymous cannot read drafts, creator columns, profile links or internal timestamps; learner, instructor-role user, anonymous and revoked admin cannot mutate; attribution grants no authority; Arabic never falls back to English (list, detail, draft, unpublish); unsupported or missing locale is an error; instructors projection is display names only and no email or profile data appears anywhere in public output; hard delete of a course with history is refused; every change wrote an audit row and audit rows are append-only; slug frozen after first publication.

### Open items

- Hosted DEV migration, read-only validation and hosted/local type parity are complete. No hosted seed was applied; the hosted course tables remain empty.
- Native Arabic review of the seed text and real launch content: Phases 09 and 36.
- Real launch prices, categories and Arabic copy remain subject to D12 and the content review in Phases 09 and 36.

## 25. Rollback / Recovery

Disable the affected entry point, preserve records and evidence, and revert only the reviewed application change. Use a forward corrective migration for persisted data; never reset a shared database.

## 26. Documentation Updates

Update this phase, ../PROJECT-ROADMAP.md, VERIFICATION-MATRIX.md, OPEN-DECISIONS.md and PRODUCTION-READINESS.md. Update ../ARCHITECTURE.md, ../ROUTES.md, ../I18N.md, ../DATABASE-ARCHITECTURE.md, ../SECURITY.md or ../QA-CHECKLIST.md only where behavior/contracts changed. Preserve unrelated user edits.

## 27. Completion Gate

PHASE IMPLEMENTED:
YES

AUTOMATED VERIFICATION:
PASS (local: pgTAP 146, repository suite 8/8, regular run 59 passed / 38 gated skips / 0 failed; hosted read-only course check 8/8; hosted/local type parity; typecheck, lint, build)

MANUAL VERIFICATION:
PASS (migration/schema review and hosted project, grants, locale, and private-column checks; no UI in this phase)

SECURITY VERIFICATION:
PASS (local negative suite plus hosted RLS/grant/private-column checks; advisor notices recorded above)

EN/AR VERIFICATION:
NOT APPLICABLE (no UI; exact-locale data contract verified)

READY TO MARK VERIFIED:
YES

READY FOR NEXT PHASE:
NO

FAIL here means the required gate has not been demonstrated; it is not a claim that an executed test failed. The requested gate vocabulary has no NOT RUN value for security/EN/AR. Automated/manual NOT RUN refer to this canonical phase gate, not denial of historical partial checks.

## 28. Next Phase

Recommended sequential candidate: [Phase 08](PHASE-08-CURRICULUM-DOMAIN.md). Resolve D13's curriculum/preview/locale-unavailable decisions and obtain a separate task request before starting; do not start automatically.
