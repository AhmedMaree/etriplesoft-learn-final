# Phase 20 — Kashier Payments

## 1. Status

IN PROGRESS

Evidence (2026-10-15): migration `20261014104103_orders_and_payment_preparation.sql` and the server-only Kashier test-mode adapter, checkout API, status return UI and signed webhook/reconciliation route are present. Hosted DEV rollback checks passed for price/currency binding, idempotent paid enrollment, duplicate events and full-refund access revocation. Local `.env.local` has test-mode checkout enabled and the return URL is `http://127.0.0.1:3010`; the configured public HTTPS webhook URL returned 404 to a harmless POST probe, so provider callback acceptance is blocked until the current route is deployed there. A published paid course is available for verification. The status reconciliation adapter was corrected to validate the bound session and payment against Kashier's documented session APIs; sandbox success/failure/replay and refund remain untested. Production payments remain blocked by D02 and D15.

Evidence (2026-10-18): first completed sandbox payment on the Vercel production deployment (https://etriplesoft-learn-final.vercel.app, Kashier test mode, Hosted DEV database). A QA learner bought Odoo Development with coupon QA10 (EGP 499.00 - 49.90 = 449.10), paid with Kashier's test Visa card and simulated 3-D Secure, returned to the payment step and the server reconciled from `GET /v3/payment/sessions/{id}/payment`: order paid, one payment event, one active paid enrollment. A correctly signed webhook replay returned 200 with no duplicate event or enrollment; a forged signature returned 401. Fixed during this run: `.vercelignore` excluded `src/lib/supabase` (production builds failed), and reconciliation read the public session document (rejected once paid) and a guessed response shape. Kashier rejects local `merchantRedirect` origins and intermittently blocks repeated server lookups from one IP with a 404 security page. Later the same day: a full test-mode refund through Kashier (`PUT https://test-fep.kashier.io/v3/orders/{kashierOrderId}`, `apiOperation: REFUND`) was delivered by Kashier's real signed webhook and settled automatically (order and enrollment `refunded`, access removed). A declined payment (3-D Secure emulator "Not Authenticated") left the order pending with no event or access; signed failure webhooks are now acknowledged with 200 instead of retried. Kashier's hosted page rejects past expiry dates, so the documented expiry-based decline values (for example 05/25) cannot be entered there. The QA learner was banned and coupon QA10 deactivated after testing. Partial refunds remain unsupported by policy (D02).

## 2. Goal

Initialize provider checkout server-side using order snapshots.

## 3. Why This Phase Exists

This phase owns kashier payments. Its verified contract enables [Phase 29](PHASE-29-COMMERCE-ADMINISTRATION.md), [Phase 34](PHASE-34-SECURITY-PRIVACY.md), [Phase 35](PHASE-35-OBSERVABILITY.md) without duplicating domain authority.

## 4. Dependencies

Requires: [Phase 19](PHASE-19-ORDERS-CHECKOUT.md), [Phase 06](PHASE-06-ADMIN-AUTHORIZATION.md)

Blocks: [Phase 29](PHASE-29-COMMERCE-ADMINISTRATION.md), [Phase 34](PHASE-34-SECURITY-PRIVACY.md), [Phase 35](PHASE-35-OBSERVABILITY.md)

Dependencies are mandatory verification gates, not implementation suggestions. Higher-numbered independent branches may run only under the dependency-map rules.

## 5. Current Repository State

See the dated evidence in section 1. Provider requests are fixed to Kashier test endpoints; signed webhooks only trigger reconciliation, which verifies the exact provider session, order reference, merchant, amount, currency, capture and refund state before atomic settlement. Local test settings are present. First deploy the webhook route at the configured HTTPS endpoint; then use [the sandbox checkout runbook](../FINISH-PROJECT-GUIDE.md#kashier-sandbox-checkout-smoke-test) to execute the outstanding provider acceptance.

## 6. In Scope

- Initialize provider checkout server-side using order snapshots
- Verify and deduplicate webhook events and atomically grant paid access
- Support reconciliation and approved refund/access policy

## 7. Out of Scope

Collecting PAN/CVV, subscription billing and unapproved refund variants.

## 8. Product Decisions

APPROVED: follow repository requirements and the accepted domain architecture, not assumptions from demo UI.

APPROVED: D01 (EGP only). OPEN: D02 (refund policy) and Kashier ownership/operations under D15 — see [decision register](OPEN-DECISIONS.md).

## 9. Database Work

payments and payment_webhook_events with provider/reference/event uniqueness, amount/currency checks, order FKs and processing outcomes. Preserve history; refund ledger only if D02 approves it.

## 10. RLS / Authorization

Anonymous: published, non-sensitive exact-locale catalog/verification projections only; otherwise denied. Learner: own data and entitled content only. Instructor: attribution grants no additional permission; separate authoring rights are not approved. Admin: current protected role plus purpose-specific server operation, audited. Service-side: narrowly authorized operations with explicit grants, caller/target validation and no browser secrets. Test direct Data API/RPC access, not only routes. Use this phase’s domain rules above and ../DATABASE-ARCHITECTURE.md. Protected translations require parent publication AND entitlement; catalog translations require publication but not enrollment. Locale selection alone never grants access.

## 11. Backend / Server Work

Signature-verified raw webhook handling, amount/reference/state validation, durable retry/reconciliation and transaction for paid state plus one enrollment/item. Return redirect is display-only.

## 12. Frontend Work

Replace demo card/coupon behavior with approved provider-hosted checkout and server-status return screen.

## 13. English / Arabic

Verify English, Arabic, RTL, mixed LTR identifiers/email/code, Western digits, localized validation and metadata where applicable. Translate UI in messages; domain text uses the phase’s database translation records. Exact-locale content never silently falls back. Replace demo card/coupon behavior with approved provider-hosted checkout and server-status return screen.

## 14. Responsive Requirements

Required: 320, 375, 430, 768, 1024, 1280, 1440 and 1920px in BOTH en/LTR and ar/RTL. Verify actual authorized screen, overflow, wrapping, stacking, artwork, controls, navigation and error states.

## 15. Accessibility

Keyboard access, visible focus, semantic controls/headings, labels and linked errors, justified ARIA, contrast, screen-reader announcements, reduced motion and media alternatives. Review phase-specific controls in section 12.

## 16. Security Requirements

- Forged signature or success redirect never grants enrollment
- User cannot read webhook details or payment secrets
- Refund/admin override is authorized and audited

Never weaken RLS/grants or trust browser claims to satisfy a test. Record residual risks and block verification when mandatory evidence is absent.

## 17. Performance Requirements

Bound list queries and paginate; measure query counts and avoid per-record N+1. Index actual parent/owner/locale access paths. Never share-cache private responses. Measure provider latency where used.

## 18. Implementation Steps

1. Read canonical roadmap, this contract, current diff and relevant project skills; confirm every required predecessor is VERIFIED.
2. Resolve the referenced OPEN decisions that affect this phase; record approval and chosen test expectations before implementation.
3. Review constraints, indexes, FKs/deletion, grants/RLS and transaction boundaries for section 9. Only where this phase owns schema changes, create ordered migrations, add necessary DEV-only fixtures and regenerate types. Verification/infrastructure phases must not introduce new schema outside their stated scope.
4. Initialize provider checkout server-side using order snapshots
5. Verify and deduplicate webhook events and atomically grant paid access
6. Support reconciliation and approved refund/access policy
7. Add the phase-specific automated and negative cases below; replace only fixtures owned by this phase.
8. Run verification, inspect the scoped diff and collect evidence; update phase/roadmap/matrices together and stop.

## 19. Automated Verification

- Provider sandbox success/failure/cancel/pending and delayed webhook
- Duplicate/out-of-order/replayed events create one grant
- Amount mismatch, crash/retry and confirmed refund reconcile correct access

Implementation baseline: `npm run typecheck`, `npm run lint`, `npm run build`; UI behavior: `npm test -- tests/learning.spec.ts` plus new targeted cases. These commands exist today; future cases described here do not yet exist. No standalone unit-test script exists: add focused cases using the agreed repository test approach, and document the exact command when added.

Database/RLS: extend `supabase/tests/database/foundation_rls.sql` or new domain SQL suites and run `npm run db:test` in disposable local/CI Supabase. Extend `scripts/validate-hosted-rls.mjs` or a domain validator for hosted DEV and run the documented command; today `npm run db:test:hosted` covers identity only, so it cannot certify a new domain. Verify DEV target and supply credentials securely before any mutating test. Both policy behavior and constraint/transaction coverage are mandatory; environment unavailability is a blocker, not a pass.

## 20. Manual Verification

- [ ] Manually exercise and inspect: Provider sandbox success/failure/cancel/pending and delayed webhook.
- [ ] Manually exercise and inspect: Duplicate/out-of-order/replayed events create one grant.
- [ ] Manually exercise and inspect: Amount mismatch, crash/retry and confirmed refund reconcile correct access.
- [ ] Review success, empty, invalid, loading and failure states as the intended role in EN/AR.
- [ ] Verify all eight widths, keyboard/focus and mixed technical values.

## 21. Security Verification

- [ ] Forged signature or success redirect never grants enrollment
- [ ] User cannot read webhook details or payment secrets
- [ ] Refund/admin override is authorized and audited

## 22. Data Verification

payments and payment_webhook_events with provider/reference/event uniqueness, amount/currency checks, order FKs and processing outcomes. Preserve history; refund ledger only if D02 approves it.

Verify uniqueness, parent/owner relationships, ordering, exact-locale translations, deletion/history preservation, idempotency and generated-type alignment using actual inserted/read rows. Exercise rollback on an invalid multi-record write.

## 23. Acceptance Criteria

- [ ] Initialize provider checkout server-side using order snapshots
- [ ] Verify and deduplicate webhook events and atomically grant paid access
- [ ] Support reconciliation and approved refund/access policy
- [ ] Every required predecessor is VERIFIED and blocking decisions are resolved.
- [ ] Phase-specific automated and negative cases pass with retained evidence.
- [ ] Manual checks pass; documentation and status tables match.
- [ ] English and Arabic, accessibility, approved visual parity and all eight widths pass.
- [ ] Typecheck, lint, relevant tests and production build pass for implementation changes.

## 24. Evidence Required

Record date, operator, commit plus dirty diff/artifact hash, environment, exact commands, exit codes and test counts. Attach phase-specific results from sections 19–22; for UI attach EN/AR screenshots at all eight widths and manual reviewer sign-off. For data attach migration IDs, generated-type comparison and anonymous/owner/cross-user/admin/RPC/storage results. For providers attach redacted sandbox/production receipts, replay/recovery outcomes and configuration evidence. Never include credentials or real learner PII.

## 25. Rollback / Recovery

Pause checkout and event processing safely; retain durable receipts. Reconcile provider state before replaying verified events idempotently. Never delete payment/enrollment history or infer success from a redirect.

## 26. Documentation Updates

Update this phase, ../PROJECT-ROADMAP.md, VERIFICATION-MATRIX.md, OPEN-DECISIONS.md and PRODUCTION-READINESS.md. Update ../ARCHITECTURE.md, ../ROUTES.md, ../I18N.md, ../DATABASE-ARCHITECTURE.md, ../SECURITY.md or ../QA-CHECKLIST.md only where behavior/contracts changed. Preserve unrelated user edits.

## 27. Completion Gate

PHASE IMPLEMENTED:
PARTIAL

AUTOMATED VERIFICATION:
PARTIAL — Kashier contract checks 9/9 and Hosted DEV commerce rollback validator passed; typecheck, lint and production build passed. No sandbox transaction has been run.

MANUAL VERIFICATION:
NOT RUN — sandbox credentials and reachable HTTPS webhook are still needed.

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

Recommended sequential candidate: [Phase 21](PHASE-21-LEARNING-PATHS.md). Start only after all of that phase’s dependencies are VERIFIED and the user authorizes that phase; do not start automatically.
