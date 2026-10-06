---
name: security-review
description: Use when work touches authentication, authorization, database access, payments, webhooks, AI APIs, protected courses, assessment scoring, certificates, uploads, or secrets.
---

# Security Review

Treat all browser input as untrusted.

Never expose private API keys.

Never rely on client-side authorization.

Verify authorization server-side.

For Supabase:

- use RLS
- scope user records to auth.uid()
- never expose service-role credentials

For payments:

- verify webhook signatures
- make processing idempotent
- never unlock content from a success-page redirect alone

For assessments:

- grade on server
- never send correct answers before submission
- use server timestamps for timed assessments

For certificates:

- issue based on authoritative completion state
- use unique verification identifiers

For protected course video:

- authorize enrollment before creating playback access

For AI:

- keep provider keys server-side
- rate limit endpoints
- validate tool inputs
- do not give models unrestricted database access

Report security concerns instead of hiding them behind frontend checks.
