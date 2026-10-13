# Verification matrix

REQUIRED is a mandatory gate when executing the included phase. OPTIONAL is informative only. N/A needs the phase scope reason. These requirements do not claim tests already exist. Deferred phases 23/24/26 show their currently scoped disposition review; activation requires updating this matrix. Every implementation phase also requires typecheck and lint even though the requested table has only a Build column.

| Phase | DB | RLS | Unit | Integration | Playwright | EN/AR | Responsive | Accessibility | Security | Build |
|---|---|---|---|---|---|---|---|---|---|---|
| [Phase 00](PHASE-00-PROJECT-BASELINE.md) | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| [Phase 01](PHASE-01-NEXTJS-ARCHITECTURE.md) | N/A | OPTIONAL | OPTIONAL | REQUIRED | REQUIRED | REQUIRED (routing/direction) | REQUIRED (route render/overflow smoke) | N/A | REQUIRED (server boundary) | REQUIRED |
| [Phase 02](PHASE-02-DESIGN-RESPONSIVE-FOUNDATION.md) | N/A | OPTIONAL | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 03](PHASE-03-I18N-RTL-FOUNDATION.md) | N/A | OPTIONAL | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 04](PHASE-04-SUPABASE-FOUNDATION.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | N/A | N/A | N/A | N/A | REQUIRED | REQUIRED |
| [Phase 05](PHASE-05-AUTH-PROFILES-ONBOARDING.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 06](PHASE-06-ADMIN-AUTHORIZATION.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 07](PHASE-07-COURSE-DOMAIN.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | N/A | N/A | N/A | N/A | REQUIRED | REQUIRED |
| [Phase 08](PHASE-08-CURRICULUM-DOMAIN.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | N/A | N/A | N/A | N/A | REQUIRED | REQUIRED |
| [Phase 09](PHASE-09-COURSE-CONTENT-INTEGRATION.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 10](PHASE-10-ENROLLMENT-ENTITLEMENTS.md) | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 11](PHASE-11-MUX-VIDEO.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | N/A | N/A | N/A | N/A | REQUIRED | REQUIRED |
| [Phase 12](PHASE-12-LEARNING-PLAYER.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 13](PHASE-13-PROGRESS-TRACKING.md) | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 14](PHASE-14-ASSESSMENT-DOMAIN.md) | REQUIRED | REQUIRED | REQUIRED | REQUIRED | N/A | N/A | N/A | N/A | REQUIRED | REQUIRED |
| [Phase 15](PHASE-15-ASSESSMENT-ATTEMPTS.md) | REQUIRED | REQUIRED | REQUIRED | REQUIRED | N/A | N/A | N/A | N/A | REQUIRED | REQUIRED |
| [Phase 16](PHASE-16-ASSESSMENT-UI.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 17](PHASE-17-COURSE-COMPLETION.md) | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 18](PHASE-18-CERTIFICATES.md) | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 19](PHASE-19-ORDERS-CHECKOUT.md) | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 20](PHASE-20-KASHIER-PAYMENTS.md) | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 21](PHASE-21-LEARNING-PATHS.md) | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 22](PHASE-22-LEARNER-DASHBOARD.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 23](PHASE-23-CALENDAR.md) | N/A | N/A | N/A | N/A | OPTIONAL | OPTIONAL | OPTIONAL | OPTIONAL | REQUIRED | N/A |
| [Phase 24](PHASE-24-NOTIFICATIONS.md) | N/A | N/A | N/A | N/A | OPTIONAL | OPTIONAL | OPTIONAL | OPTIONAL | REQUIRED | N/A |
| [Phase 25](PHASE-25-AI-ASSISTANT.md) | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 26](PHASE-26-COMMUNITY-MESSAGES.md) | N/A | N/A | N/A | N/A | OPTIONAL | OPTIONAL | OPTIONAL | OPTIONAL | REQUIRED | N/A |
| [Phase 27](PHASE-27-COURSE-ADMINISTRATION.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 28](PHASE-28-LEARNER-ADMINISTRATION.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 29](PHASE-29-COMMERCE-ADMINISTRATION.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 30](PHASE-30-SEO-METADATA.md) | N/A | OPTIONAL | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 31](PHASE-31-ACCESSIBILITY.md) | N/A | OPTIONAL | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 32](PHASE-32-RESPONSIVE-VISUAL-QA.md) | N/A | OPTIONAL | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 33](PHASE-33-PERFORMANCE.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 34](PHASE-34-SECURITY-PRIVACY.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 35](PHASE-35-OBSERVABILITY.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 36](PHASE-36-CONTENT-TRANSLATION-AUDIT.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 37](PHASE-37-PRODUCTION-INFRASTRUCTURE.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 38](PHASE-38-PRODUCTION-DEPLOYMENT.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 39](PHASE-39-FINAL-E2E-QA.md) | REQUIRED | REQUIRED | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| [Phase 40](PHASE-40-LAUNCH-READINESS.md) | N/A | OPTIONAL | OPTIONAL | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED | REQUIRED |

