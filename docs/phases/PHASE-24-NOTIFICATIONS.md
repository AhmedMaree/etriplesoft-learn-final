# Phase 24 — Notifications Scope & Integration

## 1. Status

PLANNED

Evidence: learner-header.tsx shows a static progress popover/dot. learner_preferences stores toggles but there is no delivery service or notification table.

## 2. Goal

Maintain DEFERRED V1 disposition pending D05.

## 3. Why This Phase Exists

This phase owns notifications scope & integration. Its verified contract enables None. without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 22](PHASE-22-LEARNER-DASHBOARD.md)

Blocks: None.

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

learner-header.tsx shows a static progress popover/dot. learner_preferences stores toggles but there is no delivery service or notification table.

## 6. In Scope

- Maintain DEFERRED V1 disposition pending D05
- If approved, implement owner inbox/read state and required domain events
- Respect stored preferences and avoid duplicate notifications

## 7. Out of Scope

Marketing automation and email campaigns.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

OPEN / DEFERRED: D05 — see [decision register](OPEN-DECISIONS.md).

Scope disposition: **DEFERRED**. This is not an eighth phase status. Activation requires explicit product approval and dependency/gate updates; do not build the backend now.

## 9. Database Work

Deferred. If approved: notifications with owner/event deduplication, source FKs, created/read state and owner/date index; channels/retention require policy.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. No new database permissions in this phase; preserve existing boundaries.

## 11. Backend / Server Work

No implementation while deferred. If activated, create notifications from trusted events; email delivery only separately approved.

## 12. Frontend Work

Header popover/unread count and preferences; distinguish preference storage from delivery availability.

## 13. English / Arabic

Verify English, Arabic, RTL, mixed LTR identifiers/email/code, Western digits, localized validation and metadata where applicable. Translate UI in messages; domain text uses the phase’s database translation records. Exact-locale content never silently falls back. Header popover/unread count and preferences; distinguish preference storage from delivery availability.

## 14. Responsive Requirements

Required: 320, 375, 430, 768, 1024, 1280, 1440 and 1920px in BOTH en/LTR and ar/RTL. Verify actual authorized screen, overflow, wrapping, stacking, artwork, controls, navigation and error states.

## 15. Accessibility

Keyboard access, visible focus, semantic controls/headings, labels and linked errors, justified ARIA, contrast, screen-reader announcements, reduced motion and media alternatives. Review phase-specific controls in section 12.

## 16. Security Requirements

- A cannot read or mark B notification
- Forged source event cannot notify another learner

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Avoid unnecessary client bundles, network calls or full dataset rendering. For documentation-only work this is not applicable.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Maintain DEFERRED V1 disposition pending D05
4. If approved, implement owner inbox/read state and required domain events
5. Respect stored preferences and avoid duplicate notifications
6. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
7. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- Test deduplication, read/unread reload and preference suppression
- Test empty inbox and localized event messages
- If excluded, verify no fake unread activity ships

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

## 20. Manual Verification

- [ ] Manually exercise and inspect: Test deduplication, read/unread reload and preference suppression.
- [ ] Manually exercise and inspect: Test empty inbox and localized event messages.
- [ ] Manually exercise and inspect: If excluded, verify no fake unread activity ships.
- [ ] Review success, empty, invalid, loading and failure states as the intended role in EN/AR.
- [ ] Verify all eight widths, keyboard/focus and mixed technical values.

## 21. Security Verification

- [ ] A cannot read or mark B notification
- [ ] Forged source event cannot notify another learner

## 22. Data Verification

Not applicable to new schema. Verify displayed/imported data or configuration against its authoritative source; no fabricated success evidence.

## 23. Acceptance Criteria

- [ ] Maintain DEFERRED V1 disposition pending D05
- [ ] If approved, implement owner inbox/read state and required domain events
- [ ] Respect stored preferences and avoid duplicate notifications
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

Recommended sequential candidate: [Phase 25](PHASE-25-AI-ASSISTANT.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.
