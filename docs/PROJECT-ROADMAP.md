# ETripleSoft Learn — Project Roadmap

Canonical implementation sequence. Current position updated **2026-10-12 (Africa/Cairo)** after Phase 09 verification and the user's Arabic typography sign-off. Read [phase execution rules](phases/README.md), then the relevant contract before future work.

## Current position

- **Last verified phase:** Phase 10 — Enrollment & Entitlements (2026-10-12). Phases 00, 01, 03, 04, 05, 06, 07, 08 and 09 are also VERIFIED. Phase 02 remains VERIFICATION REQUIRED, accepted with limits; its broader visual/reference and Arabic review evidence is still carried forward.
- **Current position:** Phase 09 is VERIFIED after local automated checks, Hosted DEV authenticated RPC/security checks, full-width EN/AR responsive evidence, the user's reported manual Arabic translation review and their explicit Arabic typography sign-off on 2026-10-12. The approved catalog search/facet migration `20261011150000` is applied; 28 reserved Phase 09 demonstration courses were created through authenticated admin RPCs, verified, then archived.
- **Current position:** Phase 10 — Enrollment & Entitlements is VERIFIED (2026-10-12). In addition to local and Hosted DEV implementation/security checks, the user reviewed the Phase 10 captures and approved the manual English/Arabic visual and accessibility checklist.
- **Current phase:** Phase 11 — Protected Video / Mux Infrastructure is IN PROGRESS. The user approved the Mux-specific D15 decisions on 2026-10-12. Local implementation, Mux config/signing validation, webhook signature tests and a signed test-mode upload/cancel pass; local PostgreSQL migration connectivity, asset lifecycle/webhook receipts, Hosted DEV migration approval, and Production environment work remain pending.
- **Phase 04/05 checkpoint (2026-10-08):** migration history and generated types matched hosted DEV; hosted identity RLS suite passed 61/61 and the local pgTAP suite later passed 74/74. Phase 04 is VERIFIED. Phase 05's hosted flows found and fixed logout and preference-save defects; it was marked VERIFIED with accepted gaps recorded in its evidence checkpoint.
- **Current open gates:** Phase 02 approved-reference comparison and broader Arabic typography/content review; D12 course launch content; remaining D15 Kashier/OpenAI decisions; Phase 11 local DB/provider tests and separate approval before Hosted DEV changes; later course content decisions remain assigned to their owning phases. Phase 10 local database suite passed 263/263; its concurrent grant check passed 8/8; Hosted DEV enrollment suite passed 32/32; pending and authenticated enrollment UI plus responsive checks passed; and typecheck/lint/build passed. User manual EN/AR visual/accessibility approval is recorded in the Phase 10 evidence pack. A transient network/RPC retry simulation and a pre-migration logical backup remain absent and are recorded as limitations.
- **Production readiness:** NOT READY; partial foundations, largely demo LMS. No arbitrary percentage.
- **Open product decisions:** [decision register](phases/OPEN-DECISIONS.md) contains the eight existing database launch questions plus other documented/audited gaps. Unresolved later decisions block their own implementation, not this documentation audit.

Only VERIFIED means finished. PLANNED means the production contract now exists, even when a demo screen exists. Existing partial code is preserved; retrospective dependency gates do not require rewriting it. No phase starts automatically when another finishes.

## Public marketing site (user-authorized addition, 2026-10-08)

Outside the 41 phases: the standalone `odoo-learn` site was ported into this app as the public landing and marketing site. The dashboard moved from `/{locale}` to `/{locale}/overview`; `/{locale}` is now the public landing. Plain CSS (`mk-` scoped), no new dependencies, EN/AR with type-checked message parity.