## Current gate progress

This is the new canonical gate, not a historical test ledger. Missing mandatory security/EN/AR evidence is FAIL (unproven), as explained in README; it does not assert an executed test failed. Historical partial passes are summarized below.

Phase 02 checkpoint (2026-10-08): focused anonymous capture suite 16/16; typecheck, lint and build pass. Overall gates remain FAIL because the initial existing suite had 2 failures, manual sampling found corrupted locale copy, authenticated/sign-out evidence is unavailable, and D09/reference approval is pending. See the phase contract for exact commands and scope.

| Phase | Implemented | Automated | Manual | Security | EN/AR | Verified |
|---|---|---|---|---|---|---|
| [Phase 00](PHASE-00-PROJECT-BASELINE.md) | YES | PASS | PASS | NOT APPLICABLE | NOT APPLICABLE | YES |
| [Phase 01](PHASE-01-NEXTJS-ARCHITECTURE.md) | YES | PASS | PASS | PASS | PASS | YES |
| [Phase 02](PHASE-02-DESIGN-RESPONSIVE-FOUNDATION.md) | YES | FAIL | FAIL | FAIL | FAIL | NO |
| [Phase 03](PHASE-03-I18N-RTL-FOUNDATION.md) | YES | PASS | PASS | NOT APPLICABLE | PASS | YES |
| [Phase 04](PHASE-04-SUPABASE-FOUNDATION.md) | YES | PASS | PASS | PASS | NOT APPLICABLE | YES |
| [Phase 05](PHASE-05-AUTH-PROFILES-ONBOARDING.md) | YES | PASS | PASS | PASS | PASS | YES |
| [Phase 06](PHASE-06-ADMIN-AUTHORIZATION.md) | YES | PASS | PASS | PASS | PASS | YES |
| [Phase 07](PHASE-07-COURSE-DOMAIN.md) | YES | PASS | PASS | PASS | NOT APPLICABLE | YES |
| [Phase 08](PHASE-08-CURRICULUM-DOMAIN.md) | YES (SHARED DEV) | PASS (local 36/36; hosted curriculum 8/8 and course 8/8; types, typecheck/lint/build pass; unrelated aggregate-suite limitation documented) | PASS (storage access/cleanup and focused domain behaviors reviewed) | PASS (hosted direct access denied; local anonymous download denied and cleanup verified) | NOT APPLICABLE | YES |
| [Phase 09](PHASE-09-COURSE-CONTENT-INTEGRATION.md) | YES (Local Supabase; catalog RPC migration applied to Hosted DEV; 28 temporary DEV courses archived after verification) | PASS (clean local DB 194/194; focused app Playwright and deterministic loading checks pass; typecheck/lint/build pass) | PASS (visual/keyboard/state review complete; user-reported translation review and explicit Arabic typography sign-off recorded 2026-10-12) | PASS (authenticated admin RPCs and temporary fixture-backed Hosted DEV boundaries/counts pass; fixtures archived) | PASS (EN/AR exact-locale, RTL, screenshots, user-approved typography and responsive checks pass) | YES |
| [Phase 10](PHASE-10-ENROLLMENT-ENTITLEMENTS.md) | VERIFIED (implemented locally and on Hosted DEV) | PASS (local DB 263/263; local concurrency 8/8; Hosted DEV enrollment suite 32/32; typecheck/lint/build pass) | PASS (user reviewed screenshot pack and approved manual EN/AR visual/accessibility checklist 2026-10-12; transient retry simulation remains untested) | PASS (local and Hosted DEV negative cases) | PASS (EN/AR responsive/UI evidence and user sign-off 2026-10-12) | YES |
| [Phase 11](PHASE-11-MUX-VIDEO.md) | PARTIAL (local implementation; DB migration not applied) | PARTIAL (Mux config and test upload/cancel PASS; signature tests 4/4; typecheck/lint/build PASS; DB and asset lifecycle pending) | NOT RUN | PARTIAL (route/RPC controls implemented; DB execution pending) | NOT APPLICABLE | NO |
| [Phase 12](PHASE-12-LEARNING-PLAYER.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 13](PHASE-13-PROGRESS-TRACKING.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 14](PHASE-14-ASSESSMENT-DOMAIN.md) | NO | NOT RUN | NOT RUN | FAIL | NOT APPLICABLE | NO |
| [Phase 15](PHASE-15-ASSESSMENT-ATTEMPTS.md) | NO | NOT RUN | NOT RUN | FAIL | NOT APPLICABLE | NO |
| [Phase 16](PHASE-16-ASSESSMENT-UI.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 17](PHASE-17-COURSE-COMPLETION.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 18](PHASE-18-CERTIFICATES.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 19](PHASE-19-ORDERS-CHECKOUT.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 20](PHASE-20-KASHIER-PAYMENTS.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 21](PHASE-21-LEARNING-PATHS.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 22](PHASE-22-LEARNER-DASHBOARD.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 23](PHASE-23-CALENDAR.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 24](PHASE-24-NOTIFICATIONS.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 25](PHASE-25-AI-ASSISTANT.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 26](PHASE-26-COMMUNITY-MESSAGES.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 27](PHASE-27-COURSE-ADMINISTRATION.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 28](PHASE-28-LEARNER-ADMINISTRATION.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 29](PHASE-29-COMMERCE-ADMINISTRATION.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 30](PHASE-30-SEO-METADATA.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 31](PHASE-31-ACCESSIBILITY.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 32](PHASE-32-RESPONSIVE-VISUAL-QA.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 33](PHASE-33-PERFORMANCE.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 34](PHASE-34-SECURITY-PRIVACY.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 35](PHASE-35-OBSERVABILITY.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 36](PHASE-36-CONTENT-TRANSLATION-AUDIT.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 37](PHASE-37-PRODUCTION-INFRASTRUCTURE.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 38](PHASE-38-PRODUCTION-DEPLOYMENT.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 39](PHASE-39-FINAL-E2E-QA.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |
| [Phase 40](PHASE-40-LAUNCH-READINESS.md) | NO | NOT RUN | NOT RUN | FAIL | FAIL | NO |

## Existing commands and evidence limits

- `npm run typecheck`, `npm run lint`, `npm run build`: existing implementation checks; not rerun for documentation-only changes.
- `npm test` / `npm test -- tests/learning.spec.ts`: 15 current test declarations; route sweep contains 30 localized URLs, eight widths. It is unauthenticated and does not prove protected screen rendering; /overview aliases and callback have separate limited cases.
- `npm run inspect`: current script samples 1448px and 390px only; it is not the required eight-width bilingual visual gate.
- `npm run db:test:hosted`: mutates tagged disposable DEV users/storage and requires server-only process credential plus matching DEV references; current script covers identity/avatars, not future domains.
- `npm run db:test`: pgTAP suite for disposable local/CI Supabase; docs record unavailable local DB and absent linked pgTAP. Never install test extensions or reset hosted DEV automatically for roadmap work.
- `npm run db:types`: writes generated types from linked schema; `npm run db:push`: mutates linked database. Neither was run for this planning task.
- No standalone unit-test script exists. New pure logic cases must have a documented runnable test command when implemented; listing a future test here is not coverage.

Phase 01 ran on 2026-10-07: typecheck, lint and build passed; 14 of 15 Playwright tests passed. The 30 localized routes passed the eight-width route/render/direction/overflow sweep. The remaining auth callback test fails because the current configured development origin is excluded by the dirty redirect allowlist; it is assigned to Phase 05 and does not fail Phase 01's route architecture gate. See the Phase 01 contract for exact revision/diff evidence and limits.

Historical QA-CHECKLIST.md records 13 Playwright tests on 2026-10-06 and 15 on 2026-10-07 plus prior typecheck/lint/build passes. It explicitly leaves full visual parity, Arabic font review and onboarding RLS behavior pending. Those remain later phase evidence and are not replaced by the Phase 01 route smoke.
