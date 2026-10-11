# Phase 02 — Design System & Responsive Foundation

## 1. Status

VERIFICATION REQUIRED

Started 2026-10-08. Phase 01 is VERIFIED. Anonymous EN/AR capture coverage has been added; authenticated evidence is unavailable (user confirmed no disposable storage-state session). D09 remains OPEN. This phase is not verified and does not authorize Phase 03.

Evidence: src/styles.css, src/refinements.css and src/components/ui/ preserve existing design. ../DESIGN-SYSTEM.md points to ../../DESIGN.md. QA records overflow checks but explicitly lack complete reference screenshot comparison.

## 2. Goal

Capture approved reference comparisons for existing shared primitives and shell.

## 3. Why This Phase Exists

This phase owns design system & responsive foundation. Its verified contract enables [Phase 03](PHASE-03-I18N-RTL-FOUNDATION.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 01](PHASE-01-NEXTJS-ARCHITECTURE.md)

Blocks: [Phase 03](PHASE-03-I18N-RTL-FOUNDATION.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

src/styles.css, src/refinements.css and src/components/ui/ preserve existing design. ../DESIGN-SYSTEM.md points to ../../DESIGN.md. QA records overflow checks but explicitly lack complete reference screenshot comparison.

## 6. In Scope

- Capture approved reference comparisons for existing shared primitives and shell
- Verify authenticated and anonymous shell variants
- Document tokens and resolve only confirmed regressions

## 7. Out of Scope

Rebranding, asset replacement or subjective redesign.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

OPEN / DEFERRED: D09 — see [decision register](OPEN-DECISIONS.md).

## 9. Database Work

Not applicable.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. No new database permissions in this phase; preserve existing boundaries.

## 11. Backend / Server Work

Retain server-rendered composition; review hydration only where needed.

## 12. Frontend Work

Shared UI, shell, forms and approved assets.

## 13. English / Arabic

Verify English, Arabic, RTL, mixed LTR identifiers/email/code, Western digits, localized validation and metadata where applicable. Translate UI in messages; domain text uses the phase’s database translation records. Exact-locale content never silently falls back. Shared UI, shell, forms and approved assets.

## 14. Responsive Requirements

Required: 320, 375, 430, 768, 1024, 1280, 1440 and 1920px in BOTH en/LTR and ar/RTL. Verify actual authorized screen, overflow, wrapping, stacking, artwork, controls, navigation and error states.

## 15. Accessibility

Keyboard access, visible focus, semantic controls/headings, labels and linked errors, justified ARIA, contrast, screen-reader announcements, reduced motion and media alternatives. Review phase-specific controls in section 12.

## 16. Security Requirements

- Verify sign-out removes private shell data
- Ensure sample screenshots use disposable identities

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Avoid unnecessary client bundles, network calls or full dataset rendering. For documentation-only work this is not applicable.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Capture approved reference comparisons for existing shared primitives and shell
4. Verify authenticated and anonymous shell variants
5. Document tokens and resolve only confirmed regressions
6. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
7. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- Run existing Playwright route/overflow suite
- Capture EN/AR screenshots at all eight widths with authenticated screens actually visible
- Check focus, touch targets, reduced motion and broken assets

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

## 20. Manual Verification

- [ ] Manually exercise and inspect: Run existing Playwright route/overflow suite.
- [ ] Manually exercise and inspect: Capture EN/AR screenshots at all eight widths with authenticated screens actually visible.
- [ ] Manually exercise and inspect: Check focus, touch targets, reduced motion and broken assets.
- [ ] Review success, empty, invalid, loading and failure states as the intended role in EN/AR.
- [ ] Verify all eight widths, keyboard/focus and mixed technical values.

## 21. Security Verification

- [ ] Verify sign-out removes private shell data
- [ ] Ensure sample screenshots use disposable identities

## 22. Data Verification

Not applicable to new schema. Verify displayed/imported data or configuration against its authoritative source; no fabricated success evidence.

## 23. Acceptance Criteria

- [ ] Capture approved reference comparisons for existing shared primitives and shell
- [ ] Verify authenticated and anonymous shell variants
- [ ] Document tokens and resolve only confirmed regressions
- [ ] Every required predecessor is VERIFIED and blocking decisions are resolved.
- [ ] Phase-specific automated and negative cases pass with retained evidence.
- [ ] Manual checks pass; documentation and status tables match.
- [ ] English and Arabic, accessibility, approved visual parity and all eight widths pass.
- [ ] Typecheck, lint, relevant tests and production build pass for implementation changes.

## 24. Evidence Required

### 2026-10-08 execution checkpoint

Final `npm.cmd test -- tests/design-foundation.spec.ts --output=tmp/phase-02-captures`: PASS, exit 0, 16 passed in 47.0s, 32 screenshots retained. Final test-file typecheck and targeted ESLint also pass. No console-error/page-error assertions failed on these two anonymous surfaces; framework image-performance warnings remain.

Targeted retry `npm.cmd test -- tests/learning.spec.ts -g 'all localized routes' --output=tmp/phase-02-route-recheck`: PASS, 1 test, all 30 localized URLs × eight widths. The initial server JSON failure did not recur. This suite permits protected-route redirects and does not prove authenticated rendering; its assertions also do not reject server-only missing-message logs. The auth callback failure remains unresolved.

Evidence snapshot: tracked dirty-diff SHA-256 `E93FE1F0D4E2D3B26AB07CF345930EFB3FD1B816A1A45E7EF563C06ECCAB4B31` (stored as `tmp/phase-02-captures/worktree.diff`, before this final documentation note); new test SHA-256 `B296262A5FF96502907B9B01A774950BA78411A8C5C66FFF8ED692C5BD37871F`. The tracked diff does not include untracked phase documents or the new test; capture manifest hashes bind the local image artifacts separately.

Operator: Codex. Windows PowerShell, Next.js 16.3.8, Playwright Chromium, local development origin on port 3010. HEAD `d710c94a600783db3af6cb8f1d6a1df8248245da` plus the pre-existing dirty worktree. Existing auth, onboarding, message, stylesheet, database and documentation changes were preserved. No application implementation, credentials or database state were changed by this phase.

- `npm.cmd run typecheck`: PASS, exit 0.
- `npm.cmd run lint`: PASS, exit 0.
- `npm.cmd run build`: PASS, exit 0.
- `npm.cmd test -- tests/learning.spec.ts`: 13 passed, 2 failed, exit 1. The route sweep encountered a server `Unexpected end of JSON input` error at signup; the auth callback failed its trusted-origin configuration check (Phase 05). Server logs also show a missing `common.messages` translation. These failures must not be reported as a complete responsive pass.
- Added `tests/design-foundation.spec.ts`: 16 parameterized cases for EN/AR × eight widths, each visiting catalog and signup. Checks actual URLs, direction, horizontal overflow, visible image loading, first keyboard focus on signup, LTR email values, page errors and console errors. Captures run with reduced-motion preference; this does not prove every animation respects that preference. No snapshot is automatically approved.
- Local screenshot artifacts: `tmp/phase-02-captures/`. These ignored files are reproducible with the command in section 19; archive them before clearing tmp. Screenshot hashes are recorded in `tmp/phase-02-captures/manifest.json` after the final run.

Visual sampling compared the root `courses.png` reference with the current desktop catalog and inspected Arabic signup at 320px. This is not full reference sign-off: typography/density and artwork differences already documented in DESIGN.md remain, anonymous identity differs intentionally, and the desktop main region scrolls independently. Arabic signup hero text contains literal question marks; inspection confirmed question-mark strings in `messages/ar.json`. English footer punctuation shows mojibake. These content defects and the missing message key need reconciliation during locale work before visual approval; do not infer that a font replacement repairs source text.

Remaining mandatory evidence: disposable authenticated shell/screens and sign-out privacy check; actual Arabic glyph font identification and D09 design/Arabic reviewer approval; full manual comparison of all captures, touch-target/contrast checks, drawer and all form state review. No authenticated or Arabic typography sign-off is claimed. The user confirmed an authenticated storage-state file is not available. Initial capture-harness attempts were corrected for lazy images and scroll position; only the final run is acceptance evidence.

### 2026-10-08 content-defect fix

Repaired the defects recorded below: 76 Arabic strings in `messages/ar.json` that held literal `?` characters were retranslated from the English source (needs native-reader review, part of D09); footer/certificate/course-detail mojibake (`â€œ`, `Â©`, `Â·`) restored to `“ ” © ·`; missing `common.messages` key added to EN/AR. After the fix: typecheck PASS, lint PASS, `tests/design-foundation.spec.ts` 16/16 PASS, `tests/learning.spec.ts` 14 passed / 1 failed (auth callback origin, Phase 05). Authenticated evidence and Arabic typography/D09 sign-off remain outstanding; status stays VERIFICATION REQUIRED.

### 2026-10-08 accepted with limits (user decision)

The user authorized proceeding to Phase 03 with Phase 02 accepted with limits. This is a documented waiver, not VERIFIED: authenticated shell/sign-out evidence, D09 Arabic font/reviewer sign-off, native review of the retranslated Arabic strings and full reference comparison are carried forward (Phases 03, 05, 32). Gate values above are unchanged.

Record date, operator, commit plus dirty diff/artifact hash, environment, exact commands, exit codes and test counts. Attach phase-specific results from sections 19–22; for UI attach EN/AR screenshots at all eight widths and manual reviewer sign-off. For data attach migration IDs, generated-type comparison and anonymous/owner/cross-user/admin/RPC/storage results. For providers attach redacted sandbox/production receipts, replay/recovery outcomes and configuration evidence. Never include credentials or real learner PII.

## 25. Rollback / Recovery

Disable the affected entry point, preserve records and evidence, and revert only the reviewed application change. Use a forward corrective migration for persisted data; never reset a shared database.

## 26. Documentation Updates

Update this phase, ../PROJECT-ROADMAP.md, VERIFICATION-MATRIX.md, OPEN-DECISIONS.md and PRODUCTION-READINESS.md. Update ../ARCHITECTURE.md, ../ROUTES.md, ../I18N.md, ../DATABASE-ARCHITECTURE.md, ../SECURITY.md or ../QA-CHECKLIST.md only where behavior/contracts changed. Preserve unrelated user edits.

## 27. Completion Gate

PHASE IMPLEMENTED:
YES

AUTOMATED VERIFICATION:
FAIL

MANUAL VERIFICATION:
FAIL

SECURITY VERIFICATION:
FAIL

EN/AR VERIFICATION:
FAIL

READY TO MARK VERIFIED:
NO

READY FOR NEXT PHASE:
NO

Security FAIL means mandatory authenticated evidence is absent. Automated FAIL records the broader-suite failures despite the passing focused suite. Manual/EN-AR FAIL records observed corrupted copy and incomplete visual/typography approval. See section 24 for the precise evidence limits.

## 28. Next Phase

Recommended sequential candidate: [Phase 03](PHASE-03-I18N-RTL-FOUNDATION.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.
