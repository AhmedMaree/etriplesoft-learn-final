# Route map

The learner and authentication routes are shared beneath `[locale]`. Route groups remain URL-neutral. `/` redirects to `/en`; `/overview` resolves to `/en/overview`. `/en` and `/ar` are authenticated learner dashboards, as are `/en/overview` and `/ar/overview`. Legacy fragment URLs such as `/#courses` resolve to their English localized equivalent after hydration.

| Screen | URL |
| --- | --- |
| Dashboard | `/en`, `/ar`, `/en/overview`, and `/ar/overview` (authentication required) |
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
| Course details | `/en/detail-course` and `/ar/detail-course` |
| Assessment | `/en/assessment` and `/ar/assessment` |
| Checkout demo | `/en/payment` and `/ar/payment` |

Course catalog and detail routes remain public. Other LMS demo routes remain available without an auth guarantee until their data and authorization workflows are implemented. Unauthenticated visits to protected routes go to the matching locale login page with a validated `next` destination.

The route-name union lives in `src/lib/routes.ts` for typed client navigation. App Router files define route handling directly; no catch-all page or static route generator is used. Course details remain a single demo route until course identifiers are designed.

## Localized route mapping

Application pages live beneath `src/app/[locale]/`. Supported locales are `en` and `ar`, with English as the default. Route groups such as `(learner)` and `(auth)` do not appear in public URLs.

| Legacy URL | English route | Arabic route |
| --- | --- | --- |
| `/` | `/en` | `/ar` |
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
