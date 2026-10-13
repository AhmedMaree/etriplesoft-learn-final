# Production readiness

Overall: **NOT READY**. Foundation is PARTIAL; no defensible completion percentage exists. Status vocabulary: NOT READY / PARTIAL / READY. READY requires current environment/revision-bound evidence and all applicable phase gates; no row is READY merely because a document reports prior work.

| Launch gate | Readiness | Owning phases | Evidence / remaining gate |
|---|---|---|---|
| Database | PARTIAL | 04, 07–21 | Identity and Phases 07–08 schemas are on DEV. Phase 10 enrollment/entitlement migrations are applied locally (pgTAP 263/263, concurrency 8/8) and on Hosted DEV (hosted suite 32/32). The 28 temporary Phase 09 verification courses are archived; the six approved-for-DEV demo courses imported during Phase 10 remain visible (6 EN / 5 AR). Progress, assessment and commerce schemas remain future phases. |
| Authentication | PARTIAL | 05 | Real server actions/callbacks exist; live email/session/signup evidence incomplete. |
| RLS | PARTIAL | 04 and every data phase | Phase 10 local tests cover owner isolation, non-preview denial, entitlement, revoke/expiry history and explicit previews. Hosted DEV entitlement/RPC negative checks pass (32/32). |
| Storage | PARTIAL | 04, 08, 11, 18 | Private avatars and the private 50 MiB course-resources bucket are configured on DEV; local anonymous denial and service cleanup smoke passed. Entitled resource delivery and video authorization remain pending. |
| Courses | NOT READY | 07–09, 27 | Phase 09 is VERIFIED: catalog, learner course list and detail integration pass local and Hosted DEV checks, responsive review, and user-approved Arabic typography review; all 28 temporary courses are archived and absent from public projections. Approved real launch content (courses, prices, categories and Arabic copy, D12) remains open. |
| Learning/video | NOT READY | 10–12 | Phase 10 enrollment/entitlement gates are VERIFIED (local and Hosted DEV security suites pass; user EN/AR review recorded). Phase 11 Mux-specific decisions are approved and local implementation is underway; DB/RLS and real provider verification remain incomplete. No learning player exists. |
| Progress/completion | NOT READY | 13, 17 | Static progress; no authoritative completion. |
| Assessments | NOT READY | 14–16 | Client answers/timer/scoring and localStorage only. |
| Certificates | NOT READY | 18 | Fixed name/date print UI; no issue/revoke/public verification. |
| Payments | NOT READY | 19, 20, 29 | Demo checkout; no provider processing. |
| Learning paths/dashboard | PARTIAL | 21, 22 | Authenticated dashboard and visual widgets exist; metrics are fixtures. |
| EN/AR | PARTIAL | 03 and all UI phases, 36 | Locale routing/messages exist; hardcoded UI and untranslated course data remain. |
| Accessibility | PARTIAL | 31 | Some semantics/form labels exist; full audit absent. |
| Responsive/visual | PARTIAL | 02, 32 | 2026-10-08: 16 focused anonymous EN/AR cases pass with 32 captures; typecheck/lint/build pass. Authenticated evidence, complete reference review, Arabic typography approval and corrupted locale copy remain open. See Phase 02 for broader-suite failures. |
| Security | PARTIAL | 34 and every sensitive phase | Boundaries and identity controls exist; full production threat-model/negative suite missing. |
| Performance | NOT READY | 33 | No workload/budget results. |
| Monitoring/analytics | NOT READY | 35 | No deployed alerts or approved telemetry policy. |
| Backups/restore | NOT READY | 37 | No production backup/restore drill or RPO/RTO evidence. |
| Email | PARTIAL | 05, 37 | DEV confirmation configuration documented; production SMTP/templates/delivery unverified. |
| Domains/TLS | NOT READY | 30, 37 | Hardcoded metadata hostname is not provisioning evidence. |
| Environment variables | PARTIAL | 37 | DEV names configured; no production secret/env validation. |
| Production Supabase | NOT READY | 37, 38 | No separate production project evidence. |
| Production Mux | NOT READY | 11, 37 | Production credentials, environment validation, deployment settings and Hosted DEV review remain pending; no Production environment has been configured. |
| Production Kashier | NOT READY | 20, 37 | No merchant production/sandbox transition evidence. |
| Production OpenAI | NOT READY | 25, 37 | No authorized real integration or budget controls. |
| Legal pages | NOT READY | 34, 36 | Checkout terms/privacy are demo toasts. |
| Privacy/retention | NOT READY | 34 | D03 unresolved; no tested lifecycle workflows. |
| Recovery procedures | NOT READY | 37–39 | No tested migration/provider/incident recovery runbooks. |
| Admin operations | PARTIAL | 06, 27–29 | Role helper/grant audit exists; admin workflows absent. |
| Content/translation rights | NOT READY | 36 | No approved launch content manifest/sign-off. |
| E2E tests | PARTIAL | 39 | Phase 01 route smoke verifies architecture only (14/15 current tests passed; auth callback configuration failure belongs to Phase 05). Demo tests do not certify the paid learning-to-certificate production journey. |
| Release approval/support | NOT READY | 40 | No final launch owner sign-off or operating handoff. |

## Release rule

Phases 01–22, 25 and 27–39 are required by this proposed complete production roadmap; Phase 00 inventory is VERIFIED. Phase 40 grants launch readiness only after every required gate is READY and release approval is recorded. Calendar/notifications/community (23/24/26) remain deferred; their exclusion and truthful route treatment must be verified by Phase 36. Any change to launch inclusion requires explicit product approval, dependency/matrix updates and the same security/locale/QA gates; it cannot be used to silently waive incomplete work.

Before Phase 38, retain migration manifest, approved content manifest, artifact ID, backups, restore evidence and rollback compatibility plan. Before Phase 39, identify actual environment/provider mode and authorized test transactions. Before Phase 40, retain reviewer sign-offs, no unresolved launch-blocking defects, monitoring/support owners and incident/recovery runbooks. The infrastructure/deployment phases do not automatically authorize public traffic opening.

## Evidence hygiene

Keep secrets, personal learner data, raw payment payloads and AI conversations out of evidence. Use redacted identifiers and approved disposable accounts. Record unresolved decisions by ID from OPEN-DECISIONS.md. Do not reset shared databases, delete historical purchases or weaken RLS to produce passing checks.