- **Code:** `src/features/marketing/`, `src/app/[locale]/(site)/`, `messages/marketing/`, `public/fonts/`, `public/marketing/`; routes documented in [ROUTES.md](ROUTES.md).
- **Pages:** landing, `/catalog`, `/catalog/[slug]`, `/learning-paths`, `/odoo-modules`, `/about`, `/contact`, `/help`, `/privacy`, `/terms`, `/refund-policy`. `for-business` and `projects` were deliberately not ported.
- **Interim data:** catalog listing and public course details use published exact-locale Supabase projections; related marketing pages and learning paths remain editorial. The learner `/courses` list is database-backed, while unrelated dashboard widgets remain demo content. The catalog RPC migration is applied to Hosted DEV; deterministic fixtures are Local/CI-only, and 28 clearly labeled Hosted DEV verification courses are archived and absent from public projections. [Phase 21](phases/PHASE-21-LEARNING-PATHS.md) owns learning paths; [Phase 30](phases/PHASE-30-SEO-METADATA.md) owns sitemap/robots/indexing policy.
- **Legal:** Privacy and Terms are unreviewed ports that predate accounts; [Phase 34](phases/PHASE-34-SECURITY-PRIVACY.md) owns legal review. Arabic font source approved (IBM Plex Sans Arabic); Arabic marketing copy awaits native review ([Phase 03](phases/PHASE-03-I18N-RTL-FOUNDATION.md)/[36](phases/PHASE-36-CONTENT-TRANSLATION-AUDIT.md)).
- **Evidence (2026-10-08):** typecheck, lint, production build PASS; `tests/marketing.spec.ts` (4 cases, 12 routes x 2 locales x 8 widths) PASS; the only failing test is the Phase 05 auth callback (`AUTH_SITE_URL` in the local env file is malformed).

## Master phase table

