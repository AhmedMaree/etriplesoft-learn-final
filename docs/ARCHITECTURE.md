# Architecture

## Learning checkpoint — 2026-10-14

The lesson route now consumes entitlement-controlled resources and saved progress. The Mux Player client uses renewable server-issued tokens, serial checkpoints and Supabase resume. `/api/learning/progress` calls owner/entitlement-validated RPCs; no browser writes completion columns directly. `learning_private` stores locked playback sessions and unique watched intervals; public progress tables expose owner reads only. `/video-management` supports authorized direct uploads and caption review. `/admin/enrollments` provides explicitly approved, audited manual access independently of payment. The resource endpoint rechecks exact-locale lesson/resource access before private storage signing. See [COURSE-VIDEO-GUIDE.md](COURSE-VIDEO-GUIDE.md) for evidence and remaining acceptance; older Phase 11 statements below are historical.

Commerce now has owner-scoped EGP order snapshots, a server-only Kashier test-mode adapter, an authenticated checkout/status API, and a signed webhook that reconciles provider orders before the database grants enrollment. DEV checkout stays disabled by default until sandbox secrets and a public HTTPS webhook are configured; see [SECURITY.md](SECURITY.md) and [ROUTES.md](ROUTES.md). No production payment path is enabled.

Current administrators have a narrow, read-only preview path through published exact-locale lessons, resources, and quiz questions without enrollment or learner progress. Quiz answer keys and attempt creation remain unavailable through this preview. Migration `20261015070332_admin_published_course_preview.sql` adds the database authority checks and is applied to local and `ets-learn` DEV.

The application uses Next.js App Router, React, and TypeScript. Locale routes live under `src/app/[locale]/`; `(learner)` and `(auth)` are URL-neutral route groups. `src/app/[locale]/layout.tsx` validates locale parameters, sets `lang`/`dir`, loads the local font and global CSS, provides next-intl context, and mounts the legacy fragment handler and demo toast viewport. English and Arabic use shared page and feature components.

## Locale routing and messages

`next-intl` v4 is configured by `next.config.ts` and `src/i18n/request.ts`. Routing policy is in `src/i18n/config.ts` and `src/i18n/routing.ts`: supported locales are `en` and `ar`, the default is `en`, every localized route is prefixed, and locale detection is disabled. `src/proxy.ts` refreshes Supabase sessions through `src/lib/supabase/proxy.ts` and composes refreshed cookies/cache headers onto the next-intl response. It does not decide authorization. Server pages and actions use verified Supabase users for dashboard, settings, and certificates access. Locale-aware links and router helpers are in `src/i18n/navigation.ts`; messages are in `messages/en.json` and `messages/ar.json`. See [I18N.md](I18N.md) and [ROUTES.md](ROUTES.md).

## Server and Client Components

App Router pages, route layouts, metadata functions, and the overview composition are Server Components by default. The locale layout and learner layout remain server-rendered. Focused Client Components own interactions requiring React state, browser APIs, local demo storage, event handlers, locale switching, toasts, mobile navigation, or browser downloads. Examples include the learner shell/header/sidebar, courses filtering, settings, signup, assessment, calendar, AI demo, checkout, and certificate actions. The learner shell receives route content through `children`, so client navigation does not make all route pages client components.

## Features and future backend

Feature code and demo fixtures live under `src/features/`; shared layout, UI, and components live under `src/components/`. Browser-only demo storage and toast behavior live under `src/lib/browser/`. Assessment-question and event fixtures remain English demo content by design. Phase 09 public catalog, learner course list and course detail use Server Components and the typed repository for exact-locale published course/outline projections. Phase 10 adds free enrollment and exact-locale lesson/resource entitlement RPCs; its migrations are on Hosted DEV. Phase 11 adds server-only Mux integration in `src/lib/mux/` and `/api/mux/*` plus `/api/webhooks/mux`: current admins and assigned instructors can request direct uploads, the database stores language-neutral asset metadata, and signed playback tokens require enrollment and published exact-locale ancestry. Mux configuration and service-role database access remain server-only. Mux and commerce migrations are applied to Hosted DEV. Search, filtered counts and category facets depend on migration `20261011150000_catalog_search_and_facets.sql`; deterministic course data remains Local/CI-only. Generated database types live in `src/types/database.ts`, and SSR clients use the publishable key. Signup, login, recovery, profile/preferences, private avatar storage, enrollment, assessments, completion/certificates and checkout now have server-authoritative workflows. The Kashier checkout scaffold is test-mode only and disabled until local sandbox configuration; see [SECURITY.md](SECURITY.md). AI provider integration remains future work.

## Styling

The approved design remains in `src/styles.css` and `src/refinements.css`. Direction-aware spacing uses CSS logical properties where appropriate, with scoped RTL placement rules for components whose direction changes. See [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) and the root [DESIGN.md](../DESIGN.md).

## Assessment/outcome checkpoint — 2026-10-14

Server-authorized quiz RPCs now handle immutable versions, exact-locale presentation, private answer keys and DB-timed attempts. Narrow client components render assessment/authoring controls; dashboard and certificate data load on the server. Explicit completion evaluation persists a historical snapshot; certificate issuance uses that snapshot, and public verification returns a minimal token-selected projection. The legacy assessment route is an authenticated directory. See [the learning guide](LEARNING-FEATURES-GUIDE.md) for current behavior and limits.

The course editor loads metadata and bounded curriculum on the server. Client forms call fixed, validated actions on current-admin APIs; private PDF binaries upload directly to Supabase through a scoped signed token. The API then validates the stored file before publication. Existing learner, Mux and quiz services retain their own authority checks.
