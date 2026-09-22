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
   `PAYMENT_RECEIPT_WORKER_SECRET` in the deployed server environment.
2. Configure the deployment scheduler to send `POST` to
   `/api/jobs/payment-receipts` every five minutes.
3. Send the secret as `Authorization: Bearer <secret>`.

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
