# Phase 06 — Admin Authorization & Audit Foundation

## 1. Status

VERIFIED (by user decision, with accepted gaps): local pgTAP 74/74, live lifecycle 11/11 (DEV and local) and eight-width EN/AR screens pass. Native Arabic review, manual reviewer UI sign-off and a screen-reader pass were NOT done and are accepted as written gaps (below).

Evidence: src/lib/supabase/auth.ts has requireRole and user_roles has protected grant history. Existing admin_audit_log supports role targets only. No admin routes or complete domain audit service exist.

## 2. Goal

Define server-authoritative admin route/action boundaries.

## 3. Why This Phase Exists

This phase owns admin authorization & audit foundation. Its verified contract enables [Phase 07](PHASE-07-COURSE-DOMAIN.md), [Phase 18](PHASE-18-CERTIFICATES.md), [Phase 20](PHASE-20-KASHIER-PAYMENTS.md), [Phase 27](PHASE-27-COURSE-ADMINISTRATION.md), [Phase 28](PHASE-28-LEARNER-ADMINISTRATION.md), [Phase 29](PHASE-29-COMMERCE-ADMINISTRATION.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 04](PHASE-04-SUPABASE-FOUNDATION.md), [Phase 05](PHASE-05-AUTH-PROFILES-ONBOARDING.md)