| Phase | Name | Status | Depends On | Blocks | Primary Deliverable |
|---|---|---|---|---|---|
| [Phase 00](phases/PHASE-00-PROJECT-BASELINE.md) | Repository Baseline & Audit | VERIFIED | — | 01, 04, 26 | Inventory routes, source, migrations, types, tests and environment variable names |
| [Phase 01](phases/PHASE-01-NEXTJS-ARCHITECTURE.md) | Next.js Application Architecture | VERIFIED | 00 | 02, 03, 05 | Verify existing App Router structure and client boundaries |
| [Phase 02](phases/PHASE-02-DESIGN-RESPONSIVE-FOUNDATION.md) | Design System & Responsive Foundation | VERIFICATION REQUIRED | 01 | 03 | Capture approved reference comparisons for existing shared primitives and shell |
| [Phase 03](phases/PHASE-03-I18N-RTL-FOUNDATION.md) | English / Arabic / RTL Foundation | VERIFIED | 01, 02 | 05, 09, 12, 16, 32, 36 | Finish application UI extraction and message parity |
| [Phase 04](phases/PHASE-04-SUPABASE-FOUNDATION.md) | Supabase Database Foundation | VERIFIED | 00 | 05, 06, 07 | Reconcile local migrations and hosted DEV history without resets |
| [Phase 05](phases/PHASE-05-AUTH-PROFILES-ONBOARDING.md) | Authentication / Profiles / Learner Onboarding | VERIFIED | 01, 03, 04 | 06, 10 | Verify real EN/AR signup, confirmation, login, recovery, logout and session refresh |
| [Phase 06](phases/PHASE-06-ADMIN-AUTHORIZATION.md) | Admin Authorization & Audit Foundation | VERIFIED | 04, 05 | 07, 18, 20, 27, 28, 29 | Define server-authoritative admin route/action boundaries |
| [Phase 07](phases/PHASE-07-COURSE-DOMAIN.md) | Course Domain | VERIFIED | 04, 06 | 08, 09, 10, 19, 21 | Implement course identity, slug, lifecycle and per-locale publication |
| [Phase 08](phases/PHASE-08-CURRICULUM-DOMAIN.md) | Curriculum & Resources Domain | VERIFIED | 07 | 09, 10, 11, 14, 25, 27 | Model ordered modules and typed lessons with required/optional and preview flags |
| [Phase 09](phases/PHASE-09-COURSE-CONTENT-INTEGRATION.md) | Course Catalog & Content Integration | VERIFIED | 03, 07, 08 | 12, 22, 30 | Replace catalog/detail/instructor/outline fixtures with server data |
| [Phase 10](phases/PHASE-10-ENROLLMENT-ENTITLEMENTS.md) | Enrollment & Entitlements | VERIFIED | 05, 07, 08 | 11, 12, 14, 19, 25 | Implement individual free enrollment and exact-locale current entitlement checks; D14 approved and user EN/AR visual/accessibility sign-off recorded 2026-10-12 |
| [Phase 11](phases/PHASE-11-MUX-VIDEO.md) | Protected Video / Mux Infrastructure | IN PROGRESS | 08, 10 | 12, 27 | Store language-neutral video metadata; authorize uploads; verify webhooks; issue signed, enrollment-gated playback tokens |
| [Phase 12](phases/PHASE-12-LEARNING-PLAYER.md) | Learning Player | IN PROGRESS | 03, 09, 10, 11 | 13, 16, 25 | Player and private resources implemented; automated checks pass, manual/provider acceptance pending |
| [Phase 13](phases/PHASE-13-PROGRESS-TRACKING.md) | Progress Tracking | IN PROGRESS | 12 | 17 | Video progress/resume and 90% threshold implemented; broader progress and acceptance gates pending |
| [Phase 14](phases/PHASE-14-ASSESSMENT-DOMAIN.md) | Assessment Domain | IN_PROGRESS | 08, 10 | 15, 27 | Model single/multiple choice and true/false with immutable published versions |
| [Phase 15](phases/PHASE-15-ASSESSMENT-ATTEMPTS.md) | Assessment Attempts & Server Grading | IN_PROGRESS | 14 | 16, 17 | Start version-bound attempts with server deadlines and retry limits |
| [Phase 16](phases/PHASE-16-ASSESSMENT-UI.md) | Assessment UI Integration | IN_PROGRESS | 03, 12, 15 | 17, 31, 32 | Replace fixtures/client scoring with safe assessment services |
| [Phase 17](phases/PHASE-17-COURSE-COMPLETION.md) | Course Completion | IN_PROGRESS | 13, 15, 16 | 18, 21 | Evaluate required lessons and required assessments together |
| [Phase 18](phases/PHASE-18-CERTIFICATES.md) | Certificates | IN_PROGRESS | 17, 06 | 22, 28, 30 | Issue certificates only from authoritative completion |
| [Phase 19](phases/PHASE-19-ORDERS-CHECKOUT.md) | Orders & Checkout Domain | IN PROGRESS | 07, 10 | 20 | Create owner-scoped one-time orders and item price/currency snapshots |
| [Phase 20](phases/PHASE-20-KASHIER-PAYMENTS.md) | Kashier Payments | IN PROGRESS | 19, 06 | 29, 34, 35 | Initialize provider checkout server-side using order snapshots |
| [Phase 21](phases/PHASE-21-LEARNING-PATHS.md) | Learning Paths | PLANNED | 07, 17 | 22, 27, 30 | Publish translated ordered course paths |
| [Phase 22](phases/PHASE-22-LEARNER-DASHBOARD.md) | Real Learner Dashboard | IN_PROGRESS | 09, 18, 21 | 23, 24, 31, 32, 33, 34, 35, 36 | Aggregate own enrollments, recent lessons, progress, completions and certificates |
| [Phase 23](phases/PHASE-23-CALENDAR.md) | Calendar Scope & Integration | IN PROGRESS | 22 | — | D04 approved 2026-10-18; local implementation and pgTAP suite pass; Hosted DEV migration pending |
| [Phase 24](phases/PHASE-24-NOTIFICATIONS.md) | Notifications Scope & Integration | IN PROGRESS | 22 | — | D05 approved 2026-10-18 (in-app only); local implementation and pgTAP suite pass; Hosted DEV migration pending |
| [Phase 25](phases/PHASE-25-AI-ASSISTANT.md) | AI Learning Assistant | IN_PROGRESS | 08, 10, 12 | 31, 32, 33, 34, 35, 36 | Authorize course-scoped retrieval from real published content |
| [Phase 26](phases/PHASE-26-COMMUNITY-MESSAGES.md) | Community / Messages Disposition | PLANNED | 00 | — | Record DEFERRED scope for community/messages under current evidence |
| [Phase 27](phases/PHASE-27-COURSE-ADMINISTRATION.md) | Course & Content Administration | IN_PROGRESS | 06, 08, 11, 14, 21 | 31, 32, 33, 34, 35, 36 | Build create/edit/preview/publish/archive course and curriculum workflows |
| [Phase 28](phases/PHASE-28-LEARNER-ADMINISTRATION.md) | Learner / Enrollment Administration | PLANNED | 06, 18 | 31, 32, 33, 34, 35 | Provide least-privilege learner lookup and manual entitlement grant/revoke |
| [Phase 29](phases/PHASE-29-COMMERCE-ADMINISTRATION.md) | Commerce Administration | PLANNED | 06, 20 | 31, 32, 33, 34, 35 | Expose order/payment/reconciliation status and failed event handling |
| [Phase 30](phases/PHASE-30-SEO-METADATA.md) | SEO / Metadata / Public Discoverability | IN PROGRESS | 09, 18, 21 | 36 | Finish public course/path/verification indexing policy |
| [Phase 31](phases/PHASE-31-ACCESSIBILITY.md) | Accessibility Audit | PLANNED | 16, 22, 25, 27, 28, 29 | 32 | Audit all included learner/admin routes and interaction states |
| [Phase 32](phases/PHASE-32-RESPONSIVE-VISUAL-QA.md) | Responsive & Visual QA | PLANNED | 03, 16, 22, 25, 27, 28, 29, 31 | 37 | Run authenticated and anonymous route/state matrices in both locales |
| [Phase 33](phases/PHASE-33-PERFORMANCE.md) | Performance Optimization | PLANNED | 22, 25, 27, 28, 29 | 37 | Measure representative public/learner/admin workflows |
| [Phase 34](phases/PHASE-34-SECURITY-PRIVACY.md) | Security / Privacy / Legal Hardening | PLANNED | 20, 22, 25, 27, 28, 29 | 36, 37 | Review end-to-end trust boundaries and remediate verified findings |
| [Phase 35](phases/PHASE-35-OBSERVABILITY.md) | Observability / Error Monitoring / Analytics | PLANNED | 20, 22, 25, 27, 28, 29 | 37 | Instrument auth/learning/payment/provider failures with safe correlation IDs |
| [Phase 36](phases/PHASE-36-CONTENT-TRANSLATION-AUDIT.md) | Content & Translation Audit | PLANNED | 03, 22, 25, 27, 30, 34 | 37 | Load and review approved launch course/lesson/assessment translations and assets |
| [Phase 37](phases/PHASE-37-PRODUCTION-INFRASTRUCTURE.md) | Production Infrastructure | PLANNED | 32, 33, 34, 35, 36 | 38 | Provision isolated production Supabase and Vercel environments |
| [Phase 38](phases/PHASE-38-PRODUCTION-DEPLOYMENT.md) | Production Migration / Deployment | PLANNED | 37 | 39 | Apply reviewed migrations to production in dependency order |
| [Phase 39](phases/PHASE-39-FINAL-E2E-QA.md) | Final End-to-End Production QA | PLANNED | 38 | 40 | Validate complete free and paid learner journeys on release candidate |
| [Phase 40](phases/PHASE-40-LAUNCH-READINESS.md) | Launch Readiness & Handoff | PLANNED | 39 | — | Review every mandatory gate and resolve launch-blocking findings |

