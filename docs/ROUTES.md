# Route map

## Learning additions — 2026-10-14

- `/{locale}/courses/{slug}/lessons/{lessonId}`: authenticated player/resources/progress; missing exact-locale lessons offer an explicit other-language link.
- `/{locale}/admin/videos`: current administrator uploads and caption operations inside the admin console (`?lesson=<uuid>` preselects a lesson).
- `/{locale}/video-management`: assigned-instructor uploads and caption operations; current administrators are redirected to `/{locale}/admin/videos`.
- `/{locale}/admin/enrollments`: current administrator-only audited access grants.
- `/{locale}/admin/coupons`: current administrator-only audited coupon creation and activation.
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
| Calendar | `/en/calendar` and `/ar/calendar` (authentication required): entitled course events plus the learner's own study sessions, in the learner's saved time zone. `GET /api/calendar/ics?locale=en|ar` downloads the signed-in learner's events (30 days back to 365 ahead) as an `.ics` file (401 when signed out). Administrators schedule events at `/{locale}/admin/calendar`; instructors with the `instructor` role who are assigned to a course schedule events for that course at `/{locale}/schedule` (404 for everyone else). |
| Certifications | `/en/certificates` and `/ar/certificates` (authentication required; certificate data remains demo-only) |
| Settings | `/en/settings` and `/ar/settings` (authentication required); `?tab=` (`account`, `security`, `notifications`, `learning`, `ai`) opens a tab. `GET /api/account/export` downloads the signed-in learner's own data as JSON (401 when signed out). |
| Login | `/en/login` and `/ar/login` |
| Signup | `/en/sign-up` and `/ar/sign-up` |
| Password recovery | `/en/forgot-password`, `/ar/forgot-password`, `/en/reset-password`, and `/ar/reset-password` |
| Auth callback | `/en/auth/callback` and `/ar/auth/callback` |
| Course details | `/en/catalog/[slug]` and `/ar/catalog/[slug]` |
| Assessment | `/en/assessment` and `/ar/assessment` |
| Checkout demo | `/en/payment` and `/ar/payment` |
| Admin overview (admin role required) | `/en/admin` and `/ar/admin` |
| Admin roles (admin role required) | `/en/admin/roles` and `/ar/admin/roles` |
| Admin audit log (admin role required) | `/en/admin/audit` and `/ar/admin/audit` |
| Admin analytics (admin role required) | `/{locale}/admin/analytics`, `/{locale}/admin/analytics/courses`, `/{locale}/admin/analytics/courses/{courseId}`, `/{locale}/admin/analytics/learners` |
| Admin institutions (admin role required) | `/{locale}/admin/institutions?kind=university|company` |
| Admin organizations (admin role required) | `/{locale}/admin/organizations`, `/{locale}/admin/organizations/{orgId}?tab=overview|members|invitations`, `/{locale}/admin/organizations/{orgId}/members/{userId}` |
| Organization portal (authentication required) | `/{locale}/organization?org={orgId}&tab=overview|members|invitations|buy`, `/{locale}/organization/members/{userId}?org={orgId}`, `/{locale}/join?code={invitationCode}` |

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
| `/cart` | `/en/cart` | `/ar/cart` |
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

## Checkout steps and coupons — 2026-10-18

Checkout is three steps on `/{locale}/payment`: `?course={slug}` or `?order={id}` shows **Review Order**; `?order={id}&step=checkout` shows **Billing Details** and **Payment**; Kashier's return (`&step=checkout&returned=1` in the merchant redirect, display-only) or a non-pending order shows the server-verified result. Card details are entered only on Kashier's hosted page. `POST /api/checkout` adds `apply-coupon`, `remove-coupon` and requires `billing` (name, country, national phone) for `start-order`; the server builds the E.164 phone and computes discounts from the order snapshot. Coupons cannot change after a Kashier session is bound. Requires migration `20261018150000_checkout_coupons_billing.sql`.

## Level check and recommendations — 2026-10-20

`/{locale}/placement` (authentication required) is the "Find your level" check: step 1 asks role, areas (the categories of published courses) and Odoo experience; step 2 is a short server-scored skill check for the chosen areas, skipped for learners with no Odoo experience. `?mode=goals` changes goals only and keeps the measured level (falls back to the full check when there is no result yet). `/{locale}/overview` redirects a learner there until they finish or skip it, but only learners with no active or completed enrollment; enrolled and company-invited learners are not redirected and see an overview prompt instead. Only the overview redirects, so sign-in with a `next` destination (checkout, a course) is never interrupted. Learners with goals see **Recommended for you** (first card "Start here", a reason per card, level per area, retake/change-goals links) in place of **Available courses**. Settings → Learning links to both. Requires migrations `20261020120000_learner_placement.sql` and `20261020145000_placement_review.sql` (skill check v2, enrolled learners not redirected). Questions for review: [PLACEMENT-QUESTIONS-REVIEW.md](PLACEMENT-QUESTIONS-REVIEW.md).

