# Phase 10 — Hosted DEV Preflight & Manual Review Pack

Read-only preflight and local UI review captured 2026-10-12. **Update, same day:** on the user's instruction the four migrations were applied to Hosted DEV, the six-course demo set was imported, and the hosted enrollment suite ran 32/32; no logical backup was taken first. See section 24 of the Phase 10 contract for the execution record. The text below is the original preflight and is kept as written.

## Hosted DEV target and migration alignment

- Connected target: Supabase project `ets-learn`, ref `szjtjikbybkezgziylir`, region `eu-west-1`, status `ACTIVE_HEALTHY`, Postgres 17.6.1.155. This matches the Phase 09 target recorded in the roadmap. The organization also has a distinct active project named `ets`; do not substitute it.
- Hosted DEV migration ledger contains 11 versions through `20261011150000` (`catalog_search_and_facets`). The local `supabase_migrations.schema_migrations` ledger contains the same 11 versions plus the four Phase 10 versions below. No version drift was observed.
- The globally resolved CLI is v2.103.0 and rejects `db.orioledb_version` / `config.local_smtp`; the project-pinned CLI is v2.119.0 and successfully reads the config with `node_modules/.bin/supabase.cmd migration list --local`. `package.json` and lockfile already pin the compatible CLI. Use `npm run db:*` or the project-local CLI; do not edit TOML or upgrade unrelated dependencies to work around a stale global CLI.
- A read-only Hosted DEV catalog check confirmed the enrollment table, enrollment RPCs, enrollment RLS policies/triggers, and `admin_audit_log.enrollment_id` do not yet exist.

| Pending version | SHA-256 | Effects on Hosted DEV |
| --- | --- | --- |
| `20261012120000_enrollment_entitlements.sql` | `BF51E784154405B778D700567EF7D284C08977223D1AF5983DAD64D1A7D32D8C` | Creates `enrollments`; FKs use `ON DELETE RESTRICT`; adds lifecycle/source constraints and four indexes; enables owner-only SELECT RLS; adds atomic free-grant, admin-revoke, and exact-locale lesson/resource RPCs; replaces audit action/target constraints to recognize enrollment. Grants SELECT only to anon/authenticated; no direct service-role privileges. No existing rows are deleted or updated. |
| `20261012123000_allow_completed_enrollment_revocation.sql` | `424B7BAB0B1F6E1372325D97768499008C43710CD74941D558559E4B08D55758` | Replaces the enrollment lifecycle check so a completed row can later be revoked/expired without losing its completion timestamp. |
| `20261012130000_enable_anonymous_enrollment_denial.sql` | `098BB9A7C54869DE3F0DCA5E2DEBF791B6D1C60A6F7AC8080FB43A55BE98B212` | Grants anon SELECT on `enrollments`; no anon RLS policy is added, so RLS must still return no rows. |
| `20261012140000_typed_enrollment_audit_target.sql` | `5DCB2EB8E0276784F5A267D20046F7D7B10644E32C64A43EED70B5D1D47C9A36` | Adds nullable `enrollment_id` with an `ON DELETE RESTRICT` FK and index; tightens/replaces audit target-shape constraint; updates revoke RPC to identify the exact enrollment in audit. |

All four are additive DDL/constraint/function/grant changes. There are no `DROP TABLE`, `DELETE`, `TRUNCATE`, or existing-row `UPDATE` statements. The first migration does drop and replace three `admin_audit_log` CHECK constraints; PostgreSQL validates replacements against existing audit rows. Baseline observed: 218 audit rows (target types user 3, course 192, lesson 6, user_role 12, course_module 5); 28 courses are archived; enrollment table absent. These counts are a preflight snapshot, not a post-change claim.

### Security review findings before approval

