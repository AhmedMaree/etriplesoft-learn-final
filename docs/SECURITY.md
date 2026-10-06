# Security boundaries

The current application is a local frontend demo. Signup, password checks, profile settings, assessment scoring, certificates, AI responses, and checkout are not production security controls or services.

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
- Design database-backed LMS content to support English and Arabic localization. Course, module, lesson, and assessment presentation may require translated content, while business identity, scoring, attempts, enrollment, and authorization remain language-independent. The proposed table structure and RLS boundaries are documented in [DATABASE-ARCHITECTURE.md](DATABASE-ARCHITECTURE.md); they remain subject to review and are not implemented.

No backend, authentication, payment, video, certificate issuance, or AI provider integration is implemented in this phase.
