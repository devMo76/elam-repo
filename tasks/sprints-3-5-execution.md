# Sprints 3–5 execution record

**Started:** 2026-10-02. **Status:** In progress; no sprint checkpoint accepted yet.

This extends [plan.md](plan.md) and [todo.md](todo.md) without closing their outstanding Sprint 0–2 gates. The approved launch scope is paid, cards first, PDF capability with optional per-lesson attachments, and the existing roles. No live charging is authorized by this work.

## Read-only baseline and dependencies

- Payment confirmation already verifies Moyasar server-side and records status/enrolment via `process_verified_moyasar_payment`; the browser callback alone does not grant access. Callback/webhook and receipt tests exist.
- Receipt outbox and authenticated POST worker exist, but no sender key/address or retry-worker secret is configured locally. No hosted staging link or live sandbox evidence is present.
- The learner dashboard shows a one-time payment return notice but no persistent purchase/receipt history or recovery action.
- Footer terms/privacy/contact are placeholders. Owner-approved Arabic legal copy, merchant identity, support contact, invoice treatment, and refund promise are not in the repository; do not invent or publish these.
- `next.config.ts` has no security headers or CSP. Proxy refreshes auth, and Supabase RLS protects business data. High-cost/auth endpoints have no application-wide distributed abuse control yet.
- Performance instrumentation exists, but no production-like 10/20/50-user baseline, device matrix, or end-to-end browser suite exists. A local measurement is not staging capacity evidence.

## Ordered vertical slices

1. **3.3 Purchase visibility/recovery:** authenticated learner-only list of own orders and receipt state; safe retry of an existing provider payment without creating another order/charge. Test IDOR, pending, paid, provider outage, and duplicate retry.
2. **3.2 Receipt scheduler preparation:** retain current durable outbox; prepare host-compatible authenticated schedule and operator/runbook checks. Configure external sender/scheduler only when credentials and hosted staging exist.
3. **4.2 Security headers:** add a compatible CSP and other response headers; test actual Bunny/Moyasar/auth flows before enforcing strict directives. Audit secret, RLS, MFA, and preview boundaries.
4. **4.2 Abuse control:** add a shared, bounded backend limit for auth/checkout/recovery and test denial/concurrency. Do not rely on process memory for a multi-instance deployment.
5. **5.1 Browser journeys:** add repeatable browser test harness and synthetic-account flow coverage; run against isolated staging after Sprint 1 is accepted. Never automate live charges.
6. **5.2 Device/accessibility:** capture viewport, keyboard, screen-reader, RTL, reduced-motion, and failure-state findings; fix source-backed issues and retest. Human device sign-off remains separate.
7. **5.3 Capacity:** add a bounded read-only load harness, then run 10/20/50 users against representative isolated staging content with documented region, timing, costs, and provider stubs. Do not fire paid/auth writes at scale.

Checkpoint after slices 1–2: purchase state and receipt paths are role-safe; unit/DB checks pass. Checkpoint after slices 3–4: headers and abuse controls pass allowed/denied cases. Checkpoint after slices 5–7: staging journeys, device matrix, and agreed traffic thresholds pass. Each checkpoint requires evidence in this file and the tracker.

## External gates

| Gate | Needed for | Current evidence |
| --- | --- | --- |
| Dedicated hosted staging URL/database | Sprints 3–5 acceptance | Not linked locally |
| Moyasar sandbox key/webhook and test cards | 3.1/3.3 real transactions | Local secret/webhook values absent |
| Verified SMTP/Resend sender and worker secret | 3.2 receipt delivery | Local values absent |
| Approved legal/support/merchant/invoice text | 4.1 publishing | Not supplied |
| Alert destination, backup/restore owner, devices | 4.3/5.2 | Not supplied |

## Evidence and open risks

### Implemented repository work (2026-10-02)

- **3.3:** Learner dashboard lists the latest 20 owned orders, receipt delivery state, and entitlement. Pending/paid-without-access orders can recheck the *existing* provider payment; the callback retains its payment ID through sign-in and pending returns. Recheck validates the user and server-side provider confirmation; it does not initiate another charge.
- **3.2 preparation:** The receipt worker accepts authenticated GET as well as POST, matching hosted cron behavior. [Receipt operations](../docs/operations/payment-receipts.md) documents the secret and schedule constraints. Actual sender/scheduler configuration and delivery remain open.
- **4.2:** Enforced baseline CSP plus report-only full policy and other security headers. Database-backed, atomic, hashed-key rate limits cover sign-in, registration, password reset/confirmation resend, checkout, and payment recheck. Migration `202610020004_api_rate_limits.sql` was applied locally without reset and generated types updated. Bucket cleanup is an operational task; the broader CSP requires staging provider traces before enforcement.
- **5.3 preparation:** Added bounded, read-only `scripts/measure-read-only.mjs` and [release-candidate checks](../docs/operations/release-candidate-checks.md). This is not a substitute for authenticated 10/20/50-user staging load or Web Vitals.

### Verification

- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass (Next.js 16.3.3).
- Production build served locally: `HEAD /auth/sign-in` returned 200 and the enforced/report-only CSP, X-Frame-Options, nosniff, referrer, and permissions headers. This does not validate Bunny/3-D Secure compatibility.
- `npm run test:backend`: 62 files / 260 tests pass.
- `supabase test db --local supabase/tests/database/api_rate_limits_test.sql`: 6/6 pass.
- Full `npm run test:db`: **fails on the existing long-lived local database**, whose extra courses/users/enrolments and modified settings violate fixed seed-count assertions; 24 files, 358 tests, with multiple failures. No reset was performed. A clean disposable database and full suite are required before checkpoint acceptance.

### Not yet accepted

3.1 provider sandbox matrix; 3.2 real receipt delivery/scheduler; 3.4 production method setup; 4.1 owner-approved legal/support copy; 4.2 full CSP and MFA/preview/security review; 4.3 monitoring/restore/rollback rehearsal; 5.1 browser journey automation and staging runs; 5.2 device/accessibility matrix; 5.3 production-like authenticated load and thresholds. The staging URL, provider/sender credentials, alert destination, and approved legal material are not available locally. Existing local database diverges from the deterministic pgTAP seed; do not reset it without explicit approval. Long-running or externally charged tests require isolated staging and account-owner coordination.
