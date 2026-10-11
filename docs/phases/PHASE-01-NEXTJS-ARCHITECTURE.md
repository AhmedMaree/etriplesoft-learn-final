# Phase 01 — Next.js Application Architecture

## 1. Status

VERIFIED

Verified 2026-10-07 against HEAD `d710c94a600783db3af6cb8f1d6a1df8248245da` plus the existing dirty worktree. Typecheck, lint, production build, the 30-route EN/AR × eight-width Playwright route sweep, legacy-route behavior, unknown-locale 404 behavior, and production-server route smoke passed. The full Playwright file had one separate auth callback configuration failure (14 passed, 1 failed); see sections 19 and 24. It is assigned to Phase 05 and does not fail this architecture gate.

## 2. Goal

Verify the existing App Router structure, route behavior, feature organization, shared layers, and Server/Client boundaries. Do not repeat the React-to-Next.js migration.

## 3. Why This Phase Exists

This phase owns Next.js application architecture. Its verified contract enables [Phase 02](PHASE-02-DESIGN-RESPONSIVE-FOUNDATION.md), [Phase 03](PHASE-03-I18N-RTL-FOUNDATION.md), and [Phase 05](PHASE-05-AUTH-PROFILES-ONBOARDING.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 00](PHASE-00-PROJECT-BASELINE.md) — VERIFIED.

Blocks: [Phase 02](PHASE-02-DESIGN-RESPONSIVE-FOUNDATION.md), [Phase 03](PHASE-03-I18N-RTL-FOUNDATION.md), [Phase 05](PHASE-05-AUTH-PROFILES-ONBOARDING.md).

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

The app uses `src/app/[locale]/` with shared `(learner)` and `(auth)` route groups, server-rendered route composition, `next-intl` routing, domain-oriented `src/features/`, and focused client components. The production build recognizes all localized routes. The previous monolithic pathname-switching application is not the central renderer.

### Route inventory

All page modules below are Server Components by default (no route page declares `"use client"`). The `(learner)` group uses both the locale layout and `src/app/[locale]/(learner)/layout.tsx`; `(auth)` uses the locale layout only. The callback is a Route Handler, not a rendered page.

| Route file | Layout | Runtime boundary | Current classification |
|---|---|---|---|
| `src/app/[locale]/(learner)/page.tsx` | `[locale]` + `(learner)` | Server Component | `/en`, `/ar`; authenticated dashboard |
| `src/app/[locale]/(learner)/overview/page.tsx` | `[locale]` + `(learner)` | Server Component | `/en/overview`, `/ar/overview`; authenticated legacy dashboard alias |
| `src/app/[locale]/(learner)/courses/page.tsx` | `[locale]` + `(learner)` | Server Component | `/L/courses`; public demo catalog |
| `src/app/[locale]/(learner)/ai-page/page.tsx` | `[locale]` + `(learner)` | Server Component | `/L/ai-page`; public local demo |
| `src/app/[locale]/(learner)/community/page.tsx` | `[locale]` + `(learner)` | Server Component | `/L/community`; public placeholder |
| `src/app/[locale]/(learner)/messages/page.tsx` | `[locale]` + `(learner)` | Server Component | `/L/messages`; public placeholder |
| `src/app/[locale]/(learner)/calendar/page.tsx` | `[locale]` + `(learner)` | Server Component | `/L/calendar`; public demo |
| `src/app/[locale]/(learner)/certificates/page.tsx` | `[locale]` + `(learner)` | Server Component | `/L/certificates`; authenticated demo content |
| `src/app/[locale]/(learner)/settings/page.tsx` | `[locale]` + `(learner)` | Server Component | `/L/settings`; authenticated profile/preferences |
| `src/app/[locale]/(learner)/detail-course/page.tsx` | `[locale]` + `(learner)` | Server Component | `/L/detail-course`; public single-course demo |
| `src/app/[locale]/(learner)/assessment/page.tsx` | `[locale]` + `(learner)` | Server Component | `/L/assessment`; public assessment demo |
| `src/app/[locale]/(learner)/payment/page.tsx` | `[locale]` + `(learner)` | Server Component | `/L/payment`; public checkout demo |
| `src/app/[locale]/(auth)/login/page.tsx` | `[locale]` | Server Component | `/L/login`; guest page, signed-in users redirect |
| `src/app/[locale]/(auth)/sign-up/page.tsx` | `[locale]` | Server Component | `/L/sign-up`; guest page, signed-in users redirect |
| `src/app/[locale]/(auth)/forgot-password/page.tsx` | `[locale]` | Server Component | `/L/forgot-password`; public recovery page |
| `src/app/[locale]/(auth)/reset-password/page.tsx` | `[locale]` | Server Component | `/L/reset-password`; public expired-link state, mutation requires verified identity |
| `src/app/[locale]/(auth)/auth/callback/route.ts` | `[locale]` routing; no React layout rendering | Route Handler (`GET`) | `/L/auth/callback`; validates callback and exchanges a code for a session |

