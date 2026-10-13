# Phase 09 — Course Catalog & Content Integration

## 1. Status

VERIFIED — LOCAL AUTOMATED, HOSTED RPC/SECURITY, AND USER-APPROVED ARABIC REVIEW GATES PASS

Evidence (2026-10-12): predecessors Phase 03, Phase 07 and Phase 08 are VERIFIED. Catalog listing, search/facets/count/pagination, learner course list, canonical detail route, published outline and instructor attribution use bounded exact-locale database projections. Draft/missing translations have a localized unavailable state and explicit alternate-locale link only when published. D13 is APPROVED in [OPEN-DECISIONS.md](OPEN-DECISIONS.md). The search/count/category RPC migration is applied to Hosted DEV. Authenticated admin RPC and fixture-backed public catalog checks pass against Hosted DEV; temporary fixtures were archived after verification. The user/project owner reported manually reviewing Arabic translation on 2026-10-12 and approved the Phase 09 Arabic typography screenshots on 2026-10-12; this records the user's sign-off without asserting separate reviewer credentials. D12 still gates real launch courses/prices/categories/Arabic copy. Local and archived DEV seed records are demo placeholders, not launch content.

## 2. Goal

Replace catalog/detail/instructor/outline fixtures with server data.

## 3. Why This Phase Exists

This phase owns course catalog & content integration. Its verified contract enables [Phase 12](PHASE-12-LEARNING-PLAYER.md), [Phase 22](PHASE-22-LEARNER-DASHBOARD.md), [Phase 30](PHASE-30-SEO-METADATA.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 03](PHASE-03-I18N-RTL-FOUNDATION.md), [Phase 07](PHASE-07-COURSE-DOMAIN.md), [Phase 08](PHASE-08-CURRICULUM-DOMAIN.md)