- The new table has RLS and an owner SELECT policy for authenticated users. Anonymous SELECT has no policy and is denied by default. Learner writes are intended only through the free-grant RPC; status updates are not granted through the Data API.
- `learner_grant_free_enrollment` checks `auth.uid()`, published/zero-price course state, serializes same-user/course requests with an advisory transaction lock, returns an existing active row, and inserts a new history row otherwise. Direct writes remain unavailable to learner roles.
- Lesson and resource RPCs require the parent course, module translation, lesson, and requested-locale translation to be published. Non-preview content also requires a current non-expired active/completed enrollment. Preview does not bypass publication or exact-locale checks.
- `admin_revoke_enrollment` calls the protected current-role check and writes a typed audit record. The client passes no role claim as authorization.
- **Service-role decision: direct table access is unnecessary.** All four enrollment/content RPCs are `SECURITY DEFINER`, owned by `postgres`; their database work (including `assert_active_admin()` for revoke) runs using the trusted function owner, while caller identity/authorization is checked inside each operation. App enrollment reads use the signed-in request-scoped client. The local concurrency harness queries as local `postgres`; no application or script depends on service-role table DML. The pending migration now omits service-role SELECT and `GRANT ALL`, with explicit `REVOKE ALL`; pgTAP checks SELECT/INSERT/UPDATE/DELETE are unavailable. This is defense-in-depth, not a change to Supabase's standard privileged `service_role`/RLS-bypass behavior: a privileged server credential still bypasses RLS where it has table privileges, so it stays server-only and receives no enrollment-table grant.
- Hosted security/RLS behavior is not yet verified because the table and functions do not exist on Hosted DEV.

## Backup and recovery plan

No backup was created in this read-only pass. The project details connector does not expose plan or backup availability. Earlier project records say not to assume managed daily backups and retain only a schema-only Phase 09 dump; that file is not a data backup. Confirm current plan/backup inventory in the dashboard before applying anything.