There are 41 phases (00–40). Their order differs from the illustrative request: admin authorization is Phase 06; assessment grading precedes completion; paths precede the aggregate dashboard. Deferred scope has separate disposition rather than an invalid DEFERRED phase status. See [dependency map](phases/DEPENDENCY-MAP.md) for structural critical paths and authorized prerequisites; its parallelizable tracks do not authorize concurrent execution.

## Repository evidence and reconciliation

| Area | Inspected evidence | Actual state and verification limit |
|---|---|---|
| App architecture | `src/app/[locale]/`, `src/proxy.ts`, `src/features/`, `src/components/`, `src/hooks/use-demo-navigation.ts`, `src/lib/routes.ts` | Phase 01 VERIFIED 2026-10-07: 17 localized route modules, shared URL-neutral groups, no catch-all/pathname screen switcher; typecheck/lint/build pass; route behavior suite 14/15 with its single auth callback config failure assigned to Phase 05. Evidence and diff digest are in PHASE-01. |
| i18n | `src/i18n/`, `messages/en.json`, `messages/ar.json`, locale layout | EN/AR direction and messages implemented; hardcoded UI remains and Arabic font source/all-width sign-off incomplete. |
| Identity and course schema | `supabase/migrations/`, `src/types/database.ts` | Hosted DEV has identity/admin tables plus Phase 07 `courses`, `course_translations`, and `course_instructors`; hosted course row count is zero. Curriculum, enrollment and later LMS domains remain unimplemented. |
| Auth/settings | `src/features/auth/actions.ts`, `src/features/settings/actions.ts`, auth route callback, `src/lib/supabase/auth.ts`, settings-page.tsx | Real signup/login/recovery/logout/profile/preferences/private avatars. No current complete live-flow proof. Company invitation codes discarded, no membership/grants. |
| Security tests | `scripts/validate-hosted-rls.mjs`, `supabase/tests/database/foundation_rls.sql` | Owner/cross-user/role tests exist; latest onboarding suite lacks behavioral execution evidence. Test script service key is setup/cleanup only. |
| Browser tests | `tests/learning.spec.ts`, `playwright.config.ts` | 15 test declarations; 30 locale URLs × eight widths passed the Phase 01 render/direction/overflow smoke. Anonymous protected redirects, aliases, query preservation, locale switching, and unsupported-locale 404 passed. Auth callback negative-flow test failed because configured development origin is excluded by the current dirty auth allowlist; owner Phase 05. No authenticated screen or visual-parity certification. |
| DEV environment | `.env.example`, `.gitignore`, `supabase/config.toml`, `src/lib/supabase/env.ts`, `auth-redirects.ts` | Only variable names inspected from ignored .env.local; no values recorded. DEV origin allowlist accepts localhost only. Production callbacks need explicit implementation in Phase 37. |
| Fixture state | `src/features/*/data/`, components and browser helpers | Courses, quizzes, progress, checkout, AI, calendar, certificates and notifications remain demo systems. No sessionStorage use or TODO/FIXME markers found by the scoped src/scripts/tests scan; absence of markers is not completion. |
| Historical and current QA | `docs/QA-CHECKLIST.md`, Phase 01 evidence | Historical 13/15-test reports remain partial. Current Phase 01 checks ran on 2026-10-07 and are recorded in `phases/PHASE-01-NEXTJS-ARCHITECTURE.md`. Full screenshot parity, Arabic typography approval, and latest onboarding RLS evidence remain pending in their owning phases. |

