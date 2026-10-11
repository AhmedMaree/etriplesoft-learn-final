# Phase XX — <Name>

## 1. Status

<Exactly one: NOT STARTED / PLANNED / IN PROGRESS / BLOCKED / IMPLEMENTED / VERIFICATION REQUIRED / VERIFIED. Cite current files and dated evidence; do not infer completion from old prose.>

## 2. Goal

<What success means to a learner/operator in plain language.>

## 3. Why This Phase Exists

<Why needed; identify downstream consumers.>

## 4. Dependencies

Requires: <phase links>

Blocks: <inverse dependency links>

## 5. Current Repository State

<Actual files, routes, migrations, types, tests, fixtures and missing evidence.>

## 6. In Scope

<Detailed bounded deliverables.>

## 7. Out of Scope

<Explicit exclusions and deferred scope.>

## 8. Product Decisions

APPROVED: <source>

OPEN: <decision IDs>

DEFERRED: <source; separate from phase status>

## 9. Database Work

<Tables/translations, constraints, keys, indexes, FKs, deletion, migrations and generated types; or Not applicable.>

## 10. RLS / Authorization

Anonymous: <rights>
Learner: <rights>
Instructor: <rights>
Admin: <rights>
Service-side: <narrow operations; never use bypass to hide bad RLS>

## 11. Backend / Server Work

<Server Components, Actions, Handlers, transactions, webhooks/jobs where relevant.>

## 12. Frontend Work

<Affected routes/features/components/forms; loading/empty/error/success states; approved design preserved.>

## 13. English / Arabic

<English, Arabic, RTL, mixed values, localized validation/metadata; translatable domain records.>

## 14. Responsive Requirements

When UI is involved: 320, 375, 430, 768, 1024, 1280, 1440, 1920px in both locales; actual authorized screen and interaction states.

## 15. Accessibility

<Keyboard, focus, semantics, labels, ARIA, contrast, screen reader, reduced motion/media alternatives.>

## 16. Security Requirements

<Specific threats and mitigations including cross-user access, spoofed authority and secrets.>

## 17. Performance Requirements

<Queries, indexes, pagination, cache boundaries, images and N+1 where relevant.>

## 18. Implementation Steps

1. Inspect current code/diff and required VERIFIED predecessors.
2. Resolve blocking decisions.
3. Implement one reviewed substep at a time.
4. Add meaningful tests and run gates.
5. Record evidence/update status and stop.

## 19. Automated Verification

<Exact existing commands plus named required new cases. Distinguish unavailable tools and not-run tests.>

## 20. Manual Verification

- [ ] <Phase-specific human flow, invalid/empty/error states, roles/locales/widths.>

## 21. Security Verification

- [ ] <Phase-specific negative cases; direct API/DB and cross-user bypass attempts.>

## 22. Data Verification

<Records, uniqueness, FKs, ordering, translations, retained history and idempotency; or Not applicable.>

## 23. Acceptance Criteria

- [ ] <Every mandatory behavior, test, locale, security, build and documentation gate.>

## 24. Evidence Required

<Migration/type results, commands/results, screenshots, route list, reviewer/date/revision/environment.>

## 25. Rollback / Recovery

<Reversible rollout, migration forward fix, backup/reconciliation; preserve historical records.>

## 26. Documentation Updates

<Affected canonical docs and phase/matrix/status updates.>

## 27. Completion Gate

PHASE IMPLEMENTED:
YES / NO

AUTOMATED VERIFICATION:
PASS / FAIL / NOT RUN

MANUAL VERIFICATION:
PASS / FAIL / NOT RUN

SECURITY VERIFICATION:
PASS / FAIL / NOT APPLICABLE

EN/AR VERIFICATION:
PASS / FAIL / NOT APPLICABLE

READY TO MARK VERIFIED:
YES / NO

READY FOR NEXT PHASE:
YES / NO

## 28. Next Phase

<Next allowed phase after all dependencies verify; stop and wait for authorization.>
