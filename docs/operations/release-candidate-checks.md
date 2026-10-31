# Sprints 3–5 release-candidate checks

This is an execution sheet, not evidence that hosted staging has passed. Use a dedicated staging URL/database and synthetic accounts; do not run payment or destructive tests against production.

## Commerce (Sprint 3)

1. Configure Moyasar sandbox secret, webhook secret, publishable key, and callback/webhook URLs in staging. Use the provider's published sandbox test instruments only.
2. With a new learner, buy a paid course; compare provider payment ID, one order, one enrolment, and one receipt outbox row. Repeat the callback and webhook; counts must remain one.
3. Exercise rejected, delayed, and provider-unavailable responses. The dashboard must show the order and offer a *recheck of the existing payment*, never create a second charge. A different learner must receive 404/403 for another learner's order.
4. Configure a verified email sender and a random receipt-worker secret. Schedule the separate Railway cron service to run `npm run jobs:payment-receipts` every five minutes with the same secret as the web service. Confirm sent, failed/retry, and support recovery from a real mailbox.
5. Reconcile a provider refund/reversal with order, entitlement, and receipt handling. Record the support action and timing. No live transaction is authorized by this sheet.

## Trust/recovery (Sprint 4)

- Obtain approved Arabic terms, privacy, refund, merchant identity, support contact, invoice treatment, and instructor compensation terms from the owner. Publish them before paid launch; the current footer placeholders are not acceptable.
- Check actual response headers on all app routes. Baseline CSP is enforced; the broader CSP is **report-only** because issuer/3-D Secure and Bunny origins require staging traces. Narrow it and enforce after the full auth/video/payment flow passes. Confirm no checkout, 3-D Secure, playback, or email verification regression.
- Confirm 429 on repeated sign-in/register/reset/resend/checkout/recheck, 503 fail-closed when the shared database limiter is unavailable, and no shared-IP false positives at the expected launch traffic. On Railway, verify the trusted client-IP forwarding behavior and reject spoofed headers before relying on IP-based limits. Schedule `select public.prune_api_rate_limits()` with service-role access at least daily, or add it to a secured maintenance job.
- Audit admin MFA/provider configuration, service-role and webhook secrets, preview protection, Supabase RLS, storage policy, webhook replay, and instructor/admin role separation. Do not expose keys in screenshots or logs.
- Connect retained error tracking plus uptime, failed payment confirmation, receipt backlog, video playback, and cost alerts. Assign an on-call owner; test an alert and acknowledgement.
- Rehearse staging database backup/restore and Railway deployment rollback; record restore point, elapsed time, data loss, and the incident owner. Do not reset the active local or production database.

## Release candidate (Sprint 5)

Automate signed-up learner confirmation return, free enrolment, paid sandbox purchase, lesson playback/progress/PDF, instructor submission, admin review, and cross-role denial in a disposable staging dataset. Save screenshots/traces for failures. No browser suite or staging run is yet signed off.

Manual matrix: iOS Safari, Android Chrome, desktop Chrome/Firefox/Safari; 360px/768px/desktop; Arabic RTL; keyboard-only focus order and visible focus; screen-reader labels/status messages; reduced motion; slow network, provider outage, expired link, and retry. Record tester, device/OS/browser, date, issue, fix, and retest. A code inspection alone is not WCAG certification.

For bounded read-only HTTP latency, set `MEASURE_BASE_URL` to isolated staging and run `node scripts/measure-read-only.mjs`. It samples 10, 20, and 50 concurrent GET requests across public catalogue and sign-in pages, reporting p50/p95/max/errors. Run from a documented region, repeat at least three times, and correlate with DB/provider metrics, Web Vitals, hosting limits, and costs. It does **not** emulate 50 authenticated learners or payment writes. Agree pass thresholds with the owner before declaring capacity ready.
