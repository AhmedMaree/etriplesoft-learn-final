# Phase execution guide

Read [the master roadmap](../PROJECT-ROADMAP.md), this guide, then the selected phase before work. This is the canonical future implementation sequence. Repository policy and approved architecture/design remain authoritative. These documents authorize planning only; executing any phase requires a separate task request.

## Status definitions

- **NOT STARTED**: No meaningful implementation exists.
- **PLANNED**: Scope and design exist but production implementation has not started; demo UI alone is not domain implementation.
- **IN PROGRESS**: Implementation exists but is incomplete.
- **BLOCKED**: Cannot proceed because a dependency or product decision is unresolved.
- **IMPLEMENTED**: Code exists but final verification has not completed.
- **VERIFICATION REQUIRED**: Implementation appears complete but required validation evidence is missing.
- **VERIFIED**: All acceptance criteria and mandatory verification gates passed. Only this status means finished.

Future work is PLANNED because this roadmap now supplies its scope. Do not mark every future phase BLOCKED merely because its predecessors have not run. Change an actively selected phase to BLOCKED when it cannot proceed, naming the specific dependency/decision. Existing code can be IN PROGRESS or VERIFICATION REQUIRED even when its new canonical dependencies are not yet VERIFIED; this is historical reconciliation, not permission to continue dependent work.

Scope disposition is separate: APPROVED / OPEN / DEFERRED belongs to product decisions. DEFERRED is never a phase status. Calendar, notifications and community/messages remain excluded from implementation until approved. Their existing demos do not make them production features. Their launch route treatment must still be approved and verified by Phase 36. If activated, update downstream dependency sets and required launch gates before implementation.

## Execution rules

1. Work on one primary phase at a time unless the dependency map explicitly marks work parallelizable.
2. Do not begin a dependent phase while its required predecessor is not VERIFIED.
3. IMPLEMENTED is not COMPLETE.
4. A phase becomes complete only when status = VERIFIED.
5. Never weaken security/RLS to make tests pass.
6. Never bypass failed tests.
7. Never change approved design unless the phase explicitly requires design work.
8. Database changes must use migrations.
9. After DB migrations regenerate database types.
10. No service-role key in browser code.
11. Every user-facing feature must be checked in English and Arabic.
12. Every UI phase must include responsive verification.
13. Every security-sensitive phase must include negative tests.
14. Update the roadmap immediately when a phase changes status.
15. Record evidence instead of relying on memory.
16. Do not start the next phase automatically after finishing one.

Read directly applicable skills before implementation: nextjs-architecture for structural changes; i18n-rtl and visual-parity for existing frontend; responsive-qa at verification; code-quality for scoped maintainability review; lms-database-architecture, supabase-security and security-review for data/access work. Read installed Next.js guides before Next.js code. Do not load unrelated skills or redesign approved UI. No agents or simultaneous work are authorized just because this roadmap identifies parallelizable tracks.

## Evidence and gate semantics

Record date, environment, operator, revision plus dirty-diff hash, exact commands/results, screenshots and residual issues. Historical QA records are useful partial evidence, not automatic sign-off for this new phase contract. Prefer links to durable redacted artifacts; never commit secrets or identifiable learner test data. Revalidate affected gates when later changes invalidate their evidence.

The completion-gate vocabulary is fixed by the planning request. Security/EN/AR have no NOT RUN choice: use FAIL for an applicable but unproven gate, and explicitly say it is evidence missing, not an observed failed test. Use NOT APPLICABLE only with a real scope reason. A dependent phase also needs all its other predecessors VERIFIED before it may start. READY FOR NEXT PHASE is not execution authorization.

No test execution, live database probing or provider mutation was required to certify this documentation inventory. Phase 00 therefore does not certify application health. Phase 01 is the next runtime verification task.

## Required handoff

Use the following after each future phase. Do not convert NOT RUN to PASS. If the report format requires PASS/FAIL, an unexecuted mandatory gate is FAIL with its reason recorded under Tests/Manual QA.

```markdown
# Phase XX Final Report

## Status
<one allowed status>

## Work Completed
<within this phase only>

## Files Changed
<scoped list>

## Database Changes
<migration IDs/types or none>

## Security / RLS
<authority and negative cases>

## EN / AR
<locale evidence>

## Tests
<commands, environment, results, failures/not run>

## Manual QA
<reviewer, widths, states, evidence>

## Known Issues
<unresolved findings>

## Deferred Items
<decision IDs and approved exclusions>

## Evidence
<durable redacted artifact links>

## Gate

PHASE IMPLEMENTED:
YES / NO

AUTOMATED VERIFICATION:
PASS / FAIL

MANUAL VERIFICATION:
PASS / FAIL

SECURITY VERIFICATION:
PASS / FAIL / N/A

EN/AR:
PASS / FAIL / N/A

PHASE VERIFIED:
YES / NO

READY FOR NEXT PHASE:
YES / NO

NEXT PHASE:
<phase>

Do not start the next phase.
```