`L` expands to both `/en` and `/ar`. `/` and documented unprefixed legacy paths are handled by `src/proxy.ts`/next-intl; `/#courses` is handled by the focused legacy hash client component. Route groups do not appear in URLs. `/overview` resolves to `/en/overview`, which retains its own authenticated route module.

### Feature and shared-layer inventory

Actual feature directories are `ai-assistant`, `assessments`, `auth`, `calendar`, `certificates`, `checkout`, `courses`, `dashboard`, `learning`, and `settings`. Fixtures are colocated under `courses/data`, `assessments/data`, and `calendar/data`; feature UI/actions remain with their domain. Shared layout/UI/components live under `src/components/{layout,shared,ui}`. `src/lib/browser/` owns demo storage, toast, and download utilities; `src/lib/supabase/` owns server/client/proxy/auth boundaries; `src/lib/routes.ts`, `src/hooks/`, `src/i18n/`, and `src/types/database.ts` hold route, hook, locale, and generated database concerns.

No direct feature import cycle was apparent in the inspected dependency graph. Dashboard/course widgets intentionally consume the shared `learning` feature; settings calls the auth-owned locale preference action. No large pathname switcher or Vite entrypoint remains. The largest inspected UI module was the 362-line course detail feature, not a route aggregator.

Browser APIs are confined to `src/lib/browser/`, the locale/hash client helpers, and interactive feature components carrying client boundaries. No route page/layout has a client directive. The locale provider is shared at the locale boundary; the interactive learner shell is limited to the learner route group.

## 6. In Scope

- Verify App Router structure, route groups, layouts, aliases, locale switching, and query preservation.
- Verify feature ownership, shared layers, Server/Client boundaries, browser-only utilities, and architecture direction.
- Verify representative routes render in both locales and that route behavior remains intentional.
- Review protected-route guard placement and request-time rendering boundaries at an architecture level.
- Record architecture-specific findings and current automated evidence.

## 7. Out of Scope

- Repeating the React-to-Next.js migration or performing broad restructuring.
- Approved screenshot/pixel parity and visual sign-off (Phase 02 and Phase 32).
- Arabic font/glyph approval, full translation parity, and RTL visual sign-off (Phase 03 and Phase 36).
- Full accessibility sign-off (Phase 31).
- RLS, `learner_profiles` triggers/policies, real email delivery, and end-to-end authenticated account lifecycle evidence (Phases 04 and 05).
- Courses, assessments as a production domain, payments, Mux, AI, or other LMS backend work.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

OPEN / DEFERRED: No additional Phase 01 product decision is required. Authentication environment/test-account decision D10 is owned by Phases 04/05; Arabic typography D09 is owned by Phases 02/03/32/36. See [decision register](OPEN-DECISIONS.md).

## 9. Database Work

Not applicable. No schema, migration, or live database change is part of this phase.

## 10. RLS / Authorization

No RLS or database permission changes are in scope. Verify only that server route guards run before protected route data queries and that user data access stays on the server. RLS policy, trigger, role-grant, storage, and direct Data API/RPC behavior belong to Phases 04/05 and the owning domain phases.

## 11. Backend / Server Work

Review installed Next.js guidance and inspect request cookies, server-only imports, route data boundaries, redirect validation, and cache behavior. Real provider session lifecycle and production email redirect configuration are Phase 05 evidence.

## 12. Frontend Work

