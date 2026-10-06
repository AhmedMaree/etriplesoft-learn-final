---
name: lms-database-architecture
description: Design or review PostgreSQL/Supabase schemas for ETripleSoft Learn LMS data, migrations, localization, and transactional workflows.
---

# LMS Database Architecture

Use this skill for ETripleSoft Learn database architecture, schema reviews, migration planning, and database-backed LMS design. It guides design; it does not authorize migrations, table creation, or backend integration unless the user requests implementation.

## Required context

- Read `AGENTS.md` and the relevant project docs, especially `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, `docs/I18N.md`, `docs/SECURITY.md`, and `docs/DATABASE-ARCHITECTURE.md` when present.
- Inspect actual feature UI, fixtures, current schema/migrations, and git status before proposing changes. Separate demonstrated product needs from mock-only values and unresolved product policy.
- Treat English/Arabic application UI messages separately from database-backed localized course/assessment content.

## Modeling rules

- Model entities and relationships relationally. Define primary/foreign keys, ownership, deletion behavior, nullability, unique/check constraints, timestamps, lifecycle, and indexes from observed queries and RLS predicates.
- Keep business identity, prices, status, ordering, entitlement, scoring, and authorization independent of locale. Prefer one entity plus `(entity_id, locale)` translation rows for stable localized content; explain JSONB and duplicated-row tradeoffs before recommending alternatives.
- Avoid giant JSONB blobs for relational business data, unnecessary polymorphic references, premature services, redundant stored aggregates, and speculative tables.
- Use explicit state transitions for publishing, enrollment, attempts, payments, and certificates. Preserve historical financial and learning records; choose archive/revoke over deletion where history matters.
- Review N+1/query shape and index the actual access pattern, including foreign keys used by joins/RLS. Do not repeat indexes already supplied by primary/unique constraints.
- Keep generated Supabase TypeScript schema types as the database boundary and map them to domain/UI types where shapes differ.

## LMS domains to evaluate

Evaluate profiles/Auth separation, elevated roles, course/module/lesson content, translations, resource/video boundaries, enrollment, progress, assessments, certificates, purchases/payments, organizations, admin workflows, auditability, and future calendar/notification/AI domains. Classify each as V1 or deferred based on the product, not generic LMS convention.

For assessments, isolate answer keys, use server timestamps, define attempt/answer uniqueness, and make scoring authoritative. For commerce, snapshot currency/amounts, make provider references idempotent, and grant enrollment only from verified server events. For certificates, define authoritative eligibility and unique verification. For organizations, scope manager access explicitly and avoid assuming managers may inspect individual learner records.

## Required output/review

For architecture deliverables, include a domain/relationship map, table inventory, constraints/deletion rules, index rationale, localization decision, ownership/RLS boundaries, transaction boundaries, storage plan when relevant, migration/seed/type strategy, V1/deferred split, and unresolved product questions. Keep open product policy explicit; do not turn an example into a requirement.

Do not write SQL, migrations, seed data, Supabase configuration, or application integration during an architecture-only request. Before implementation, follow the user's authorization and use `supabase-security` plus `security-review` for access-control-sensitive work.