## Navigation

- [Dependency map](DEPENDENCY-MAP.md)
- [Verification matrix](VERIFICATION-MATRIX.md)
- [Open decisions](OPEN-DECISIONS.md)
- [Production readiness](PRODUCTION-READINESS.md)
- [Phase template](PHASE-TEMPLATE.md)

- [Phase 00](PHASE-00-PROJECT-BASELINE.md) — Repository Baseline & Audit
- [Phase 01](PHASE-01-NEXTJS-ARCHITECTURE.md) — Next.js Application Architecture
- [Phase 02](PHASE-02-DESIGN-RESPONSIVE-FOUNDATION.md) — Design System & Responsive Foundation
- [Phase 03](PHASE-03-I18N-RTL-FOUNDATION.md) — English / Arabic / RTL Foundation
- [Phase 04](PHASE-04-SUPABASE-FOUNDATION.md) — Supabase Database Foundation
- [Phase 05](PHASE-05-AUTH-PROFILES-ONBOARDING.md) — Authentication / Profiles / Learner Onboarding
- [Phase 06](PHASE-06-ADMIN-AUTHORIZATION.md) — Admin Authorization & Audit Foundation
- [Phase 07](PHASE-07-COURSE-DOMAIN.md) — Course Domain
- [Phase 08](PHASE-08-CURRICULUM-DOMAIN.md) — Curriculum & Resources Domain
- [Phase 09](PHASE-09-COURSE-CONTENT-INTEGRATION.md) — Course Catalog & Content Integration
- [Phase 10](PHASE-10-ENROLLMENT-ENTITLEMENTS.md) — Enrollment & Entitlements
- [Phase 11](PHASE-11-MUX-VIDEO.md) — Protected Video / Mux Infrastructure
- [Phase 12](PHASE-12-LEARNING-PLAYER.md) — Learning Player
- [Phase 13](PHASE-13-PROGRESS-TRACKING.md) — Progress Tracking
- [Phase 14](PHASE-14-ASSESSMENT-DOMAIN.md) — Assessment Domain
- [Phase 15](PHASE-15-ASSESSMENT-ATTEMPTS.md) — Assessment Attempts & Server Grading
- [Phase 16](PHASE-16-ASSESSMENT-UI.md) — Assessment UI Integration
- [Phase 17](PHASE-17-COURSE-COMPLETION.md) — Course Completion
- [Phase 18](PHASE-18-CERTIFICATES.md) — Certificates
- [Phase 19](PHASE-19-ORDERS-CHECKOUT.md) — Orders & Checkout Domain
- [Phase 20](PHASE-20-KASHIER-PAYMENTS.md) — Kashier Payments
- [Phase 21](PHASE-21-LEARNING-PATHS.md) — Learning Paths
- [Phase 22](PHASE-22-LEARNER-DASHBOARD.md) — Real Learner Dashboard
- [Phase 23](PHASE-23-CALENDAR.md) — Calendar Scope & Integration
- [Phase 24](PHASE-24-NOTIFICATIONS.md) — Notifications Scope & Integration
- [Phase 25](PHASE-25-AI-ASSISTANT.md) — AI Learning Assistant
- [Phase 26](PHASE-26-COMMUNITY-MESSAGES.md) — Community / Messages Disposition
- [Phase 27](PHASE-27-COURSE-ADMINISTRATION.md) — Course & Content Administration
- [Phase 28](PHASE-28-LEARNER-ADMINISTRATION.md) — Learner / Enrollment Administration
- [Phase 29](PHASE-29-COMMERCE-ADMINISTRATION.md) — Commerce Administration
- [Phase 30](PHASE-30-SEO-METADATA.md) — SEO / Metadata / Public Discoverability
- [Phase 31](PHASE-31-ACCESSIBILITY.md) — Accessibility Audit
- [Phase 32](PHASE-32-RESPONSIVE-VISUAL-QA.md) — Responsive & Visual QA
- [Phase 33](PHASE-33-PERFORMANCE.md) — Performance Optimization
- [Phase 34](PHASE-34-SECURITY-PRIVACY.md) — Security / Privacy / Legal Hardening
- [Phase 35](PHASE-35-OBSERVABILITY.md) — Observability / Error Monitoring / Analytics
- [Phase 36](PHASE-36-CONTENT-TRANSLATION-AUDIT.md) — Content & Translation Audit
- [Phase 37](PHASE-37-PRODUCTION-INFRASTRUCTURE.md) — Production Infrastructure
- [Phase 38](PHASE-38-PRODUCTION-DEPLOYMENT.md) — Production Migration / Deployment
- [Phase 39](PHASE-39-FINAL-E2E-QA.md) — Final End-to-End Production QA
- [Phase 40](PHASE-40-LAUNCH-READINESS.md) — Launch Readiness & Handoff
