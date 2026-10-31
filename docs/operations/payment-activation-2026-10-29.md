# Payment activation execution

Date: 2026-10-29, Asia/Riyadh. Continues Sprint 3/6, not paid-launch sign-off.
Owner authorized configuration and acceptance preparation, not a live charge or
refund. Preserve existing orders and unrelated authentication/UI work.

## Preflight evidence

- Production web configuration contains payment/email names; public and secret
  key formats are live, receipt-worker secret is 32+ characters. Staging key
  formats were explicitly checked as pk_test_ and sk_test_. Values not displayed.
- Production has one order and one published paid course. Status/charge success
  was not inferred. Unsent receipt count was zero before scheduler activation.
- Staging has zero orders, one published paid course and zero unsent receipts.
  An initial staging order-count HEAD returned 502; subsequent retry returned
  200/count 0. No reset, data copy or seed performed.
- Unauthenticated production receipt-job and Moyasar-webhook POST requests returned
  401 with the expected safe error codes. The initial staging unauthenticated
  check could not parse its response before worker configuration; retest pending.
- Owner confirmed production Moyasar webhook saved at
  https://elamedu.com/api/webhooks/moyasar, POST, payment events, matching secret.
  This is owner configuration evidence, not proof of delivery or payment success.
- Owner asked to confirm a separate test-mode webhook at
  https://test.elamedu.com/api/webhooks/moyasar with staging's separate secret.

## Receipt jobs

Both jobs use the existing deployed script on a0faa23, without new application
code, local dirty files or the pending cross-device auth fix. No web healthcheck,
public domain or volume; NEVER restart; Netherlands region; cron */5 * * * *.
Build command: node --check scripts/trigger-payment-receipts.mjs.
Start command: node scripts/trigger-payment-receipts.mjs.
The process is a finite authenticated HTTP trigger, not a Next.js web server.

Only two application variables are needed per worker:

- RECEIPT_WORKER_URL: corresponding canonical production/staging origin.
- PAYMENT_RECEIPT_WORKER_SECRET: Railway reference to the same environment's
  elam-web variable. No payment API, email API or database credential copied.

Production: project baede4ab-86e4-4560-a85b-0434931dc36d,
environment f3efd40b-0f07-4d9d-aeeb-794981802394,
job payment-receipts fa740315-fe39-4174-bea6-10f4c135ff0f.
Initial deployment 5b8ff7b1-01eb-4f9e-99aa-617c2cb7239a, production branch.

Staging: project 4ad5665e-0562-4aa6-8052-57be6fa9c037,
environment 7fe7c6b0-664c-44de-8921-e15dd50b6728,
job payment-receipts d34a8766-d5b1-4e0e-9f94-9d0ad95910cd,
feat/staging-readiness branch. A new staging-only 32-byte random worker secret
was generated in memory and set over CLI stdin, not printed/written to disk.
The existing production secret was not rotated. Staging web configuration
redeployment 21022633-4c1b-4eda-b4ea-9a3b1e136ba4 uses unchanged a0faa23.

## Acceptance still required

- Successful authenticated empty-queue job run in both environments, finite
  process exit and scheduler config/reference isolation verified.
- Separate test webhook saved and a real sandbox event delivered successfully.
- Sandbox purchase success, decline, cancellation/interrupted return, delayed
  confirmation/recheck and duplicate notification handling.
- Exactly one order/enrolment, correct amount/currency, delivered receipt and
  retry recovery. A zero-item job alone does not prove email delivery.
- Cross-user order/access denial; provider failure/replay tests only in staging.
- Owner merchant/methods/legal readiness and separately approved live purchase
  and refund with reconciliation before paid-launch sign-off.

Focused local payment/receipt tests: 44 passed in 13 files. Existing hosted source
CI remains the release evidence; no application code was changed by job setup.

### Worker verification results

Both initial worker deployments succeeded; staging worker deployment is
2afc4a77-ec70-45a4-8595-b1ccafbe43d8. Staging web configuration deployment
21022633-4c1b-4eda-b4ea-9a3b1e136ba4 also succeeded on unchanged a0faa23.
Rendered worker references were compared privately with the corresponding web
secrets and canonical URLs; both matched. No raw values printed or persisted.
Immediately rechecked each unsent queue as empty, then executed the existing
worker script locally against its configured hosted endpoint: both exited 0 with
selected=0, sent=0, failed=0, skipped=0. This verifies actual endpoint authentication
and the finite script, not yet Railway's timer execution or email delivery.
Production/staging unauthorized job/webhook requests returned 401; staging home
returned 200 after redeployment. Production web was not redeployed.
Timer-run log verification remains pending at this checkpoint.

### Timer and webhook configuration checkpoints completed

Owner also confirmed the separate TEST webhook saved. Actual webhook delivery
and merchant acceptance are still pending a transaction, not inferred.
Railway timer logs at 2026-10-29 22:50 Asia/Riyadh show both workers starting and
emitting structured selected=0, sent=0, failed=0, skipped=0 summaries. The logging
API stores these JSON fields in attributes, not the empty message string; inspect
those attributes rather than treating the log as missing. This confirms actual
scheduled authenticated empty-queue execution, not merely a local trigger.
No live charge, refund, test order, receipt delivery or synthetic data created.

## Owner sandbox test

After the test webhook is saved and staging is healthy, register/verify a dedicated
learner on test.elamedu.com (old PKCE flow still needs the same browser until its
separate fix is deployed). Select the published paid course. Use only Moyasar's
official sandbox card instruments. Start with one successful purchase, then check
the library/course access, admin order, test provider payment, webhook delivery
and receipt inbox. Record the timestamp and redacted result; never share card
details, credentials, full confirmation links or signed media links. Do not reuse
an already-enrolled learner for the decline case. Never put sandbox cards into
elamedu.com, whose keys are live.

## Operations and rollback

Web service still attempts immediate receipt delivery. The cron recovers pending
outbox items and does not create payments or grant access itself. Cron activation
allows future legitimate pending receipts to be delivered automatically.
Review queue growth/provider failure summaries; don't label a failed/503 job as
successful merely because it was scheduled. If emergency isolation is needed,
disable/pause the receipt job in Railway; do not remove payment records, rotate
provider keys, or disable webhooks as a workaround. Staging/prod schedules and
credentials must remain separate. Keep Netlify www redirect until migrated.

References: [Railway cron jobs](https://docs.railway.com/cron-jobs),
[Moyasar webhooks](https://docs.moyasar.com/guides/dashboard/setting-up-webhooks),
[Moyasar sandbox cards](https://docs.moyasar.com/guides/card-payments/test-cards).
