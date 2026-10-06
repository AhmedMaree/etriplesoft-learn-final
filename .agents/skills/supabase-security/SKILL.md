---
name: supabase-security
description: Design, implement, or review Supabase RLS, authorization, privileged operations, and data-access boundaries for ETripleSoft Learn.
---

# Supabase Security

Use for any ETripleSoft Learn Supabase schema, authentication, authorization, RLS, storage policy, RPC, payment, assessment, certificate, or user-data work. Read `AGENTS.md`, `docs/SECURITY.md`, and `docs/DATABASE-ARCHITECTURE.md` when present. This skill supplements the repository's `security-review` policy.

## Trust boundaries

- Treat browser input, query parameters, local storage, submitted user IDs, role values, progress claims, and provider redirects as untrusted.
- Enable RLS on every exposed application table and default to deny. Use `auth.uid()` for owner scope; never rely on hidden buttons or route visibility.
- Keep `service_role`, provider credentials, and privileged database access server-only. Each bypass of RLS must have a narrow purpose, validation, and audit path.
- Do not let users write their own elevated roles, enrollment grants, scores, passed flags, certificate issuance, payment state, or admin ownership.
- Keep private profile/payment/answer/AI data owner-scoped and minimize columns returned to clients.
- RLS filters rows, not columns. Do not expose full profile rows to publish instructor names; use a curated invoker-secured view or narrow server endpoint and review its grants/RLS behavior.
- Treat SQL grants and RLS as separate controls: grant table/Data API access only to intended roles, and never treat `TO authenticated` as proof of row ownership. Owner policies compare the owner to `(select auth.uid())`; updates need matching SELECT access plus both `USING` and `WITH CHECK` predicates.
- Views bypass RLS by default. Exposed views must use `security_invoker` on supported PostgreSQL versions; otherwise keep them unexposed and serve them through a restricted server endpoint.

## Role and policy design

- Keep authentication identity in `auth.users`; do not store passwords or duplicate email as an authorization source.
- Represent elevated privileges in protected membership/role records, not a client-editable profile field. Database role data is authoritative; JWT claims are not a substitute for current authorization.
- Avoid recursive RLS. Prefer `SECURITY INVOKER`. Only use `SECURITY DEFINER` for a justified atomic operation or protected lookup; place it in a non-exposed schema, use an empty/fixed safe `search_path`, qualify relations, explicitly check caller identity, revoke default `PUBLIC` execution, grant only necessary roles, and document why it bypasses RLS.
- Draft explicit anonymous, learner, instructor, organization-manager, and admin behavior for each table. Scope instructors to assigned courses; defer organization-manager access until the approved reporting policy exists.
- Do not authorize with user-editable Auth metadata. Database role memberships are authoritative; app metadata/JWT claims can be stale and require refresh before changes take effect.
- Protect Supabase Storage with bucket/object policies; object names are not authorization. Use private resources and signed access only after enrollment/preview checks.

## Sensitive workflows

- **Payments:** verify provider webhook signatures; persist provider event/reference IDs with unique constraints; process idempotently; update payment/order and grant enrollment atomically. Never unlock from a success redirect. Never store PAN/CVV.
- **Assessments:** never return answer keys before allowed submission; use server-created start/expiry timestamps; validate attempt owner/state and option/question relationships; grade server-side in an atomic operation; reject replay and post-submission writes.
- **Certificates:** issue only from authoritative completion state; enforce unique certificate identity and opaque verification token; return a narrow public verification projection without internal user IDs.
- **Video:** verify entitlement server-side before issuing protected playback access. Do not expose provider secrets or trust client-reported completion alone.
- **AI:** keep provider keys server-side; validate inputs, rate-limit, authorize retrieval to entitled content, constrain tool permissions, and scope persisted history to its owner.
- **Uploads:** validate size/type and ownership server-side; avoid trusting client MIME/path; define deletion and retention behavior.

## Verification checklist

- Test unauthenticated access, owner reads/writes, cross-user ID substitution, elevated-role forgery, draft/unpublished content access, direct server-managed state writes, and storage path spoofing.
- Verify answer-key tables are unreadable to all learner/instructor clients and public certificate queries reveal only approved fields.
- Test duplicate/replayed webhooks, attempt resubmission/expiry, certificate double issuance, and enrollment uniqueness.
- Review grants as well as RLS policies; RLS alone does not define a safe API surface.
- Report unresolved policy/security risks plainly. Do not weaken authorization to make a feature pass.