## Demo-only learner pages

`/community` (and community banners and related quick links) shows fixture content. It is hidden and returns 404 unless `NEXT_PUBLIC_SHOW_DEMO_FEATURES=true`; the Playwright config sets it so the existing tests still cover it. Keep it off for real learners; community remains deferred under D22.

`/{locale}/messages` is real, private messaging (authentication required; anonymous visits go to login). A learner talks to the instructors of a course they are entitled to (`course` topic) or to the ETripleSoft team (`support` topic, answered by MFA-verified admins); learners never message each other. Instructors (active role and course link) and admins also get a **Learner inbox** tab. Query parameters: `?thread={id}` opens a conversation, `?box=staff` selects the learner inbox (ignored for non-staff), `?new={courseSlug}` or `?new=support` opens the new-message dialog (the course page links here for enrolled learners). New messages notify the other side through the header bell; the sidebar shows a dot when a conversation is unread. Requires migration `20261019150000_learner_messages.sql` (local only; not applied to Hosted DEV). See [Phase 26](phases/PHASE-26-COMMUNITY-MESSAGES.md). The calendar is a real, database-backed feature (D04 approved 2026-10-18) and is no longer gated.

`/{locale}/ai-page` is the Gemini-backed AI assistant (authentication required; anonymous visits go to login). It shows an unavailable state when `GEMINI_API_KEY` is not configured. `POST /api/ai/chat` streams one reply as NDJSON and saves the turn; `GET /api/ai/conversations/{id}` returns the caller's own messages and `DELETE` removes that conversation. The page has two chats: General and Course (answers from one enrolled course's indexed content with lesson citations); `POST /api/ai/chat` takes `kind` (`general` | `course`) and, for `course`, `courseSlug`. `/{locale}/admin/ai` (current admins) shows per-course video transcripts and rebuilds the Course chat index. Requires migrations `20261018121201_ai_assistant_conversations.sql` and `20261018122716_ai_assistant_rpc_defaults.sql` (applied to Hosted DEV) and `20261018200000_ai_course_rag.sql` (all applied to Hosted DEV). See [Phase 25](phases/PHASE-25-AI-ASSISTANT.md).

## Admin console — 2026-10-18

`/{locale}/admin` is now a read-only overview (course, AI-index, coupon and administrator figures, items needing attention, quick actions and recent audit activity) built from the existing admin RPCs; no new database objects. Role management moved from `/{locale}/admin` to `/{locale}/admin/roles`. `/{locale}/admin/courses` accepts `?status=published|draft|archived` alongside `?page=`. All admin pages share a sidebar shell (drawer at 1024px and below). Authority is unchanged: the layout and every page re-check the current admin role, and each RPC re-checks it in the database.

`/{locale}/admin/analytics` is a read-only analytics area: platform overview (learners, activity, enrollments, completions, revenue, breakdowns and trends), `/courses` (per-course enrollment, completion, progress, quiz, rating and revenue figures), `/courses/{courseId}` (lesson-by-lesson funnel) and `/learners` (paginated learner roster). `?range=7|30|90|365` selects the period (default 30) on the overview and course views; the roster takes `?q=` (name, email or institution), `?segment=paid|free|complimentary|none` and `?page=`. Data comes from the `admin_analytics_*` RPCs in migration `20261020140000_admin_analytics.sql` (local only; not applied to Hosted DEV), each of which re-checks the current admin role and MFA in the database. Staff accounts are excluded from every figure.

`/{locale}/admin/institutions` manages the canonical universities and companies (`?kind=university|company`, default university): it lists typed names from learner profiles that are not linked yet, links a spelling to an institution, and adds institutions. Profiles link automatically by a database trigger; the onboarding and settings forms are unchanged. Streaming minutes (all playback, rewatches included) appear across the analytics pages. Both come from migration `20261020150000_streaming_minutes_and_institutions.sql` (local only; not applied to Hosted DEV).