Before migration approval, the proposed safeguard is a fresh full logical export of roles/schema/data using the official Supabase CLI dump workflow, stored encrypted in a restricted, non-repository location. Validate that the dump is readable and restore it into an isolated disposable database; do not test restore against Hosted DEV. The export can include `auth.users` and other personal data, so generating/storing it requires separate explicit approval and a secure destination. Supabase notes that database dumps do not include Storage API objects; that limitation must be accepted or handled separately. See [Supabase database backups](https://supabase.com/docs/guides/platform/backups) and [Supabase restore from Platform](https://supabase.com/docs/guides/self-hosting/restore-from-platform).

Proposed approved procedure (not run): (1) confirm Hosted DEV plan, managed-backup/PITR coverage and retention in Dashboard; (2) obtain a direct/session-pooler connection string through the approved secrets manager without putting it in shell history, `.env.local`, logs, or command output; (3) use the pinned CLI to export separate roles, schema, and data files with `supabase db dump --db-url ... --role-only`, `supabase db dump --db-url ...`, and `supabase db dump --db-url ... --data-only --use-copy`; (4) write only into an organization-approved encrypted, access-controlled backup vault outside the repository/workspace, with named custodians and a retention/expiry date; (5) calculate SHA-256 hashes and record them in a separate access-controlled manifest; (6) inspect that all three files are nonempty/readable and compare pre-backup row counts for critical tables; (7) restore into an isolated disposable Postgres/Supabase instance and verify schema, extensions, Auth row counts, roles, policies, functions, and representative data. The dump contains sensitive Auth data; never attach it to chat, commit it, or use Hosted DEV as the restore target. Storage objects, Edge Functions, Auth provider settings, and secrets are separate backup/configuration concerns.

Migration deployment checklist after approval: verify project ref `szjtjikbybkezgziylir` again; verify remote history has exactly the four reviewed versions pending and local file hashes match this table; capture an approved backup and validated restore evidence; check schema/data baseline and ensure no unrelated newer migration is pending; run only the four reviewed migrations; stop at first error; compare migration history, constraints/indexes/functions/owner/grants/RLS/policies to local; run read-only post-checks before any fixtures. A general `db push --linked` must not be used if it would include unreviewed pending migrations.

If a migration fails, stop before applying later versions, capture the error and current migration ledger, and use a reviewed forward corrective migration. Do not reset/drop the shared database or restore an older whole-database backup without separate explicit approval; a restore can discard unrelated new data. Enrollment and audit FKs intentionally preserve history and restrict deletion.

## Hosted DEV security test plan (not executed)

Use direct Supabase Auth/PostgREST/RPC requests with normal role-scoped user tokens; do not use service role for learner assertions. Use synthetic `example.test` identities and a purpose-built free course with EN/AR published parent/module/lesson translations, a draft lesson/translation, a preview lesson, and exact-locale resources. Do not use real learner accounts or paid courses.

| Case | Caller/setup | Expected result | Local evidence |
| --- | --- | --- | --- |
| Authenticated grant | Learner A grants a published free course | One active owner row and returned ID | Covered in local pgTAP |
| Repeated/idempotent grant | Same learner/course twice | Same active ID; one active row | Covered in local pgTAP |
| Concurrent grants | Eight simultaneous same-user/course RPC calls | Exactly one active row/ID | Local concurrency check 8/8; Hosted pending |
| Anonymous denial | anon SELECT and grant RPC; non-preview lesson/resource RPC | Zero enrollment rows; grant denied; protected content empty | Covered in local pgTAP |
| Cross-user isolation | Learner B reads/substitutes A's enrollment and lesson IDs | No row/content disclosure | Covered in local pgTAP |
| Direct mutation | anon/authenticated INSERT, UPDATE status, DELETE | Permission denied; no row changes | All three learner verbs explicitly denied locally; service-role SELECT/INSERT/UPDATE/DELETE absent |
| Revoked/expired/completed | Grant, revoke as admin; create expired fixture; read content | Revoked/expired deny; completed remains entitled until revoke/expiry | Covered in local pgTAP; hosted pending |
| Re-enrollment/history | Complete/revoke/expire, then grant again | New row; old row and audit remain | Covered in local pgTAP |
| Published vs draft | Request published and draft course/lesson translation/lesson | Only fully published exact-locale path returns content | Local pgTAP asserts unpublished course grant denial, unpublished lesson preview denial, and draft locale denial |
| Preview boundaries | anon and learner request explicit preview, unpublished preview and wrong locale | Only published exact-locale preview can bypass enrollment | Local pgTAP covers published preview, unpublished lesson/translation, and exact-locale boundary |
| Admin boundary | Learner attempts revoke, forged `app_metadata`/user metadata says admin; authorized admin revokes | Learner/forged role denied; current protected role succeeds and exact enrollment is audited | Local pgTAP covers non-admin/forged claims and authorized revoke/audit |

Hosted tests require writes. The schema's RESTRICT FKs and typed audit FK mean successful revocation creates records that cannot be deleted without breaking the history chain. Proposed cleanup is therefore to revoke access, archive the synthetic course, ban/disable synthetic Auth identities, and retain their enrollment/role/audit rows as clearly tagged test history. This is not deletion-cleanup and is a persistent DEV data change; its exact record count and retention must be approved before test setup. Creating/promoting a test admin also writes protected role/audit history; alternatively an existing admin must deliberately run the authorized test step. No test identities or fixtures have been created.

Temporary-fixture plan (not imported): create only the approved `example.test` learner accounts and one synthetic free course/EN-AR curriculum needed by the security cases, tagging every row with a run identifier and explicit test purpose. Verify exact owned IDs before test, never truncate shared tables, and do not use persistent demo courses for hostile/negative tests. Retire by removing learner access, archiving only the test-owned course, banning test-only identities, and retaining enrollment and audit history for an owner-approved period; because history FKs restrict deletion, do not promise row deletion as cleanup. Record final owned IDs and retained-row counts. Any deletion/import outside this plan needs separate approval.

### Persistent Hosted DEV demonstration content (separate approval; not imported)

The Local/CI seed defines six placeholder courses with 26 modules and 98 lessons, assistant-authored sample learning content, and explicit demo-only required/preview configuration. It must remain visibly labeled as demonstration material and separate from temporary security-test users/records. After separate content/translation/licensing review and approval, propose an idempotent, versioned import into the same course, translation, curriculum, and lesson tables consumed by the public catalog and the same learner/admin RPC/RLS authorization already implemented. Do not create a parallel demo schema or bypass entitlement checks. First compare stable natural keys/IDs, EN/AR publication completeness and content origin against Hosted DEV; preview flags and historical progress behavior require explicit review. Import counts must be exactly 6 courses / 26 modules / 98 lessons, with zero enrollment rows or test accounts, and must be rechecked after import. This user-requested content strategy is not part of the current migration/test approval.

## Local manual UI capture and findings

The local app ran against the local Supabase endpoint only. Its `SUPABASE_SERVICE_ROLE_KEY` was blank; the isolated authenticated test runner used a short-lived local-only token and directly cleaned only its synthetic account/rows. Captures are under `tmp/phase10-manual-review/` (47 PNGs):

- EN and AR guest course detail at 320, 375, 430, 768, 1024, 1280, 1440, and 1920px.
- EN and AR enrollment-error state at all eight widths.
- Arabic unavailable/draft-locale state at all eight widths.
- EN/AR keyboard guest submission / locale-matched login-return capture at 375px.
- EN/AR pending submission at 375px, with announced status, disabled duplicate-submit control, and localized label.
- Authenticated EN active success, EN expired, and AR revoked states at 375px.

Reproducible checks passed: locale `lang`/`dir`, visible enrollment CTA/error/unavailable state, no horizontal overflow at all eight widths, and Enter-key login return in both locales. The pending-state test held the Server Action POST and verified busy text, disabled duplicate submit and live announcement in EN/AR at all eight widths. A disposable local learner completed enrollment, idempotent repeat, completion/re-enrollment, expiry and revoke state rendering; screens were checked at all widths. Service-role table grants were removed locally and the signed-in flow still passed. `src/arabic-font.css` declares self-hosted IBM Plex Sans Arabic (`Plex Arabic`) with Arabic glyph ranges; screenshots show RTL and mixed Python/Odoo text. Arabic outline content is incomplete in current local demo fixtures (only 4/26 module translations and 8/98 lesson translations), so the no-fallback “content unavailable” copy appears for some Arabic detail outlines; treat this as demo data coverage, not a fallback defect. These are technical checks, not typography or human visual approval.

Error/retry UI is rendered and the authenticated test starts from the retryable error query state before succeeding; a simulated transient network/RPC outage followed by retry remains untested. Guest login-required behavior is covered.

### Human-review checklist (user approval recorded 2026-10-12)

- [x] Review guest and error screenshots in both locales; confirm headline/button wrapping and no clipping at all eight widths.
- [x] Confirm IBM Plex Sans Arabic glyph shapes, weight, line height, and fallback behavior; inspect mixed Python/Odoo text and digits.
- [x] Confirm RTL placement, cards/image order, header/menu behavior, button alignment, and status/error announcement.
- [x] Review keyboard tab order, visible focus, Enter-key behavior, reduced-motion/zoom as appropriate.
- [x] Review the captured authenticated, failure and loading/pending states and approve the manual English/Arabic visual/accessibility checklist.
- [x] User sent explicit approval on 2026-10-12. The transient outage-and-retry simulation remains untested as recorded above.

## Approval and execution record

1. The four reviewed migration versions/hashes were applied to `ets-learn` (`szjtjikbybkezgziylir`) on 2026-10-12; no other project or migration was targeted.
2. No pre-migration full logical backup was created. The missing backup and its recovery implications are recorded as a residual limitation; no export destination/custodian was supplied.
3. The temporary Hosted DEV fixture tests and six-course demo-content import were executed on the user's instruction. Their persistent synthetic history and imported placeholder content are recorded above.
4. Manual EN/AR UI/typography/accessibility approval was provided by the user after reviewing the captures on 2026-10-12.

Update 2026-10-12: Phase 10 is VERIFIED after the user's manual approval. Phase 11 has been selected but is BLOCKED by D15 because the user does not yet know the Mux account owner or provider operating policies. The missing pre-migration logical backup and transient retry simulation remain documented limitations.

Later update 2026-10-12: The user approved the Mux-specific D15 decisions (company-owned account, separate Development/Production environments, signed protected playback, authorized admin/assigned-instructor uploads, and reviewed English/Arabic captions when required). Phase 11 is now IN PROGRESS. Local implementation and Mux configuration/signature checks are underway; no Hosted DEV database or deployment setting has been changed.
