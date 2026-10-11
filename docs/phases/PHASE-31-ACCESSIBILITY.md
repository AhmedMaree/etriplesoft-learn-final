# Phase 31 — Accessibility Audit

## 1. Status

PLANNED

Evidence: Semantic controls and signup aria-invalid/describedby exist; no complete screen-reader/keyboard audit artifact is committed. Existing Playwright assertions are not accessibility certification.

## 2. Goal

Audit all included learner/admin routes and interaction states.

## 3. Why This Phase Exists

This phase owns accessibility audit. Its verified contract enables [Phase 32](PHASE-32-RESPONSIVE-VISUAL-QA.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 16](PHASE-16-ASSESSMENT-UI.md), [Phase 22](PHASE-22-LEARNER-DASHBOARD.md), [Phase 25](PHASE-25-AI-ASSISTANT.md), [Phase 27](PHASE-27-COURSE-ADMINISTRATION.md), [Phase 28](PHASE-28-LEARNER-ADMINISTRATION.md), [Phase 29](PHASE-29-COMMERCE-ADMINISTRATION.md)

Blocks: [Phase 32](PHASE-32-RESPONSIVE-VISUAL-QA.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

Semantic controls and signup aria-invalid/describedby exist; no complete screen-reader/keyboard audit artifact is committed. Existing Playwright assertions are not accessibility certification.

## 6. In Scope

- Audit all included learner/admin routes and interaction states
- Fix confirmed semantics/focus/labels/contrast/media accessibility defects
- Record manual screen-reader and keyboard evidence in EN/AR

## 7. Out of Scope

Redesign and declaration of legal compliance without review.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

OPEN / DEFERRED: D24 — see [decision register](OPEN-DECISIONS.md).

## 9. Database Work

Not applicable.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. No new database permissions in this phase; preserve existing boundaries.

## 11. Backend / Server Work

Ensure server errors preserve accessible error context; no access-control changes.

## 12. Frontend Work

All included routes; use WCAG 2.2 AA as proposed audit target subject to D24.

## 13. English / Arabic

Verify English, Arabic, RTL, mixed LTR identifiers/email/code, Western digits, localized validation and metadata where applicable. Translate UI in messages; domain text uses the phase’s database translation records. Exact-locale content never silently falls back. All included routes; use WCAG 2.2 AA as proposed audit target subject to D24.

## 14. Responsive Requirements

Required: 320, 375, 430, 768, 1024, 1280, 1440 and 1920px in BOTH en/LTR and ar/RTL. Verify actual authorized screen, overflow, wrapping, stacking, artwork, controls, navigation and error states.

## 15. Accessibility

Keyboard access, visible focus, semantic controls/headings, labels and linked errors, justified ARIA, contrast, screen-reader announcements, reduced motion and media alternatives. Review phase-specific controls in section 12.

## 16. Security Requirements

- Accessibility fixes must not expose hidden answer keys or private content

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Avoid unnecessary client bundles, network calls or full dataset rendering. For documentation-only work this is not applicable.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Audit all included learner/admin routes and interaction states
4. Fix confirmed semantics/focus/labels/contrast/media accessibility defects
5. Record manual screen-reader and keyboard evidence in EN/AR
6. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
7. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- Automated accessibility checks per route/state plus keyboard flows
- Manual screen reader forms, dialogs, quiz timer, validation and live updates
- Verify captions/transcripts and reduced motion with actual media

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

## 20. Manual Verification

- [ ] Manually exercise and inspect: Automated accessibility checks per route/state plus keyboard flows.
- [ ] Manually exercise and inspect: Manual screen reader forms, dialogs, quiz timer, validation and live updates.
- [ ] Manually exercise and inspect: Verify captions/transcripts and reduced motion with actual media.
- [ ] Review success, empty, invalid, loading and failure states as the intended role in EN/AR.
- [ ] Verify all eight widths, keyboard/focus and mixed technical values.

## 21. Security Verification

- [ ] Accessibility fixes must not expose hidden answer keys or private content

## 22. Data Verification

Not applicable to new schema. Verify displayed/imported data or configuration against its authoritative source; no fabricated success evidence.

## 23. Acceptance Criteria

- [ ] Audit all included learner/admin routes and interaction states
- [ ] Fix confirmed semantics/focus/labels/contrast/media accessibility defects
- [ ] Record manual screen-reader and keyboard evidence in EN/AR
- [ ] Every required predecessor is VERIFIED and blocking decisions are resolved.
- [ ] Phase-specific automated and negative cases pass with retained evidence.
- [ ] Manual checks pass; documentation and status tables match.
- [ ] English and Arabic, accessibility, approved visual parity and all eight widths pass.
- [ ] Typecheck, lint, relevant tests and production build pass for implementation changes.

## 24. Evidence Required

Record date, operator, commit plus dirty diff/artifact hash, environment, exact commands, exit codes and test counts. Attach phase-specific results from sections 19–22; for UI attach EN/AR screenshots at all eight widths and manual reviewer sign-off. For data attach migration IDs, generated-type comparison and anonymous/owner/cross-user/admin/RPC/storage results. For providers attach redacted sandbox/production receipts, replay/recovery outcomes and configuration evidence. Never include credentials or real learner PII.

## 25. Rollback / Recovery

Disable the affected entry point, preserve records and evidence, and revert only the reviewed application change. Use a forward corrective migration for persisted data; never reset a shared database.

## 26. Documentation Updates

Update this phase, ../PROJECT-ROADMAP.md, VERIFICATION-MATRIX.md, OPEN-DECISIONS.md and PRODUCTION-READINESS.md. Update ../ARCHITECTURE.md, ../ROUTES.md, ../I18N.md, ../DATABASE-ARCHITECTURE.md, ../SECURITY.md or ../QA-CHECKLIST.md only where behavior/contracts changed. Preserve unrelated user edits.

## 27. Completion Gate

PHASE IMPLEMENTED:
NO

AUTOMATED VERIFICATION:
NOT RUN

MANUAL VERIFICATION:
NOT RUN

SECURITY VERIFICATION:
FAIL

EN/AR VERIFICATION:
FAIL

READY TO MARK VERIFIED:
NO

READY FOR NEXT PHASE:
NO

FAIL here means the required gate has not been demonstrated; it is not a claim that an executed test failed. The requested gate vocabulary has no NOT RUN value for security/EN/AR. Automated/manual NOT RUN refer to this canonical phase gate, not denial of historical partial checks.

## 28. Next Phase

Recommended sequential candidate: [Phase 32](PHASE-32-RESPONSIVE-VISUAL-QA.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.