Organizations (B2B, decision F01): `/{locale}/organization` shows pending invitations for the signed-in learner's verified email, their memberships and, for managers of an active organization, management tabs (seat licenses, members with progress/quiz/certificate data for assigned courses, invitations, buying seats). Buying seats creates a seat order and continues at `/{locale}/payment?order=…&step=checkout`. `/{locale}/join?code=` previews and accepts an invitation; signed-out visitors return to it after sign-in (`safeReturnPath` allows exactly this query), and the signup form's company-invited code routes there after email confirmation. The learner sidebar shows an Organization link to members, managers and invitees. `/{locale}/admin/organizations` is the B2B overview (seats, utilization, renewal risk, engagement, revenue) with creation; the detail page adds seat grants and suspension. Requires migration `20261020171500_organizations.sql` (local only; not applied to Hosted DEV).

Course videos moved into the admin console at `/{locale}/admin/videos`; `/{locale}/video-management` redirects administrators there and keeps serving assigned instructors in the learner shell. The learner sidebar shows an "Admin dashboard" link to `/{locale}/admin` for current administrators only (display only; the admin layout re-checks the role).

## Shopping cart — 2026-10-20

`/{locale}/cart` is open to guests. The cart is a first-party `ets_cart` cookie listing up to 20 course slugs; it holds no prices and is never trusted. The page re-reads each course from the exact-locale catalog and drops (and removes from the cookie) courses that are unpublished, free or already owned. Add to cart appears on learner course cards, the learner course detail and the public `/catalog/[slug]` page (only when the public catalog reports a paid price). The header cart icon is in both the public site header (beside the menu button below 1024px) and the learner top bar. Checkout requires sign-in (`/login?next=/{locale}/cart`); `POST /api/checkout` `create-cart-order` calls `learner_create_cart_order`, which prices all items server-side into one order and reuses a pending order with the same courses, then continues to Billing Details on `/{locale}/payment`. `start-order` refuses an order containing a course the learner already owns. `/{locale}/payment` without `order` or `course` redirects to the cart. Requires migration `20261020130000_cart_orders.sql`.

Cart refinements (migration `20261020155000_cart_order_reuse.sql`): the sign-in link returns to `/{locale}/cart?checkout=1` (an allow-listed return path), and checkout then continues to Billing Details without a second click. `orders.kind` is `course` (Buy now) or `cart`; checking out an edited cart rewrites the learner's latest open cart order that has no Kashier session yet (items repriced, coupon cleared) instead of creating another order, so cart edits no longer count toward the 10-orders-per-hour limit. Buy now never reuses a multi-course order. `order_items.position` keeps the cart order on the payment page, which lists each course price for multi-course orders. A course added to the cart shows a toast with a View cart link.

Payment step states: a signed-out visit to `/{locale}/payment?order=<uuid>&step=checkout[&returned=1]` (including the proxy's session-expired redirect) returns there after sign-in, so a Kashier return still reaches its confirmation; `safeReturnPath` allows exactly that query and the page shows only the learner's own order. After a Kashier return the page reconciles with the provider up to four times over about 12 seconds before showing "pending". An order past its 30-minute window is first reconciled server-side (it may have been paid at the last moment); if still unpaid, billing and Pay are replaced by **Start checkout again**, which creates a fresh server-priced order for the same courses (coupons must be re-entered). The order summary's Edit link opens `/{locale}/cart` for cart orders. Checkout API and Kashier webhook failures log a reason code (for example `provider_unavailable:400`) without secrets or learner data.

Account cart, suggestions, cart coupons and funnel (migration `20261020163700_account_cart_and_funnel.sql`): signed-in learners' carts are also stored in `cart_items` (written only through `learner_cart_sync`), so the cart follows them across devices; `POST /api/cart` merges the browser cart on page load and mirrors adds/removes, and `/{locale}/cart` merges server-side before rendering. Signing out clears the browser copy only. Step 1 (Review Order) now uses the same layout as Billing and Payment, suggests up to three paid courses the learner neither owns nor has in the cart (same category first), and lets signed-in learners apply a coupon (`POST /api/checkout` `cart-coupon` creates or reuses the cart order and calls `learner_apply_coupon`; the discount carries into billing). `cart_events` records at most one add/remove per learner, course and day; `/{locale}/admin/coupons?days=7|30|90` shows the checkout funnel (added to cart, started checkout, billing, payment opened, paid) and the courses most often left in carts via `admin_checkout_funnel`. Guests enter the funnel once they sign in. `cart_items` is included in the account data export.
