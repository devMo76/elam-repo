# Payment receipt delivery

Payment confirmation and enrollment do not depend on the email provider. When
an order first becomes `paid`, the database trigger
`orders_enqueue_paid_receipt` inserts one row into `payment_receipts` in the
same transaction. The order ID is the outbox primary key, so callback/webhook
replays cannot create duplicate receipt work.

The callback and Moyasar webhook schedule one immediate best-effort delivery
with Next.js `after()`. This work starts after the response is committed. If
the process stops, Resend is unavailable, or the immediate attempt fails, the
outbox row remains retryable.

## Scheduled retry

1. Generate a random secret of at least 32 characters and set
   `PAYMENT_RECEIPT_WORKER_SECRET` in the Railway web service.
2. Create a separate Railway cron service from the same repository. Override
   its build command to `npm ci` so it does not build the web app. Set its
   start command to `npm run jobs:payment-receipts` and its cron schedule to
   `*/5 * * * *` (UTC). It must run once and exit; do not use the web server's
   start command for this service.
3. Set `RECEIPT_WORKER_URL` to the HTTPS origin of the web service and set
   `PAYMENT_RECEIPT_WORKER_SECRET` to the **same value** used by the web service.
   The script sends an authenticated `POST` to `/api/jobs/payment-receipts`.
4. Check a cron execution log for a successful HTTP response and a run summary;
   test a failed attempt and subsequent retry before launch. Keep staging and
   production secrets and cron services separate.

Each run selects at most 25 unsent rows and processes three concurrently. The
database claim function supplies a five-minute lease, while Resend receives the
stable idempotency key `payment-receipt/<order-id>`. A callback, webhook, and
scheduled worker may therefore overlap without intentionally sending multiple
receipts.

The response reports `selected`, `sent`, `failed`, and `skipped`. A `503`
means the queue could not be read and the scheduler should retry normally; a
`401` means its secret does not match the deployed environment.

## Local verification

After applying migrations, run:

```powershell
npm run test:db
npm run test:backend -- lib/payments/receipt.test.ts tests/payments/payment-receipt-worker-route.test.ts
```

For a manual worker run:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:3001/api/jobs/payment-receipts `
  -Headers @{ Authorization = "Bearer $env:PAYMENT_RECEIPT_WORKER_SECRET" }
```

Never expose the worker secret through a `NEXT_PUBLIC_` variable.
