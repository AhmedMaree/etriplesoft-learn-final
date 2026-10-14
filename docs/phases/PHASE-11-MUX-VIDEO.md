# Phase 11 — Protected Video / Mux Infrastructure

## 1. Status

IN PROGRESS

2026-10-14 checkpoint: local PostgreSQL connectivity restored; all 347 DB checks pass across seven suites, including 52 Mux cases. Six real signed Odoo Development assets are already ready and linked on Hosted DEV. New management/playback migration fixes completed access and early-ready asset identity; direct upload/status and caption controls are implemented. Hosted DEV migrations are applied after a restricted public schema/data backup. Existing provider events are retained, but a fresh real upload/cancellation/error/replay lifecycle and required-caption/manual acceptance have not been re-run. Phase 11 is not marked VERIFIED. See [operator guide](../COURSE-VIDEO-GUIDE.md).

Evidence (2026-10-12): Phase 08 and Phase 10 are VERIFIED. The user approved a company-owned Mux account, separate Development and Production environments, signed playback for protected lessons, uploads by authorized admins/assigned instructors, and reviewed English/Arabic captions when required. Local Mux credentials and signing key validate without displaying values. A signed test-mode direct upload was created and cancelled successfully. Application routes, a local migration and focused signature tests are implemented. Local PostgreSQL currently accepts health checks but Supabase CLI migration connections terminate unexpectedly; database tests, real asset ready/error/webhook receipts, hosted DEV review, and deployment settings remain pending. Hosted DEV and deployment settings have not been changed.

## 2. Goal

Store locale-specific or explicitly neutral video metadata.

## 3. Why This Phase Exists

This phase owns protected video / mux infrastructure. Its verified contract enables [Phase 12](PHASE-12-LEARNING-PLAYER.md), [Phase 27](PHASE-27-COURSE-ADMINISTRATION.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 08](PHASE-08-CURRICULUM-DOMAIN.md), [Phase 10](PHASE-10-ENROLLMENT-ENTITLEMENTS.md)

