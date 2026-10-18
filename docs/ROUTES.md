# Route map

## Learning additions — 2026-10-14

- `/{locale}/courses/{slug}/lessons/{lessonId}`: authenticated player/resources/progress; missing exact-locale lessons offer an explicit other-language link.
- `/{locale}/video-management`: current admin/assigned-instructor uploads and caption operations.
- `/{locale}/admin/enrollments`: current administrator-only audited access grants.
- `POST /api/learning/progress`: start a session or submit a bounded serial checkpoint.
- `GET /api/learning/resources/{resourceId}?lessonId=...&locale=...`: exact-resource authorization and private download redirect.
- `GET /api/mux/lessons/{lessonId}`: authorized management status.

Existing course-detail/query/demo URLs remain compatible. Lesson/resource UUID validation accepts existing deterministic UUID-shaped fixtures, including older non-v4 identifiers.

The learner and authentication routes are shared beneath `[locale]`. Route groups remain URL-neutral. `/` redirects to `/en`; `/overview` resolves to `/en/overview`. `/en` and `/ar` are the public marketing landing page (route group `(site)`, styles in `src/features/marketing/`). The authenticated learner dashboard lives at `/en/overview` and `/ar/overview`. Legacy fragment URLs such as `/#courses` resolve to their English localized equivalent after hydration.

| Screen | URL |
| --- | --- |
| Landing (public) | `/en` and `/ar` |
| Dashboard | `/en/overview` and `/ar/overview` (authentication required) |
| All Courses | `/en/courses` and `/ar/courses` |
| AI Assistant | `/en/ai-page` and `/ar/ai-page` |
| Community | `/en/community` and `/ar/community` |
| Messages | `/en/messages` and `/ar/messages` |
| Calendar | `/en/calendar` and `/ar/calendar` |
| Certifications | `/en/certificates` and `/ar/certificates` (authentication required; certificate data remains demo-only) |
| Settings | `/en/settings` and `/ar/settings` (authentication required) |
| Login | `/en/login` and `/ar/login` |
| Signup | `/en/sign-up` and `/ar/sign-up` |
| Password recovery | `/en/forgot-password`, `/ar/forgot-password`, `/en/reset-password`, and `/ar/reset-password` |
| Auth callback | `/en/auth/callback` and `/ar/auth/callback` |
| Course details | `/en/catalog/[slug]` and `/ar/catalog/[slug]` |
| Assessment | `/en/assessment` and `/ar/assessment` |
| Checkout demo | `/en/payment` and `/ar/payment` |
| Admin roles (admin role required) | `/en/admin` and `/ar/admin` |
| Admin audit log (admin role required) | `/en/admin/audit` and `/ar/admin/audit` |

Phase 11 infrastructure endpoints are locale-neutral App Router handlers:

| Operation | URL / method | Authorization |
| --- | --- | --- |
| Create a direct Mux upload | `POST /api/mux/uploads` | Signed-in current admin or instructor assigned to the lesson's course; allowed browser Origin required |
| Issue protected playback token | `POST /api/mux/playback-token` | Signed-in user with active enrollment, published course/module/lesson translations for requested `en` or `ar` locale |
| Update required captions or mark a track reviewed | `PATCH /api/mux/videos/[videoId]/captions` | Signed-in current admin or instructor assigned to the lesson's course |
| Receive Mux events | `POST /api/webhooks/mux` | Mux signature verification over the raw request body |

Playback JWTs expire after five minutes. These endpoints do not implement a player or progress tracking.

Course catalog and canonical slug detail routes remain public. Other LMS demo routes remain available without an auth guarantee until their data and authorization workflows are implemented. Unauthenticated visits to protected routes go to the matching locale login page with a validated `next` destination.

The route-name union lives in `src/lib/routes.ts` for typed client navigation. App Router files define route handling directly; no catch-all page or static route generator is used. Public course detail uses the canonical `/{locale}/catalog/{slug}` route; the legacy `/{locale}/detail-course?slug=...` route redirects when the slug resolves unambiguously and otherwise shows a localized chooser.

## Localized route mapping

Application pages live beneath `src/app/[locale]/`. Supported locales are `en` and `ar`, with English as the default. Route groups such as `(learner)` and `(auth)` do not appear in public URLs.

| Legacy URL | English route | Arabic route |
| --- | --- | --- |
| `/` | `/en` (landing) | `/ar` (landing) |
| `/overview` | `/en/overview` | `/ar/overview` |
| `/courses` | `/en/courses` | `/ar/courses` |
| `/ai-page` | `/en/ai-page` | `/ar/ai-page` |
| `/community` | `/en/community` | `/ar/community` |
| `/messages` | `/en/messages` | `/ar/messages` |
| `/calendar` | `/en/calendar` | `/ar/calendar` |
| `/certificates` | `/en/certificates` | `/ar/certificates` |
| `/settings` | `/en/settings` | `/ar/settings` |
| `/detail-course` | `/en/detail-course` | `/ar/detail-course` |
| `/assessment` | `/en/assessment` | `/ar/assessment` |
| `/payment` | `/en/payment` | `/ar/payment` |
| `/sign-up` | `/en/sign-up` | `/ar/sign-up` |
| `/login` | `/en/login` | `/ar/login` |
| `/forgot-password` | `/en/forgot-password` | `/ar/forgot-password` |
| `/reset-password` | `/en/reset-password` | `/ar/reset-password` |