Verify the existing route tree and learner shell only. Do not redesign or change approved UI in this verification phase.

## 13. English / Arabic

Verify shared locale route resolution, `lang`/`dir`, locale-aware switching, unknown-locale handling, and preservation of query strings. This is route-architecture coverage only. Translation completeness, Arabic glyph/font quality, mixed-direction visual review, and locale content approval belong to Phases 02/03/36.

## 14. Responsive Requirements

Architecture route smoke must render representative English/LTR and Arabic/RTL routes at desktop and mobile sizes. The existing automated sweep checks all 30 localized routes at 320, 375, 430, 768, 1024, 1280, 1440, and 1920px for route render and horizontal overflow. This is not visual parity or responsive design sign-off; those belong to Phases 02 and 32.

## 15. Accessibility

No accessibility certification is required for this architecture-only verification. Preserve the existing semantic and keyboard behavior; full interaction, contrast, and screen-reader audit belongs to Phase 31.

## 16. Security Requirements

- Protected route data is loaded only after a server-side verified-user check.
- Request-time/session-dependent output must not be shared as public cached user data.
- No new RLS/grants or client-side authorization is introduced.

This is a narrow server-boundary review, not a substitute for Phase 04/05 security testing or the later end-to-end security phase. Record any authenticated runtime evidence that still requires real provider credentials under Phase 05.

## 17. Performance Requirements

Confirm route pages remain server-rendered by default and interactive boundaries stay focused. Bundle budgets and performance measurement belong to Phase 33.

## 18. Implementation Steps

1. Read repository policy, architecture/route docs, current diff, relevant skills, and confirm Phase 00 is VERIFIED.
2. Inventory actual App Router route files, layouts, features, shared layers, browser APIs, and client boundaries.
3. Verify aliases, locale switching, query preservation, unknown locales, and representative EN/AR route rendering.
4. Run the existing typecheck, lint, route behavior tests, and production build. Do not invent new passing results.
5. Record route/architecture evidence and classify unrelated authentication, design, typography, RLS, and accessibility gaps under their owning phases.
6. Update this phase, the master roadmap, and status/evidence maps together; do not start the next phase.

## 19. Automated Verification

Commands and results on 2026-10-07:

| Command | Result | Evidence |
|---|---|---|
| `npm.cmd run typecheck` | PASS, exit 0 | `tsc --noEmit` |
| `npm.cmd run lint` | PASS, exit 0 | `eslint .` |
| `npm.cmd test -- tests/learning.spec.ts` | 14 passed, 1 failed | 30 localized routes × eight widths passed; alias/query, locale switch, and unknown-locale behavior passed. The lone auth callback failure is assigned to Phase 05; see below. |
| `npm.cmd run build` | PASS, exit 0 | Next.js 16.3.8 production build; all localized App Router routes compiled. |

The Playwright failure is the existing test `auth callback rejects invalid links and external return destinations`. The current dirty `src/lib/supabase/auth-redirects.ts` change excludes the configured `AUTH_SITE_URL` from its development allowlist, so the callback cannot produce the test's expected redirect. This is an auth redirect/configuration issue for Phase 05, not a route-tree or application-build failure. No credentials or environment values are recorded here.

No separate unit-test script exists. No new tests were added for this verification task.

## 20. Manual Verification

- [x] Inspected the complete `src/app/` route inventory and confirmed the App Router build manifest.
- [x] Production-server smoke against the just-built app on port 3011: `/en/courses` and `/ar/courses` returned 200; `/overview` redirected to `/en/overview`; `/fr/courses` resolved to 404 after locale middleware; anonymous `/en/settings` redirected to `/en/login?next=%2Fen%2Fsettings` with `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`.
- [x] Playwright exercised the localized route matrix at all eight required widths with no route-render, direction, overflow, or page-error failures.
- [x] Playwright exercised legacy paths, query preservation, locale switching, anonymous protected-route redirects, and unsupported-locale behavior.
- [ ] Real signed-in route rendering with a live Supabase session: deferred to Phase 05; architecture guard/data ordering was inspected statically here.
- [ ] Approved screenshot comparison, Arabic glyph review, and accessibility sign-off: deferred to their owning phases.

## 21. Security Verification