### Existing user work

Initial status had 17 modified tracked files and one untracked onboarding migration. Preserve all of them: `docs/DATABASE-ARCHITECTURE.md`, `docs/PROJECT.md`, `docs/QA-CHECKLIST.md`, `docs/SECURITY.md`, `messages/ar.json`, `messages/en.json`, `next-env.d.ts`, `scripts/validate-hosted-rls.mjs`, `src/components/ui/field.tsx`, `src/features/auth/actions.ts`, `src/features/auth/components/auth-page.tsx`, `src/lib/supabase/auth-redirects.ts`, `src/refinements.css`, `src/types/database.ts`, `supabase/config.toml`, `supabase/tests/database/foundation_rls.sql`, `tests/learning.spec.ts`, and `supabase/migrations/20261007110000_learner_onboarding_profiles.sql`.

The migration IDs are `20261006113243`, `20261006131900`, `20261006140220`, `20261007110000`. Existing docs report all applied to DEV; this audit inspected local SQL/types and did not independently certify hosted history/configuration. Reconcile during Phase 04 without reapplying or resetting blindly.

### Stale documentation conflicts

- README calls signup and settings partly demo/unimplemented despite real actions and Supabase reads/writes. MIGRATION-REACT-TO-NEXT.md says no Supabase/auth added; treat it as historical migration context.
- I18N.md mixes future-tense next-intl plans with implemented route descriptions. Its older certificate/content-localization wording is superseded by the later database architecture for domain policy, while final certificate visual output remains OPEN.
- QA-CHECKLIST.md has old overview/signup/settings checklist language. Its dated verification notes are evidence with explicit limits, not blanket completion.
- AGENTS.md target/future narrative does not erase implemented auth. Its engineering policy and approved design remain authoritative.

