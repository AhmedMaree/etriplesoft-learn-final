# ETripleSoft Learn
<!-- impeccable:product-schema 1 -->

## Platform
Responsive, bilingual (English/Arabic, RTL-aware) learning management system for Odoo education.

## Stack
Next.js App Router, React 19 and strict TypeScript. Supabase provides Auth, Postgres with RLS and private Storage. Mux serves signed lesson video. Kashier handles checkout (test mode only until production is configured). See `docs/ARCHITECTURE.md` and `docs/phases/PRODUCTION-READINESS.md` for the live status.

## Scope
Catalog, enrollment, protected video and PDF lessons, progress tracking, server-graded assessments, course completion, verifiable certificates, learner dashboard, course administration and payments. Calendar, community, messages and the AI assistant are not launch features; they show demonstration content and must stay hidden or labelled until built (decisions D04, D05, D21, D22).

## Visual authority
The supplied page references, `E Triple Soft Learn Brand Identity.pdf`, `EXPORTS/` and `DESIGN.md` define the brand. Design work improves quality inside that brand (tokens, spacing, states, accessibility, lesson and course experience). Do not change the brand identity or approved screen layouts without an explicit request.