- [x] Protected learner pages call the server-only `requireAuthenticatedUser` before issuing their profile/preferences queries; identity helpers use `supabase.auth.getUser()`.
- [x] Session-aware layout reads request cookies through Next.js request-time APIs; user-specific data is not placed in a shared cache helper. The proxy forwards Supabase session cache headers. Production smoke confirmed the protected-route response is private and no-store.
- [ ] Live authenticated response and hosted RLS/trigger behavior: not exercised; Phase 05 and Phase 04 evidence respectively.

## 22. Data Verification

Not applicable to new schema or data. No live data was queried or changed as part of this verification.

## 23. Acceptance Criteria

- [x] App Router routes/layouts are explicit, localized, and use URL-neutral route groups.
- [x] Route pages compose focused features rather than routing through a giant pathname switcher.
- [x] Feature folders are domain-oriented and shared components/browser utilities are identifiable.
- [x] Server Components are the default at route/layout boundaries; focused client boundaries own interaction/browser behavior.
- [x] Legacy aliases, query strings, locale switching, and unsupported locale behavior pass.
- [x] EN/AR route rendering and direction pass the architecture smoke matrix.
- [x] `npm run typecheck`, `npm run lint`, scoped Playwright route behavior, and production build pass for Phase 01. One auth callback test failure is assigned to Phase 05 and is recorded above.
- [x] Required predecessor Phase 00 is VERIFIED; no Phase 01 blocking decision remains open.
- [x] Visual parity, Arabic font/glyph approval, accessibility certification, real email/session lifecycle, and RLS/profile behavior are assigned to their owning phases and do not block this architecture contract.

Findings by disposition:

- **BLOCKER:** None within Phase 01.
- **SHOULD FIX:** None required to close the architecture gate.
- **LATER PHASE:** The auth callback test/configuration mismatch belongs to Phase 05. `docs/I18N.md` still uses some planned/target wording for the already implemented next-intl route foundation; Phase 03 should reconcile that narrative. Arabic font/glyph approval and full visual comparison remain with Phases 02/03/32/36.

## 24. Evidence Required

Evidence date: 2026-10-07 (Africa/Cairo). Operator: Codex. Environment: Windows PowerShell, Node/npm project scripts, Next.js 16.3.8, Playwright Chromium. Revision: HEAD `d710c94a600783db3af6cb8f1d6a1df8248245da`; tracked dirty-diff SHA-256 at collection: `0B64476A1BABB83A0E1B52E2AF5CB461F76ABA309291312CF41DD51C949A2E6E`. The working tree also contained unrelated untracked phase documents and an onboarding migration; all were preserved. Exact commands and counts are recorded in sections 19–21. No credentials, environment values, learner PII, live database mutations, or screenshots are included.

## 25. Rollback / Recovery

No application code or database state was changed for this verification. Correct only the scoped documentation if its evidence is inaccurate; preserve the existing dirty worktree.

## 26. Documentation Updates

Updated this phase, `../PROJECT-ROADMAP.md`, `VERIFICATION-MATRIX.md`, `OPEN-DECISIONS.md`, and `PRODUCTION-READINESS.md` with the Phase 01 result and blocker ownership. Architecture and route behavior did not change, so `../ARCHITECTURE.md` and `../ROUTES.md` required no content edits.

## 27. Completion Gate

PHASE IMPLEMENTED:
YES

AUTOMATED VERIFICATION:
PASS (Phase 01 scoped checks; full suite has one Phase 05 auth callback failure)

MANUAL VERIFICATION:
PASS (architecture route/runtime smoke; no visual-parity claim)

SECURITY VERIFICATION:
PASS (server-boundary inspection only; RLS and live-session checks remain later-phase work)

EN/AR VERIFICATION:
PASS (localized routing and direction only; translation and glyph sign-off remain later-phase work)

READY TO MARK VERIFIED:
YES

READY FOR NEXT PHASE:
YES

## 28. Next Phase

Recommended sequential candidate: [Phase 02 — Design System & Responsive Foundation](PHASE-02-DESIGN-RESPONSIVE-FOUNDATION.md), currently VERIFICATION REQUIRED. This verification does not start Phase 02; the user must authorize it separately.