These existing files were not rewritten over user edits. This roadmap records reconciliation now; each owning phase should update directly affected documents on completion.

## Demo → Production Replacement Map

| Feature | Current Source | Production Source | Planned Phase |
|---|---|---|---|
| Catalog/instructors/ratings | `src/features/courses/data/demo-courses.ts`; course-card.tsx | Published courses/translations/attribution; ratings excluded pending product scope | 07, primary integration 09 |
| Detail/curriculum/resources | `src/features/courses/components/course-detail.tsx`; lessonNames | Course-specific safe outline and entitled lesson/resource queries | 08, primary integration 09/12 by surface |
| Navigation/breadcrumb | `src/hooks/use-demo-navigation.ts`, `src/lib/routes.ts`, `learner-header.tsx` featuredCourse | Identifier-aware locale links with documented legacy aliases | 09 |
| Lesson/video | Static artwork/actions in course-detail.tsx | Authorized Mux playback and real player | 11 infrastructure, 12 UI |
| Progress/resume | `learning-widgets.tsx`, `dashboard.tsx` constants | Enrollment-scoped server checkpoints and aggregates | 13, dashboard integration 22 |
| Assessment answers/timer/score | `demo-assessment.ts`, `assessment.tsx`, `demo-storage.ts` localStorage | Immutable version + server attempts/autosave/grading; no public keys | 14/15 domain, replacement 16 |
| Completion | Demo percentage and quiz success | Immutable course completion snapshot | 17 |
| Certificates/learner identity | `certificates.tsx` fixed Ahmed Salah/date/stats | Issued completion-linked owner certificate and public token verification | 18 |
| Certificate download/share | `certificate-actions.tsx` print/current URL | Approved renderer and real verification link | 18 |
| Checkout/coupon | `payment.tsx` USD/LEARN10/local total/no-payment toast | Server order snapshots + verified Kashier webhook fulfillment | 19/20; no V1 coupon engine |
| Paths | `learning-widgets.tsx` three static paths | Published translated ordered paths and derived completion | 21 |
| Dashboard learning activity | `dashboard.tsx` fixture courses/lesson positions | Owner queries across verified domain models | 22 |
| Calendar | `course_events` + `learner_study_sessions` via `learner_calendar_events`; demo events removed | Administrator-scheduled course events and personal study time | 23 IN PROGRESS |
| Notifications | `notifications` inbox written by database triggers and reminder sync; header bell | In-app owner inbox; email delivery not approved | 24 IN PROGRESS |
| AI | Gemini-backed assistant with enrolled-course grounding, database rate limits and saved owner-scoped history (2026-10-18) | Evaluation set, citation review, retention (D03), cost budget | 25 |
| Community/messages | Route placeholder panels and community-promo.tsx | Approved exclusion first; separately scoped future service | 26 DEFERRED |
| Settings/auth | Real Supabase actions/profile/avatar plus deferred tabs | Verify existing persistence; do not rebuild as missing backend | 05 |
| Footer/legal/social/mobile app | site-footer.tsx, learner-sidebar.tsx, payment.tsx demo toasts | Approved real destinations/legal pages or truthful excluded state | 34 legal; 36 launch content |
| Browser toast/download utilities | `src/lib/browser/demo-toast.ts`, download.ts | May remain UI utilities; their name alone is not fake backend behavior | Owning UI phases; no unnecessary rewrite |

