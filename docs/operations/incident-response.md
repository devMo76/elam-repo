# Incident response

## First actions

1. Record the UTC time, affected environment, commit, and visible symptom.
2. Reduce harm: pause the affected feature or provider webhook if necessary.
3. Find the request ID in the response, then search that ID in Vercel Logs.
4. Check `/api/admin/webhooks?status=failed` for provider failures.
5. Preserve logs and evidence. Never paste secrets or customer payment data.

## Provider failures

- **Supabase:** stop database-changing releases; check connectivity and migration
  history. Do not reset the hosted database.
- **Moyasar:** keep orders pending until a verified provider response arrives.
  Never manually mark an order paid without provider verification.
- **Bunny:** keep lessons unavailable until current video state is verified.
- **Resend:** payment stays successful; use receipt delivery status to retry with
  the existing idempotency key.
- **Vercel:** compare the deployed commit and environment variables, then roll
  back to the last known-good deployment if required.

## Secret exposure

Revoke and rotate the exposed credential at its provider, update Vercel and local
secret storage, redeploy, inspect logs and Git history, and document the incident.
Never place the replacement value in Git, chat, tickets, or logs.

## Close the incident

Confirm recovery with smoke tests, restore normal traffic, document the cause and
timeline, and create follow-up work that prevents the same failure.