Blocks: [Phase 12](PHASE-12-LEARNING-PLAYER.md), [Phase 27](PHASE-27-COURSE-ADMINISTRATION.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

The current course detail still uses static artwork. Phase 11 adds Mux server integration and metadata only; the learner player remains Phase 12.

## 6. In Scope

- Store explicitly language-neutral lesson video metadata
- Process authenticated, idempotent provider upload/asset lifecycle events
- Issue five-minute signed playback tokens after authoritative entitlement checks
- Require configured English/Arabic captions to be reviewed before issuing playback

## 7. Out of Scope

Progress credit, learner player UI and Supabase video-byte storage.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

APPROVED: D13. Mux decisions under D15 were approved 2026-10-12: company-owned account; separate Development and Production environments; signed protected playback; uploads by current admins and assigned instructors; and reviewed English/Arabic captions when required. English and Arabic lessons share a language-neutral video asset. Kashier/OpenAI decisions under D15 remain open for their phases. Phase 11 uses five-minute playback tokens; an issued token stays usable until expiry, so the maximum ordinary revocation delay is five minutes.

## 9. Database Work

`lesson_videos` stores a lesson FK, explicit neutral locale, unique Mux upload/asset/signed-playback IDs, lifecycle state and safe technical metadata. `lesson_video_captions` stores only English/Arabic track IDs and review state. `mux_webhook_events` stores event IDs/types for idempotency without retaining raw payloads. Direct table access is denied; use narrow authenticated RPCs and a service-role-only webhook RPC. Restrict deletion with history.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. Use this phase’s domain rules above and ../DATABASE-ARCHITECTURE.md. Protected translations require parent publication AND entitlement; catalog translations require publication but not enrollment. Locale selection alone never grants access.

## 11. Backend / Server Work

Server-only Mux adapter, authenticated direct upload workflow, five-minute signed token issuance, and raw-body signature-verified idempotent webhook handling. The learner player and progress tracking are explicitly excluded.

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

- Provider Development asset upload/ready/error and duplicate-event tests
- Signed playback succeeds only for actively enrolled users and published exact locales
- Token expiry, five-minute revocation window and unsupported locale asset tests
- Required captions block playback until matching English/Arabic track review is recorded

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; run `npm run test:mux-signatures` and `npm run db:test` for the new signature/DB cases. Real Mux Development upload and webhook receipts remain required for provider verification.

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

### Implementation checkpoint (2026-10-12; not VERIFIED)

- Environment: local Windows workspace, Mux Development credentials; `.env.local` is ignored and contains secrets that are not copied into logs/docs. Mux account read-only API access and local JWT generation/claims both validated. Hosted DEV and deployment settings were not changed.
- `npm run mux:validate-config` — exit 0; API credentials accepted, signing key accepted, five-minute JWT claims checked. Secret values withheld.
- `npm run test:mux-dev-upload` — exit 0; test-mode signed direct upload created and cancelled. Provider upload ID and URL withheld; no video bytes uploaded.
- `npm run test:mux-signatures` — exit 0; 4/4 pass (valid signature, forged signature, modified raw body and stale timestamp).
- `npm run typecheck` — exit 0. `npm run lint` — exit 0. `npm run build` — exit 0; all four new API routes compiled.
- `npm.cmd run db:test` — exit 1; Supabase CLI could not connect to local Postgres (`Connection terminated unexpectedly`). Earlier `npx supabase migration up --local` and `migration list --local` attempts failed the same way. The local DB container reports healthy on its health probe, but SQL connections from Supabase CLI/psql did not complete. Therefore the migration is not applied locally and `supabase/tests/database/mux_video.sql` is not run.
- No real asset-ready/error or signed Mux webhook delivery/replay receipt has been collected. No migration has been applied to Hosted DEV.
- Revision-bound evidence: Git HEAD `d6ed23a16e0e9709175cee558af36cef72958d22`; SHA-256 `a214f7e3cb9266636e26affd3374b19130ad82842721e8fcf7ef592920a5cf22` over the 14 Phase 11 implementation artifacts (explicit manifest: `.env.example`, package manifests, Mux routes/adapter, generated DB types, migration, pgTAP suite, and three Mux scripts; excludes `.env.local`). The worktree remains dirty with pre-existing user changes; no commit was created.

## 25. Rollback / Recovery

Disable the affected entry point, preserve records and evidence, and revert only the reviewed application change. Use a forward corrective migration for persisted data; never reset a shared database.

## 26. Documentation Updates

Update this phase, ../PROJECT-ROADMAP.md, VERIFICATION-MATRIX.md, OPEN-DECISIONS.md and PRODUCTION-READINESS.md. Update ../ARCHITECTURE.md, ../ROUTES.md, ../I18N.md, ../DATABASE-ARCHITECTURE.md, ../SECURITY.md or ../QA-CHECKLIST.md only where behavior/contracts changed. Preserve unrelated user edits.

## 27. Completion Gate

PHASE IMPLEMENTED:
PARTIAL — local routes and migration authored; local migration application is pending database connectivity

AUTOMATED VERIFICATION:
PARTIAL — Mux configuration validation PASS; test-mode upload/cancel PASS; webhook signature tests 4/4 PASS; TypeScript/lint/build PASS; database suite and asset webhook lifecycle pending

MANUAL VERIFICATION:
NOT RUN

SECURITY VERIFICATION:
PARTIAL — route/database authorization and signature tests implemented; DB/RLS execution pending

EN/AR VERIFICATION:
NOT APPLICABLE

READY TO MARK VERIFIED:
NO — provider lifecycle, DB/RLS, hosted DEV approval, and retained revision-bound evidence remain outstanding

READY FOR NEXT PHASE:
NO

FAIL here means the required gate has not been demonstrated; it is not a claim that an executed test failed. The requested gate vocabulary has no NOT RUN value for security/EN/AR. Automated/manual NOT RUN refer to this canonical phase gate, not denial of historical partial checks.

## 28. Next Phase

Recommended sequential candidate: [Phase 12](PHASE-12-LEARNING-PLAYER.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.