This map assigns primary ownership by domain vs integration surface. Domain owners supply contracts; consumers do not duplicate schema/business logic. localStorage is observed for assessment answers; settings identity/preferences are now real and must not be inaccurately classified as localStorage-backed.

## Route audit

`L` means both `/en` and `/ar`; each row expands to both supported locales. Current route classification reflects inspected guards, not route group names. Target class is the production requirement. Forgot-password and callback are intentionally PUBLIC endpoints with validation; reset form can render publicly but mutation requires verified identity. No instructor-only route currently exists and instructor authoring is not approved.

| Existing route(s) | Current class / behavior | Production class | Production-ready phase |
|---|---|---|---|
| `/L`, `/L/overview` | AUTHENTICATED; fixture dashboard | AUTHENTICATED | 22; release QA 39 |
| `/L/courses` | PUBLIC; fixture catalog | PUBLIC | 09 + 30 |
| `/L/detail-course` | PUBLIC; single fixture | PUBLIC legacy compatibility | 09 |
| `/L/assessment` | PUBLIC demo client grading | ENTITLEMENT REQUIRED | 16 |
| `/L/payment` | PUBLIC demo checkout | AUTHENTICATED owner checkout | 20 |
| `/L/certificates` | AUTHENTICATED; fake content | AUTHENTICATED owner list | 18 |
| `/L/settings` | AUTHENTICATED; real settings | AUTHENTICATED | 05 |
| `/L/ai-page` | PUBLIC local replies | ENTITLEMENT REQUIRED for course context; AUTHENTICATED entry | 25 |
| `/L/calendar` | PUBLIC demo | DEFERRED; AUTHENTICATED if activated | 23 or approved exclusion in 36 |
| `/L/community` | PUBLIC placeholder | DEFERRED | 26 disposition / 36 exclusion |
| `/L/messages` | PUBLIC placeholder | DEFERRED | 26 disposition / 36 exclusion |
| `/L/login`, `/L/sign-up` | GUEST ONLY; signed-in redirect | GUEST ONLY | 05 |
| `/L/forgot-password` | PUBLIC; generic recovery response | PUBLIC | 05 |
| `/L/reset-password` | PUBLIC form/expired state; action checks user | AUTHENTICATED for reset mutation; public invalid-link state | 05 |
| `/L/auth/callback` | PUBLIC code exchange endpoint | PUBLIC validated one-use flow | 05 + production origins 37 |
| `/` | PUBLIC redirect to /en then auth gate | PUBLIC routing entry | 01 |
| `/overview`, `/courses`, `/detail-course`, `/assessment`, `/payment`, `/certificates`, `/settings`, `/ai-page`, `/calendar`, `/community`, `/messages`, `/sign-up`, `/login`, `/forgot-password`, `/reset-password` | PUBLIC alias routing to English; destination guard applies | Same as destination | 01 compatibility + owning feature |
| `/#<allowlisted legacy fragment>` | Client legacy mapping; destination guard applies | Same as destination | 01 |
| Unsupported locale such as `/fr/courses` | PUBLIC 404 | PUBLIC 404 | 01 |

Proposed, not implemented: course-identifier public detail (09); entitlement lesson and assessment identifiers (12/16); public opaque-token certificate verification (18); ADMIN shell/content/support/commerce routes (06/27/28/29); public legal routes (34); sitemap/robots (30); server provider webhook/token routes (11/20/25). Exact URLs require D13/domain design; no route is created by this plan. Webhooks are publicly reachable transport endpoints authenticated by provider signature, never guest UI authorization.

## Database domain ownership map

