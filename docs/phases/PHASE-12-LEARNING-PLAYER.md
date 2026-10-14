# Phase 12 — Learning Player

## 1. Status

IN PROGRESS

2026-10-14 implementation: the existing lesson route/player is connected to renewable signed playback, enrollment-gated resources, previous/next/module links, saved resume, explicit missing-locale states and autoplay-next preference. Seven focused browser/message tests pass, including actual signed playback and private PDF bytes, resource substitution denial, administrator grants, and 48 EN/AR captures across all eight widths. Typecheck/build pass. Fresh provider expiry/revoke during actual playback and manual content/caption/visual acceptance remain unverified. Scope was explicitly authorized together with enrollment/Mux/progress by the current user request; no prerequisite is silently marked VERIFIED. See [operator guide](../COURSE-VIDEO-GUIDE.md).

Evidence: src/features/learning/components/learning-widgets.tsx contains progress/path display fixtures, not a lesson player. No lesson route exists.

## 2. Goal

Build lesson/module navigation with authorized body/video/resources.

## 3. Why This Phase Exists

This phase owns learning player. Its verified contract enables [Phase 13](PHASE-13-PROGRESS-TRACKING.md), [Phase 16](PHASE-16-ASSESSMENT-UI.md), [Phase 25](PHASE-25-AI-ASSISTANT.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 03](PHASE-03-I18N-RTL-FOUNDATION.md), [Phase 09](PHASE-09-COURSE-CONTENT-INTEGRATION.md), [Phase 10](PHASE-10-ENROLLMENT-ENTITLEMENTS.md), [Phase 11](PHASE-11-MUX-VIDEO.md)

Blocks: [Phase 13](PHASE-13-PROGRESS-TRACKING.md), [Phase 16](PHASE-16-ASSESSMENT-UI.md), [Phase 25](PHASE-25-AI-ASSISTANT.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

src/features/learning/components/learning-widgets.tsx contains progress/path display fixtures, not a lesson player. No lesson route exists.

## 6. In Scope

- Build lesson/module navigation with authorized body/video/resources
- Support course/lesson deep links and missing/error/loading states
- Respect autoplay preferences and accessible media controls

## 7. Out of Scope

Scoring, certificates and browser-authoritative completion.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

OPEN / DEFERRED: D13 and remaining D15 Kashier/OpenAI/production operating decisions — see [decision register](OPEN-DECISIONS.md). Mux-specific Phase 11 policy is approved.

## 9. Database Work

No new persistence; consume curriculum and entitlement models. Durable resume belongs to Phase 13.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. Use this phase’s domain rules above and ../DATABASE-ARCHITECTURE.md. Protected translations require parent publication AND entitlement; catalog translations require publication but not enrollment. Locale selection alone never grants access.

## 11. Backend / Server Work

Server lesson loader authorizes each request; playback/resource endpoints recheck access. Document proposed lesson URL and validated return links.

## 12. Frontend Work

New course lesson route and focused player UI using approved tokens and shell.

## 13. English / Arabic

Verify English, Arabic, RTL, mixed LTR identifiers/email/code, Western digits, localized validation and metadata where applicable. Translate UI in messages; domain text uses the phase’s database translation records. Exact-locale content never silently falls back. New course lesson route and focused player UI using approved tokens and shell.

## 14. Responsive Requirements

Required: 320, 375, 430, 768, 1024, 1280, 1440 and 1920px in BOTH en/LTR and ar/RTL. Verify actual authorized screen, overflow, wrapping, stacking, artwork, controls, navigation and error states.

## 15. Accessibility

Keyboard access, visible focus, semantic controls/headings, labels and linked errors, justified ARIA, contrast, screen-reader announcements, reduced motion and media alternatives. Review phase-specific controls in section 12.

## 16. Security Requirements

- Direct deep link cannot bypass entitlement
- Resource ID from another lesson/course is rejected
- Client navigation cannot load unpublished translations

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Bound list queries and paginate; measure query counts and avoid per-record N+1. Index actual parent/owner/locale access paths. Never share-cache private responses. Measure provider latency where used.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Review constraints, indexes, FKs/deletion, grants/RLS and transaction boundaries for section 9. Only where this phase owns schema changes, create ordered migrations, add necessary DEV-only fixtures and regenerate types. Verification/infrastructure phases must not introduce new schema outside their stated scope.
4. Build lesson/module navigation with authorized body/video/resources
5. Support course/lesson deep links and missing/error/loading states
6. Respect autoplay preferences and accessible media controls
7. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
8. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- Test deep link, previous/next, end-of-module, article/video/resource lesson types
- Test expiry during playback, missing asset and revoked course
- Keyboard/caption controls and EN/AR all-width checks

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

Database/RLS: extend `supabase/tests/database/foundation_rls.sql` or new domain SQL suites and run `npm run db:test` in disposable local/CI Supabase. Extend `scripts/validate-hosted-rls.mjs` or a domain validator for hosted DEV and run the documented command; today `npm run db:test:hosted` covers identity only, so it cannot certify a new domain. Verify DEV target and supply credentials securely before any mutating test. Both policy behavior and constraint/transaction coverage are mandatory; environment unavailability is a blocker, not a pass.

## 20. Manual Verification

- [ ] Manually exercise and inspect: Test deep link, previous/next, end-of-module, article/video/resource lesson types.
- [ ] Manually exercise and inspect: Test expiry during playback, missing asset and revoked course.
- [ ] Manually exercise and inspect: Keyboard/caption controls and EN/AR all-width checks.
- [ ] Review success, empty, invalid, loading and failure states as the intended role in EN/AR.
- [ ] Verify all eight widths, keyboard/focus and mixed technical values.

## 21. Security Verification

- [ ] Direct deep link cannot bypass entitlement
- [ ] Resource ID from another lesson/course is rejected
- [ ] Client navigation cannot load unpublished translations

## 22. Data Verification

No new persistence; consume curriculum and entitlement models. Durable resume belongs to Phase 13.

Verify uniqueness, parent/owner relationships, ordering, exact-locale translations, deletion/history preservation, idempotency and generated-type alignment using actual inserted/read rows. Exercise rollback on an invalid multi-record write.

## 23. Acceptance Criteria

- [ ] Build lesson/module navigation with authorized body/video/resources
- [ ] Support course/lesson deep links and missing/error/loading states
- [ ] Respect autoplay preferences and accessible media controls
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
PARTIAL — player/resources/video-progress integration implemented; remaining acceptance is explicit above

AUTOMATED VERIFICATION:
PARTIAL — focused browser/locale/DB suites pass; full provider failure/recovery matrix remains open

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

Recommended sequential candidate: [Phase 13](PHASE-13-PROGRESS-TRACKING.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.
