# Staging load testing

Load tests target only localhost, preview, or staging. Start small and watch
Vercel and Supabase before increasing traffic.

## First safe test

In PowerShell:

```powershell
$env:LOAD_TEST_TARGET_URL="https://elam-staging.vercel.app"
$env:LOAD_TEST_CONFIRM="STAGING_ONLY"
$env:LOAD_TEST_SCENARIO="home"
$env:LOAD_TEST_CONCURRENCY="5"
$env:LOAD_TEST_DURATION_SECONDS="15"
npm run test:load
```

Increase in separate runs: 5, 25, 100, then 500 users. Stop if errors increase,
p95 exceeds 1500 ms, or Vercel/Supabase reports resource pressure.

Protected scenarios require `LOAD_TEST_SESSION_COOKIE` in the local terminal.
Never paste that cookie into Git, chat, screenshots, or logs. Playback additionally
requires `LOAD_TEST_LESSON_ID`; admin summary requires an admin session.

Checkout and progress create data. They remain blocked unless
`LOAD_TEST_ALLOW_WRITES=YES_I_ACCEPT_TEST_DATA` is explicitly set. Use only
synthetic accounts and disposable staging records for those scenarios.

The command fails when fewer than 99% of requests succeed or p95 response time
is above 1500 ms. Review status counts, Vercel Logs, Supabase metrics, and request
IDs after every run.