| Domain / records | Primary phase | Current state |
|---|---|---|
| Identity: profiles/preferences/learner_profiles, auth trigger, private avatars | 04 schema; 05 user flow | Implemented, verification required |
| Role and audit foundation | 06 (reuses 04 tables) | Protected grant table/helper exist; operations partial |
| courses/course_translations/course_instructors | 07 | Proposed only |
| course_modules/module_translations/lessons/lesson_translations/lesson_resources/lesson_resource_translations | 08 | Applied to DEV; tables and resource bucket are empty; manual/security verification remains |
| enrollments | 10 | Proposed; Phase 19 adds order_item_id FK after commerce table exists |
| lesson_videos | 11 | Proposed only |
| lesson_progress/video_progress | 13 | Proposed only |
| quizzes/quiz_versions/quiz_translations/questions/question_translations/question_options/option_translations/quiz_answer_keys | 14 | Proposed only |
| quiz_attempts/quiz_answers/quiz_answer_selections | 15 | Proposed only |
| course_completions | 17 | Proposed only |
| certificates / optional private generated files | 18 | Proposed; files depend on output decision |
| orders/order_items | 19 | Proposed only |
| payments/payment_webhook_events / optional refund ledger | 20 | Proposed; refund detail OPEN |
| learning_paths/path_translations/learning_path_courses | 21 | Proposed only |
| Calendar event/audience domain | 23 | IN PROGRESS (migration `20261018230000`) |
| Notification/event delivery domain | 24 | IN PROGRESS (migration `20261018230000`, in-app only) |
| AI retrieval contract and conversation storage | 25 | In progress; `ai_conversations`/`ai_messages` per user instruction |
| Community/messages | 26 | DEFERRED; no speculative tables |
| Typed admin audit extensions | 06 contract; 27/28/29 extend for actual domain targets | Existing audit permits role actions only |
| organizations/members/invitations/course_assignments | Future separately approved phase, decision F01 | DEFERRED; not hidden inside auth |

Detailed keys, constraints, indexes, FK/delete behavior and transaction plans remain in [database architecture](DATABASE-ARCHITECTURE.md); each phase specifies its bounded subset. No SQL is created here. Instructor attribution needs no independent privilege or speculative instructor table. Admin consoles consume domain services; they do not redefine them.

## Documentation verification record

2026-10-07: structural validator checks 41 numbered phase files, exact 28-section structure, allowed statuses, dependency acyclicity/topological order, inverse Blocks coverage, master/matrix phase coverage, relative links, decision references, migration/type/route inventory counts and documentation-only scope. Phase 01 runtime verification was then performed separately; exact results, current dirty-diff digest, and limitations are recorded in its phase contract. No pgTAP, hosted RLS, provider, or live-auth flow was run.

Result: **PASS** — 41 phase contracts plus the reusable template have all 28 required sections; all 48 new documentation files are present; 588 relative links resolve; statuses, dependency graph, inverse Blocks lists, master/matrix rows and decision references agree. Source cross-checks confirmed four migrations, five generated public application tables, 15 Playwright test declarations and 30 route-sweep URLs. No configured sensitive environment values appear in the new documents. The original 17-file tracked diff path set is unchanged; the existing untracked onboarding migration remains in place.

The temporary Python generation/validation helpers were used only to produce and check Markdown, then removed. Relevant database architecture, Supabase security and security-review guidance informed the plan. Next.js architecture, i18n/RTL, visual-parity, responsive-QA and code-quality skills were considered and assigned to their future execution gates; this task did not modify or visually certify the application.

## Future workflow

1. Read this file and [phases/README.md](phases/README.md).
2. Read the selected PHASE-XX contract and inspect current implementation/diff.
3. Implement only the separately requested phase after prerequisites verify.
4. Execute its automated/manual/security/locale plan; retain evidence.
5. Update phase, master table, decision register and matrices together.
6. Stop, provide the required handoff and wait for approval before the next phase.

Phase 02 started at the user's request on 2026-10-08. Its focused anonymous suite passes 16 cases and retains 32 EN/AR captures locally. Typecheck/lint/build pass. The broader suite initially returned 13 passed / 2 failed; see the Phase 02 checkpoint for details and remaining gates. Phase 02 remains VERIFICATION REQUIRED; do not begin Phase 03 automatically.