Legacy unprefixed paths remain usable and resolve to their English localized equivalents (for example `/courses` to `/en/courses`, `/settings` to `/en/settings`, and `/overview` to `/en/overview`). Query parameters are preserved. Legacy fragment names are allowlisted before mapping to an English route.

## Public marketing site

Pages live under `src/app/[locale]/(site)/` (shared header/footer, styles in `src/features/marketing/styles/`, all classes prefixed `mk-`). They are available in `en` and `ar`; course catalog and detail are server-rendered from exact-locale Supabase projections:

| Page | URL |
| --- | --- |
| Landing | `/en`, `/ar` |
| Public course catalog (`?q=`, `?category=`, `?level=`, `?page=` filters) | `/en/catalog`, `/ar/catalog` |
| Course detail | `/en/catalog/[slug]`, `/ar/catalog/[slug]` |
| Learning paths (`#role` deep links) | `/en/learning-paths`, `/ar/learning-paths` |
| Odoo modules (`?module=` selection) | `/en/odoo-modules`, `/ar/odoo-modules` |
| About, Contact, Help Center | `/en/about`, `/en/contact`, `/en/help` (and `/ar/...`) |
| Privacy, Terms, Refund and Course Exchange policy | `/en/privacy`, `/en/terms`, `/en/refund-policy` (and `/ar/...`) |

The public catalog is `/catalog`; `/courses` is the learner course list and both read published exact-locale database records. Catalog listing supports server-side search, category/level filters and pagination. `/{locale}/catalog/{slug}` shows public detail, instructor attribution and the published outline only; missing translations render a localized unavailable state and link only to another published locale. A valid `/detail-course?slug=...` redirects to the canonical route; ambiguous or invalid legacy links remain on a localized chooser. Local seed rows are demo placeholders. Migration `20261011150000_catalog_search_and_facets.sql` is applied to Hosted DEV; no course rows or fixtures have been added there. Learning-path and Odoo-module editorial copy is localized in English and Arabic. Course and lesson records still require an exact-locale database translation (see I18N.md).

Marketing UI copy is in `messages/marketing/{en,ar}.json` and `pages-{en,ar}.json`, read through `src/features/marketing/lib/messages.ts` (not the global next-intl catalog). Arabic is type-checked against English, so the two cannot drift. Privacy and Terms are ported from the standalone odoo-learn site, predate user accounts, and need legal review before launch.

## Learning outcome routes — 2026-10-14

`/{locale}/assessment` now requires login and lists entitled course assessment links; the course lesson UUID route renders the real quiz. `/{locale}/admin/assessments` creates/localizes/publishes drafts for current admins. `/{locale}/certificates` lists earned outcomes; `/{locale}/certificates/{certificateId}` is owner-only and supports EN/AR print presentation. `/{locale}/verify/{token}` is a no-index public narrow verification page. POST `/api/learning/quiz`, `/api/learning/quiz/author`, `/api/learning/completion` and `/api/learning/certificates` validate bounded inputs, authenticated authority and the configured app origin. Existing route groups remain URL-neutral.

## Course-content administration — 2026-10-14

`/{locale}/admin/courses` lists courses with pagination and a draft creation form; `/{locale}/admin/courses/{courseId}` edits course metadata, localized curriculum, lesson order and PDF resources. Current administrator authority is required on pages and every POST to `/api/admin/content` or `/api/admin/resources`. No route-group URL changes or new environment variables. Existing `AUTH_SITE_URL` and server-only `SUPABASE_SERVICE_ROLE_KEY` configure origin validation and private Storage signing.

Current administrators can preview every published course and lesson in the requested locale from `/{locale}/courses`, including paid lessons and published resources, without creating enrollment or progress. Published quizzes render read-only without answer keys; starting an attempt still requires learner entitlement. Draft and archived curriculum remains available through the course editor.

## Checkout and Kashier test mode — 2026-10-14

`/{locale}/payment` displays a server-priced course order and only starts checkout when `KASHIER_CHECKOUT_ENABLED=true`, `KASHIER_MODE` is `test` or `live`, valid credentials for that mode exist and `AUTH_SITE_URL` is valid. In test mode, `KASHIER_WEBHOOK_URL` may be empty: after returning to the local payment page, the learner selects **Check payment status** to reconcile directly with Kashier on the server. If configured, the webhook must be a public HTTPS URL ending in `/api/webhooks/kashier`. `POST /api/checkout` starts or checks the signed-in learner's own order; `POST /api/webhooks/kashier` verifies the signature and reconciles the provider order before settlement. Keep credentials server-only in `.env.local`. The checked-in example disables checkout by default. `KASHIER_MODE=live` selects `api.kashier.io` and requires a public HTTPS `AUTH_SITE_URL` and a live webhook; it needs migration `20261015120000_commerce_live_session_url.sql` and has not been exercised against a live account. A configured test session is not evidence of a completed sandbox payment; see [SECURITY.md](SECURITY.md).

## Demo-only learner pages

`/ai-page`, `/community`, `/messages` and `/calendar` (and the dashboard AI card, community banners and related quick links) show fixture content. They are hidden and return 404 unless `NEXT_PUBLIC_SHOW_DEMO_FEATURES=true`; the Playwright config sets it so the existing tests still cover them. Keep it off for real learners until decisions D04, D05, D21 and D22 are resolved.
