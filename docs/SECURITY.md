# Security boundaries

Supabase Auth, profile/preferences updates, and private avatar storage are implemented against the hosted DEV project. Assessment scoring, certificate issuance, AI responses, checkout, and course access are still demos and are not production security controls or services.

Before backend implementation:

- Keep credentials server-side; never expose service-role or provider secrets in browser code or `NEXT_PUBLIC_*` variables.
- Use Supabase Row Level Security and authorize user-scoped data on the server.
- Enable RLS on every exposed application table and default to deny. Scope user-owned rows with `auth.uid()`; never rely on hidden controls, submitted user IDs, or editable profile role fields for authorization.
- Remember that RLS filters rows, not columns. Expose public instructor/profile data through a curated, invoker-secured view or narrow server endpoint, never by granting anonymous reads to full profile rows.
- Keep elevated role grants protected and service-role/provider credentials server-only. Review any `SECURITY DEFINER` function for fixed `search_path`, narrow execute grants, caller validation, and intentional RLS bypass.
- Treat client input and localStorage values as untrusted.
- Determine enrollment, assessment results/timing, certificate eligibility, and admin permissions from authoritative server state.
- Confirm payments from verified, idempotently processed Kashier webhooks; do not unlock from a success-page redirect.
- Authorize enrollment before issuing protected Mux playback access.
- Keep assessment answer keys unreadable to learner clients; validate attempt ownership/deadlines and grade atomically on the server.
- Expose certificate verification through a limited public projection with an opaque token, not direct access to learner records.
- Protect Storage objects with policies and entitlement checks; object paths are not authorization.
- Keep OpenAI calls and provider credentials server-side, validate inputs, and add appropriate rate limits.
- Follow the approved schema in [DATABASE-ARCHITECTURE.md](DATABASE-ARCHITECTURE.md): normalized per-locale translations publish independently, and LMS content reads require the requested locale with no silent content fallback. Entity identity, scoring, attempts, enrollment, and authorization remain language-independent.
- Bind attempts to immutable assessment versions; never expose answer keys before the configured post-submission reveal. Course completion snapshots and certificate history remain valid across later curriculum edits.
- Use `orders` plus `order_items`, preserve per-order/payment currency, process verified webhook events idempotently, and grant at most one enrollment per paid order item. A full refund normally revokes paid access if refunds are enabled; any admin override must be explicit and audited.
- Record high-value privileged actions and sensitive support/admin access in the append-only audit design; do not log ordinary CRUD or unnecessary sensitive values. Retention duration remains a legal/business decision.

The hosted DEV foundation implements `profiles`, `learner_preferences`, protected elevated `user_roles`, role-grant audit rows, session refresh, display-name initialization, and a private `avatars` bucket. The auth trigger reads only the trimmed, length-limited `display_name` signup metadata and never derives roles or permissions from metadata. Avatar policies bind each object to the authenticated user's first path segment; the bucket accepts JPEG, PNG, and WebP up to 5 MB. Password recovery, signup, login, logout, settings mutations, and callback handling use server-side Supabase helpers/actions; route authorization checks verified users. Hosted schema and selected RLS behavior were validated through ordinary anonymous/authenticated clients. The service-role key, when used, is limited to tagged disposable test-user setup/cleanup. A migration also revokes client EXECUTE on the hosted platform's RLS auto-enable event-trigger function while preserving the trigger and service-role access. The Supabase security advisor reports the expected informational notice that the private audit table has no client policy. The pgTAP suite in `supabase/tests/database/` is retained but **NOT RUN** because Docker is unavailable. Payments, protected video, course access, assessment backend, certificate issuance, and AI provider integration are not implemented.

The deployed app must set `AUTH_SITE_URL=https://etriplesoft-learn-final.vercel.app`. In Supabase Dashboard → Authentication → URL Configuration, set the Site URL to that origin and allow only the four exact callback URLs for `/en/auth/callback` and `/ar/auth/callback` on `http://127.0.0.1:3010` and the hosted DEV origin. Keep email confirmations enabled. Do not add wildcard Vercel preview domains. See [PROJECT.md](PROJECT.md) for the exact callback list. The project uses Supabase's default DEV email sender; branded templates and production SMTP remain pre-launch work.

### Dependency audit status

As of 2026-10-06, `npm audit` reports five high-severity dependency paths, all through the dev-only chain `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`. The underlying [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects versions through 3.0.3; 3.0.3 is the latest registry version, so there is no patched compatible release to select. `npm audit fix --dry-run` proposes downgrading `eslint-config-next` to 14.2.35, a breaking major downgrade, so no automatic fix was applied. `npm audit --omit=dev` reports zero production vulnerabilities. Recheck the chain when an upstream patched release is available; the current exposure is in local/CI lint tooling, not the shipped production dependency set.