Blocks: [Phase 12](PHASE-12-LEARNING-PLAYER.md), [Phase 22](PHASE-22-LEARNER-DASHBOARD.md), [Phase 30](PHASE-30-SEO-METADATA.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

The public `/catalog` listing and learner `/courses` list use published exact-locale Supabase data. The public `/catalog/[slug]` route displays public details, instructor attribution and published outline only. A valid legacy `/detail-course?slug=...` redirects to the canonical detail route; an ambiguous or invalid legacy URL remains on the chooser. Learning-player, entitlement, protected body/resource delivery, and unrelated learner dashboard fixtures remain out of scope.

## 6. In Scope

- Replace catalog/detail/instructor/outline fixtures with server data
- Add approved stable course identifier routing and legacy compatibility
- Handle search, pagination, missing locale, loading, empty and error states

## 7. Out of Scope

Ratings/reviews persistence, learner player and paid purchase.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI. D13 route and locale behavior is approved and recorded in [OPEN-DECISIONS.md](OPEN-DECISIONS.md).

OPEN / DEFERRED: D12 — see [decision register](OPEN-DECISIONS.md). It gates real launch content, not this local-only integration slice.

## 9. Database Work

No new tables. Migration `20261011150000_catalog_search_and_facets.sql` adds bounded exact-locale `catalog_search_courses`, accurate `catalog_count_courses`, and `catalog_list_categories` RPCs. They run as SECURITY INVOKER with narrow anon/authenticated execute grants and return catalog projections only. Applied to Hosted DEV on 2026-10-11 with `npm run db:push`; SHA-256 `92D76004304117AE7F038D1CAD19EE32D058A42E9E23EF8B70BA5DF1779E32A3`. No table, policy, or data modifications were made. No index was added; local seeded search works, and production-scale query performance remains to be measured.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. Use this phase’s domain rules above and ../DATABASE-ARCHITECTURE.md. Protected translations require parent publication AND entitlement; catalog translations require publication but not enrollment. Locale selection alone never grants access.

## 11. Backend / Server Work

Server Components load bounded published exact-locale data. Search/category/level/page controls use GET query parameters; server code validates and clamps them, and all pages retain public-only projections. Page queries and counts run in parallel; categories are fetched separately. No service-role client is used.

## 12. Frontend Work

Public course details use `/{locale}/catalog/{slug}`. A valid `slug` query on `/detail-course` redirects to the canonical route; ambiguous or invalid legacy URLs remain on the localized chooser. The future authenticated learning URL is `/{locale}/learn/{slug}` and remains subject to entitlement/routing architecture. Related editorial marketing surfaces remain fixture-backed.

## 13. English / Arabic

Verify English, Arabic and RTL. Translate UI in messages; domain text uses database translation records. Exact-locale content never silently falls back; an unavailable localized course shows an explicit link only to another published translation. Existing legacy routes stay compatible without guessing a course identity.

## 14. Responsive Requirements

Required: 320, 375, 430, 768, 1024, 1280, 1440 and 1920px in BOTH en/LTR and ar/RTL. Verify actual authorized screen, overflow, wrapping, stacking, artwork, controls, navigation and error states.

## 15. Accessibility

Keyboard access, visible focus, semantic controls/headings, labels and linked errors, justified ARIA, contrast, screen-reader announcements, reduced motion and media alternatives. Review phase-specific controls in section 12.

## 16. Security Requirements

- Drafts, bodies and private instructor data absent from responses
- Malicious query input cannot broaden access

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Bound list queries and paginate; measure query counts and avoid per-record N+1. Index actual parent/owner/locale access paths. Never share-cache private responses. Measure provider latency where used.

## 18. Implementation Steps

1. [x] Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. [x] Resolve the referenced OPEN decisions that affect this slice; D13 approval and expectations are recorded in the decision register. D12 still gates real launch-content decisions.
3. [x] Review RPC grants/projections and use the existing course/curriculum tables; no table or RLS policy changes.
4. [x] Replace public catalog listing, learner course list, detail/instructor/outline fixtures with server data.
5. [x] Apply D13 canonical course routing and safe legacy compatibility.
6. [x] Handle search, filters, pagination, missing locale, loading, empty and error states.
7. [x] Add local database and browser negative cases; keep player/entitlement work out of scope.
8. [x] Finish Hosted DEV and manual evidence gates before marking VERIFIED; all mandatory Phase 09 gates are recorded below.

## 19. Automated Verification

- Catalog search/filter/pagination tests with real seeded EN/AR records
- Verify two different course links resolve different records and legacy mapping is documented
- Test unpublished/not-found/missing-locale and query preservation

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: focused `tests/learning.spec.ts`, `tests/marketing.spec.ts`, and `tests/course-catalog-integration.spec.ts`.

Local evidence (2026-10-11): `npm run typecheck`, `npm run lint`, and `npm run build` pass. The focused course suite passes 84/84, curriculum passes 36/36, and the full clean-local `npm run db:test` passes all four files, 194/194. The prior case 13 failure was reproduced only in a reused local database containing a pre-existing active admin role row. After `supabase db reset --local`, the test correctly catches SQLSTATE `23514` (admin revocation guard); no migration, authorization code, or test weakening was needed. `tests/course-catalog-integration.spec.ts`, `tests/marketing.spec.ts`, and the two relevant learner filter/legacy tests pass 10/10 after the final UI corrections. A second final clean-local database run also passes 194/194. Test processes used process-only Local Supabase values and isolated `NEXT_DIST_DIR`; `.env.local` remains unchanged. Hosted DEV was not written during these local checks; the separately approved catalog RPC migration was applied afterward, as recorded below.

Hosted/RLS preflight and migration verification (2026-10-11): the CLI link and `.env.local` URL identify the documented `ets-learn` DEV project (`szjtjikbybkezgziylir`, ACTIVE_HEALTHY, Postgres 17); the organization is on the Free plan. Before the write, local and remote histories matched through `20261011140000`, with `20261011150000_catalog_search_and_facets.sql` the sole pending migration. The exact reviewed SQL was applied with `npm run db:push`; CLI and Supabase migration history now agree through `20261011150000`. The remote course, translation, and instructor tables remain RLS-enabled with zero rows each. Read-only catalog checks confirmed all three RPCs exist with `SECURITY INVOKER`, empty `search_path`, exact-locale joins, published-course and published-translation predicates, no `PUBLIC` execute privilege, and execute privileges for `anon` and `authenticated`. Anonymous PostgREST smoke checks for search/count/categories returned zero rows/counts for both EN and AR, consistent with the empty course tables. The migration added no tables, policies, or data. Authenticated execute privilege was verified from PostgreSQL grants; a signed-in HTTP request was not performed. Draft/missing-locale behavior, filtering, pagination and nonzero counts still require the separately approved fixtures. The security advisor snapshot after the write retains the same baseline findings (7 RLS-enabled/no-policy INFO, 2 anonymous SECURITY DEFINER WARN, 28 authenticated SECURITY DEFINER WARN, 1 leaked-password-protection WARN); none names the new invoker RPCs.

Hosted write/recovery gate: the catalog migration is applied. The user approved the separate temporary fixture import in this turn, but it was not run because no authenticated admin user session is available in the connected environment; only the publishable key is configured, and the browser inventory is empty. Preflight reconfirmed the DEV ref, current migrations, no reserved-slug collisions, and authenticated execute privileges on every required authoring RPC. The import must use a real authenticated admin session and those RPCs; never impersonate a JWT through privileged SQL or substitute the service role. The project is Free tier, so do not assume a managed daily backup. The read-only schema-only dump at `tmp/phase09-hosted-preflight-public-schema.sql` is 117,925 bytes with SHA-256 `89E58CA7EA21EAA48F0C74855CF3D77F3B4A5743A93E5AD3DD8B3514F021E80C`; it contains no table data and is not a full backup. The user accepted the narrow recovery for the additive migration: if needed, use a forward corrective migration to drop only the three new function signatures, preserving migration history. This acceptance is not a full data backup. Fixture records will be retired by archiving only IDs created by the import and retaining audit history. No `.env.local` change was needed. The proposed local curriculum fixture is expressly Local/CI-only and is not safe for Hosted DEV. Hosted fixtures must use only reserved `phase09-dev-check-*` slugs, abort on any unexpected collision, never upsert an existing course, carry clearly labeled demonstration text, and include no videos, resources, learner data, or launch content. The importer must first confirm the ref, verify any existing reserved records match its complete fixture manifest before treating a rerun as a no-op, and archive only the created IDs after verification.

Planned Hosted DEV fixture manifest (not yet created or imported): create `phase09-dev-check-catalog-01` through `phase09-dev-check-catalog-24` as published EN/AR catalog fixtures with category `phase09-check-a`, level `beginner`; create `...-catalog-25` and `...-catalog-26` as published EN/AR fixtures with category `phase09-check-b`, level `intermediate`; create `phase09-dev-check-english-only` as published EN-only with category B; and create `phase09-dev-check-draft` as a draft course with draft EN/AR translations. All names and summaries will say they are temporary DEV verification data and not for sale. Course 01 gets one published module and one title-only published lesson translated EN/AR, plus a clearly labeled instructor display name; no lesson body, video, file, external URL, or assessment is added. This gives EN/AR page-two counts of 3/2, category A counts of 24/24 and category B counts of 3/2, plus exact-locale, missing-translation, draft-exclusion, instructor and outline cases. The importer will use authenticated RPCs only: `admin_create_course`, `admin_upsert_course_translation`, `admin_set_translation_publication`, `admin_set_course_status`, `admin_set_course_instructors`, `admin_create_course_module`, `admin_save_module_translation`, `admin_set_module_translation_publication`, `admin_create_lesson`, `admin_save_lesson_translation`, `admin_set_lesson_translation_publication`, and `admin_set_lesson_status`; it will not write tables directly or use a service-role key. Existing reserved-slug rows cause a full-manifest verification/no-op only if every expected record and value matches; any partial or conflicting collision aborts the import, never updates an existing row. Retirement uses `admin_set_course_status(id, 'archived')` only for the IDs recorded by the import, then rechecks that no test fixture is returned and no unrelated row count changed.

Hosted authenticated fixture verification (2026-10-12; supersedes the blocked status above): the linked CLI, configured URL and expected DEV reference matched. A one-time Supabase Auth link for the existing confirmed DEV test-admin identity was verified with the publishable-key client; the resulting Auth session passed `admin_list_courses`. Initial course count was zero and no reserved slug existed. The anonymous catalog returned the planned counts (EN 27, AR 26), category A (24/24), category B (3/2), and page-two counts (3/2). Search, category/level filters, category facets, draft exclusion, missing Arabic translation, instructor attribution and title-only outline passed. A 101-character search was rejected with SQLSTATE `22023`; the public outline contained no lesson body. All 28 created courses were archived through authenticated RPCs; all archived rows use the reserved Phase 09 prefix, and public EN/AR counts and categories returned to zero. At that verification checkpoint Arabic typography sign-off was still open; the user's subsequent approval is recorded in section 20. No secret, session token or learner data was retained in the report.

## 20. Manual Verification

- [x] Visually reviewed catalog, learner course list, detail, published outline/instructor, empty, unavailable-language and database-error screenshots. A forced local API outage produced localized EN/AR error states for both catalog and learner list at 320px and 1440px; one duplicate error message was removed.
- [x] Captured and reviewed EN/AR catalog, learner-list and detail pages at 320, 375, 430, 768, 1024, 1280, 1440 and 1920px. No document-width overflow or browser page errors were observed. Responsive screenshot artifacts and JSON reports are retained under ignored `tmp/phase09-review/`.
- [x] Checked keyboard order on the public catalog: skip link, home link, menu, search, level, submit, beginner-course link, category; all showed visible focus. Pagination Enter activation retained search/category/level and reached page 2 for EN/AR catalog and learner list (local-only 26-row fixture).
- [x] Added `role="status"`, `aria-live="polite"`, and retained `aria-busy="true"` on catalog/detail/learner loading states. A deterministic isolated RPC stub held server requests; the Playwright loading suite passed EN/AR at 320px and 1440px, captured the visible localized status, checked direction/overflow, and verified the page completed after release. Screenshots are retained in `test-results/`; they include the Next development indicator.
- [x] The user/project owner reported manually reviewing the Arabic translation on 2026-10-12 and approved the Phase 09 Arabic typography screenshots on 2026-10-12. This records the user's actual sign-off and does not assert separate reviewer credentials. Screenshots and reports are retained under `tmp/phase09-review/` and `tmp/phase09-review/arabic-signoff/`.
- [x] Automated catalog, learner-list, detail and unavailable-state direction/overflow checks pass at all eight required widths in both locales; the user's typography sign-off is recorded above.

## 21. Security Verification

- [x] Local pgTAP verifies anonymous draft/private-column denial, published-only exact-locale projections, and bounded search/count behavior; Playwright verifies no protected lesson body in the rendered detail.
- [x] Verify the new RPC definitions/grants and anonymous EN/AR empty-catalog behavior against Hosted DEV after the migration. Authenticated admin RPC calls now pass using a verified Auth session.
- [x] Read-only PostgreSQL ACL inspection confirms the three catalog RPCs are `SECURITY INVOKER`, executable by `anon` and `authenticated`, and not executable by `PUBLIC`. All admin RPCs are `SECURITY DEFINER`, executable by `authenticated`, and not executable by `anon` or `PUBLIC`; this confirms grants only, not successful signed-in requests or the admin guards.
- [x] Verify draft/missing-locale boundaries, filtering, pagination, nonzero counts and authenticated admin RPC calls against Hosted DEV using the approved temporary fixtures.
- [x] Import and archive only the Phase 09 fixture IDs through authenticated RPCs; no service-role course access or simulated JWT claims were used.

## 22. Data Verification

No new tables. Local generated types were checked against `supabase gen types typescript --local`; no remote type generation was needed for function-only changes. Local published rows and outline ordering are covered by pgTAP and browser checks. Hosted migration history is consistent through `20261011150000`. On 2026-10-12, authenticated admin RPCs created 28 reserved DEV courses, 55 translations, one instructor attribution, one module with two translations, and one lesson with two title-only translations. After verification, all 28 courses were archived through authenticated RPCs; associated translation/curriculum rows and audit history remain for traceability. Anonymous EN/AR catalog counts and categories return to zero. Fixture-backed content, exact-locale, filtering, pagination and admin-RPC behavior passed against Hosted DEV.

Verify uniqueness, parent/owner relationships, ordering, exact-locale translations, deletion/history preservation, idempotency and generated-type alignment using actual inserted/read rows. Exercise rollback on an invalid multi-record write.

## 23. Acceptance Criteria

- [x] Replace scoped catalog/detail/instructor/outline fixtures with server data
- [x] Add approved stable course identifier routing and legacy compatibility
- [x] Handle search, pagination, missing locale, loading, empty and error states
- [x] Every required predecessor is VERIFIED and blocking decisions for this integration slice are resolved; D12 remains open only for real launch content.
- [x] Phase-specific automated and negative cases pass with retained evidence.
- [x] Manual checks pass; documentation and status tables match.
- [x] English and Arabic, accessibility, approved visual parity and all eight widths pass.
- [x] Typecheck, lint, relevant tests and production build pass for implementation changes.

## 24. Evidence Required

Record date, operator, commit plus dirty diff/artifact hash, environment, exact commands, exit codes and test counts. Attach phase-specific results from sections 19–22; for UI attach EN/AR screenshots at all eight widths and manual reviewer sign-off. For data attach migration IDs, generated-type comparison and anonymous/owner/cross-user/admin/RPC/storage results. For providers attach redacted sandbox/production receipts, replay/recovery outcomes and configuration evidence. Never include credentials or real learner PII.

## 25. Rollback / Recovery

Disable the affected entry point, preserve records and evidence, and revert only the reviewed application change. Use a forward corrective migration for persisted data; never reset a shared database.

## 26. Documentation Updates

Update this phase, ../PROJECT-ROADMAP.md, VERIFICATION-MATRIX.md, OPEN-DECISIONS.md and PRODUCTION-READINESS.md. Update ../ARCHITECTURE.md, ../ROUTES.md, ../I18N.md, ../DATABASE-ARCHITECTURE.md, ../SECURITY.md or ../QA-CHECKLIST.md only where behavior/contracts changed. Preserve unrelated user edits.

## 27. Completion Gate

PHASE IMPLEMENTED:
PASS — implementation complete against Local Supabase deterministic demo seed; related marketing/editorial surfaces and unrelated learner dashboard remain outside scope.

AUTOMATED VERIFICATION:
PASS — clean-local `npm run db:test` 194/194; final Phase 09 Playwright checks 10/10; typecheck, lint and production build pass. See section 19.

MANUAL VERIFICATION:
PASS — successful, empty, unavailable, forced-error, deterministic loading, and interaction checks reviewed. The user/project owner reported manual Arabic translation review and explicitly approved the Phase 09 Arabic typography screenshots on 2026-10-12; this records that sign-off without asserting separate reviewer credentials.

SECURITY VERIFICATION:
PASS — Hosted migration history, function security flags/grants, exact-locale and published predicates, anonymous boundaries, fixture-backed draft/missing-locale/filter/pagination, and authenticated admin RPC behavior pass. Temporary courses were archived and public EN/AR projections are empty.

EN/AR VERIFICATION:
PASS — exact-locale, RTL/direction/overflow and visual checks pass at all eight required widths; Arabic typography screenshots received the user's explicit approval on 2026-10-12.

READY TO MARK VERIFIED:
YES — all required Phase 09 gates are satisfied.

READY FOR NEXT PHASE:
YES — Phase 10 dependencies 05, 07 and 08 are VERIFIED; Phase 10 still requires D14 resolution before implementation.

FAIL here means the required gate has not been demonstrated; it is not a claim that an executed test failed. The requested gate vocabulary has no NOT RUN value for security/EN/AR. Automated/manual NOT RUN refer to this canonical phase gate, not denial of historical partial checks.

## 28. Next Phase

Next phase: [Phase 10](PHASE-10-ENROLLMENT-ENTITLEMENTS.md). The user authorized progression on 2026-10-12. Its required predecessor phases are VERIFIED; implementation is blocked until the user resolves D14 (completed-enrollment access, re-enrollment counting, and active-learner curriculum-edit policy). No Phase 10 schema or application implementation has started.