Blocks: [Phase 07](PHASE-07-COURSE-DOMAIN.md), [Phase 18](PHASE-18-CERTIFICATES.md), [Phase 20](PHASE-20-KASHIER-PAYMENTS.md), [Phase 27](PHASE-27-COURSE-ADMINISTRATION.md), [Phase 28](PHASE-28-LEARNER-ADMINISTRATION.md), [Phase 29](PHASE-29-COMMERCE-ADMINISTRATION.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

src/lib/supabase/auth.ts has requireRole and user_roles has protected grant history. Existing admin_audit_log supports role targets only. No admin routes or complete domain audit service exist.

## 6. In Scope

- Define server-authoritative admin route/action boundaries
- Implement controlled bootstrap/grant/revoke workflow with audit
- Provide extensible typed audit targets as owning domains arrive

## 7. Out of Scope

Course editor, learner support console and payment administration.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

OPEN / DEFERRED: D11 — see [decision register](OPEN-DECISIONS.md).

## 9. Database Work

Reuse user_roles/admin_audit_log; migrate audit target constraints when real target tables exist. Preserve role history, restricted FKs and append-only audit.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. Use this phase’s domain rules above and ../DATABASE-ARCHITECTURE.md. Protected translations require parent publication AND entitlement; catalog translations require publication but not enrollment. Locale selection alone never grants access.

## 11. Backend / Server Work

Check current role records on every privileged action; no authority from metadata or instructor attribution.

## 12. Frontend Work

Minimal authorized admin shell and denied states, following existing design tokens; admin URLs to be documented.

## 13. English / Arabic

Verify English, Arabic, RTL, mixed LTR identifiers/email/code, Western digits, localized validation and metadata where applicable. Translate UI in messages; domain text uses the phase’s database translation records. Exact-locale content never silently falls back. Minimal authorized admin shell and denied states, following existing design tokens; admin URLs to be documented.

## 14. Responsive Requirements

Required: 320, 375, 430, 768, 1024, 1280, 1440 and 1920px in BOTH en/LTR and ar/RTL. Verify actual authorized screen, overflow, wrapping, stacking, artwork, controls, navigation and error states.

## 15. Accessibility

Keyboard access, visible focus, semantic controls/headings, labels and linked errors, justified ARIA, contrast, screen-reader announcements, reduced motion and media alternatives. Review phase-specific controls in section 12.

## 16. Security Requirements

- Learner/instructor cannot access admin routes or mutate grants
- Revoked admin cannot act with stale claims
- Audit cannot be updated/deleted by application clients

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Bound list queries and paginate; measure query counts and avoid per-record N+1. Index actual parent/owner/locale access paths. Never share-cache private responses. Measure provider latency where used.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Review constraints, indexes, FKs/deletion, grants/RLS and transaction boundaries for section 9. Only where this phase owns schema changes, create ordered migrations, add necessary DEV-only fixtures and regenerate types. Verification/infrastructure phases must not introduce new schema outside their stated scope.
4. Define server-authoritative admin route/action boundaries
5. Implement controlled bootstrap/grant/revoke workflow with audit
6. Provide extensible typed audit targets as owning domains arrive
7. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
8. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- Test admin grant/revoke lifecycle and immediate loss of access
- Test direct Server Action calls and audit creation/immutability
- Test admin login/denial in both locales

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

Database/RLS: extend `supabase/tests/database/foundation_rls.sql` or new domain SQL suites and run `npm run db:test` in disposable local/CI Supabase. Extend `scripts/validate-hosted-rls.mjs` or a domain validator for hosted DEV and run the documented command; today `npm run db:test:hosted` covers identity only, so it cannot certify a new domain. Verify DEV target and supply credentials securely before any mutating test. Both policy behavior and constraint/transaction coverage are mandatory; environment unavailability is a blocker, not a pass.

## 20. Manual Verification

- [ ] Manually exercise and inspect: Test admin grant/revoke lifecycle and immediate loss of access.
- [ ] Manually exercise and inspect: Test direct Server Action calls and audit creation/immutability.
- [ ] Manually exercise and inspect: Test admin login/denial in both locales.
- [ ] Review success, empty, invalid, loading and failure states as the intended role in EN/AR.
- [ ] Verify all eight widths, keyboard/focus and mixed technical values.

## 21. Security Verification

- [ ] Learner/instructor cannot access admin routes or mutate grants
- [ ] Revoked admin cannot act with stale claims
- [ ] Audit cannot be updated/deleted by application clients

## 22. Data Verification

Reuse user_roles/admin_audit_log; migrate audit target constraints when real target tables exist. Preserve role history, restricted FKs and append-only audit.

Verify uniqueness, parent/owner relationships, ordering, exact-locale translations, deletion/history preservation, idempotency and generated-type alignment using actual inserted/read rows. Exercise rollback on an invalid multi-record write.

## 23. Acceptance Criteria

- [ ] Define server-authoritative admin route/action boundaries
- [ ] Implement controlled bootstrap/grant/revoke workflow with audit
- [ ] Provide extensible typed audit targets as owning domains arrive
- [ ] Every required predecessor is VERIFIED and blocking decisions are resolved.
- [ ] Phase-specific automated and negative cases pass with retained evidence.
- [ ] Manual checks pass; documentation and status tables match.
- [ ] English and Arabic, accessibility, approved visual parity and all eight widths pass.
- [ ] Typecheck, lint, relevant tests and production build pass for implementation changes.

## 24. Evidence Required

Record date, operator, commit plus dirty diff/artifact hash, environment, exact commands, exit codes and test counts. Attach phase-specific results from sections 19–22; for UI attach EN/AR screenshots at all eight widths and manual reviewer sign-off. For data attach migration IDs, generated-type comparison and anonymous/owner/cross-user/admin/RPC/storage results. For providers attach redacted sandbox/production receipts, replay/recovery outcomes and configuration evidence. Never include credentials or real learner PII.

## Evidence checkpoint — 2026-10-08 (local pgTAP, live lifecycle, screens)

Operator: Claude Code. Revision `d710c94` plus the uncommitted working tree. The lifecycle writes users and append-only audit rows that can never be deleted, so this pass ran against the **disposable local Docker Supabase** (a production build served on port 3011, local keys read from `supabase status`), not hosted DEV; nothing was added to hosted DEV by this pass.

| Check | Command | Result |
|---|---|---|
| Local pgTAP | `npm run db:test` | PASS 74/74 (28 admin cases in `admin_authorization.sql`, 46 foundation cases) |
| Live admin lifecycle | `tests/admin-authorization.spec.ts` with `PHASE06_LIVE=1` against the local stack | PASS 11/11 (anonymous redirects EN/AR, learner denial EN/AR including forged admin metadata, direct RPC and audit-table denial, admin pages EN/AR, UI grant/revoke with audit rows, immediate loss of access for a revoked admin, last-admin protection) |
| Screens at eight widths | new `tests/admin-screens.spec.ts` (`PHASE06_LIVE=1`) | PASS 4/4: `/admin`, `/admin/audit` as an admin and the denied state as a learner at 320, 375, 430, 768, 1024, 1280, 1440 and 1920 px in EN/LTR and AR/RTL, `dir` correct, no horizontal page overflow; 48 captures kept locally under `test-results/phase06/` |
| Keyboard / names / focus | same spec | PASS: every form control named, each Tab stop shows a visible focus indicator, Enter submits, a failed lookup is announced via an alert (EN and AR) |
| Regular run | `npx playwright test` (no key) | 59 passed, 30 skipped (key- or live-gated, each with a reason), 0 failed; typecheck and lint PASS; production build PASS |

Defect found and fixed: at 320 px the admin pages were 568 px wide. Two causes: `.admin-main` was a grid whose single column sized to its content, and the visually-hidden table labels (absolutely positioned) escaped the table wrapper's clipping because the wrapper was not a positioned ancestor. Fixed in `src/features/admin/admin.css` (`grid-template-columns: minmax(0, 1fr)` on `.admin-main`; `position: relative` on `.admin-table-wrap`). The earlier spec only checked the default width, which is why it passed.

Test-suite defect fixed: `foundation_rls.sql` (see Phase 04, Evidence checkpoint 2).

Still open (human sign-off, no reason to claim otherwise):

- Native Arabic review of the admin copy.
- Manual reviewer sign-off on the EN/AR screens and a screen-reader pass.
- Approved-reference visual review (there is no approved admin design reference; the shell was built from existing tokens).
- Note for reviewers: at 320 px the grants/audit tables scroll horizontally inside a keyboard-focusable region, so some columns (for example Role) are clipped until scrolled.

Decision (2026-10-10): the user chose to mark Phase 06 VERIFIED so Phase 07 can start, accepting these gaps with the reasons already written above:

| Accepted gap | Reason | Where it is picked up |
|---|---|---|
| Native Arabic review of admin copy | Needs a native reviewer; automated checks confirm `dir`, Western digits and key parity only | Phase 36 (content and translation audit) |
| Manual reviewer UI sign-off and screen-reader pass | Needs a person and assistive technology; automated name/focus/keyboard checks pass | Phase 31 (accessibility audit) and Phase 32 (visual QA) |
| Approved-reference visual review | No approved admin design reference exists; the shell uses existing tokens | Phase 32 |
| Narrow-screen tables scroll horizontally | By design inside a keyboard-focusable region; some columns are clipped until scrolled | Phase 32 |

Verified on this basis; the gaps stay open in those later phases.

## 25. Rollback / Recovery

Disable the affected entry point, preserve records and evidence, and revert only the reviewed application change. Use a forward corrective migration for persisted data; never reset a shared database.

## 26. Documentation Updates

Update this phase, ../PROJECT-ROADMAP.md, VERIFICATION-MATRIX.md, OPEN-DECISIONS.md and PRODUCTION-READINESS.md. Update ../ARCHITECTURE.md, ../ROUTES.md, ../I18N.md, ../DATABASE-ARCHITECTURE.md, ../SECURITY.md or ../QA-CHECKLIST.md only where behavior/contracts changed. Preserve unrelated user edits.

## 27. Completion Gate

PHASE IMPLEMENTED:
YES

AUTOMATED VERIFICATION:
PASS (pgTAP 74/74, live lifecycle 11/11, screens 4/4, regular run 59 passed / 30 gated skips / 0 failed)

MANUAL VERIFICATION:
PASS (accepted by user with the written gaps above)

SECURITY VERIFICATION:
PASS (learner and instructor denied, revoked admin loses access immediately, audit append-only, direct RPC and table denial)

EN/AR VERIFICATION:
PASS (EN and AR at eight widths; native Arabic review accepted as a gap)

READY TO MARK VERIFIED:
YES

READY FOR NEXT PHASE:
YES

FAIL here means the required gate has not been demonstrated; it is not a claim that an executed test failed. The requested gate vocabulary has no NOT RUN value for security/EN/AR. Automated/manual NOT RUN refer to this canonical phase gate, not denial of historical partial checks.

## 28. Next Phase

Recommended sequential candidate: [Phase 07](PHASE-07-COURSE-DOMAIN.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.

## 29. Implementation record (2026-10-08)

- Decision D11 approved: operator-script bootstrap; admin UI grants `admin` and `instructor`.
- Migration `20261008120000_admin_authorization_audit.sql`: `assert_active_admin()` (current role row, never claims), RPCs `admin_grant_role`, `admin_revoke_role` (refuses the last active admin), `admin_find_user_by_email` (audited), `admin_list_role_grants`, `admin_list_audit` (bounded to 100 rows), typed audit `target_type` (`user_role`, `user`), and append-only triggers (update/delete/truncate rejected, even for the owner). No service-role key is added to the web app.
- UI: `/{locale}/admin` and `/{locale}/admin/audit` under the `(admin)` route group; anonymous visitors go to login, signed-in non-admins see a denied state; every page and RPC re-checks the role.
- Operator command: `npm run admin:bootstrap -- --email=... [--apply]` (dry run by default; refuses when an active admin exists).
- Tests: `supabase/tests/database/admin_authorization.sql` (28 pgTAP cases, NOT RUN: no Docker); `tests/admin-authorization.spec.ts` (anonymous redirects 4/4 pass; hosted lifecycle cases opt in with `PHASE06_LIVE=1`, NOT RUN until the migration is applied).
- Checks: typecheck, lint and production build pass; `tests/i18n-messages.spec.ts` 4/4 pass.
- Migration applied to hosted DEV 2026-10-08 via `supabase db push --linked`; `src/types/database.ts` regenerated from DEV. Anonymous calls to all five admin RPCs and `assert_active_admin` are rejected with 42501 (checked with the publishable key). 
- 2026-10-08 live run on DEV (`PHASE06_LIVE=1`, service key fetched process-only via the CLI, never stored): the first run exposed a real defect (`pg_catalog.greatest/least` do not exist, so both list RPCs failed); fixed by forward migration `20261008130000_admin_list_pagination_fix.sql`. After the fix `tests/admin-authorization.spec.ts` passes 11/11: anonymous redirects EN/AR, learner denial EN/AR (including admin metadata), direct RPC/audit-table denial, admin pages EN/AR, UI grant/revoke with audit rows, immediate loss of access for a revoked admin, last-admin protection. The suite's login helper was also fixed after it initially passed vacuously on the login page.
- Remaining before VERIFIED: native Arabic review and manual UI sign-off (pgTAP, eight-width captures and the keyboard/focus review were completed later on 2026-10-08; see the evidence checkpoint). Lifecycle users cannot be deleted afterwards (restricted foreign keys, append-only audit), so run the live lifecycle against the local database.
