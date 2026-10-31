# Staging authentication and purchase fixes

Date: 2026-10-05

## Verification redirect

The confirmation email correctly points to the hosted Supabase verification
endpoint and requests `https://test.elamedu.com/auth/callback`. After a
successful PKCE exchange, the application previously built its redirect from
`request.nextUrl.origin`. Behind Railway this could be the internal listening
address, producing `https://0.0.0.0:8080/account?auth=verified`.

Both success and failure redirects now use `NEXT_PUBLIC_SITE_URL`. Safe local
destination paths are still enforced. The Railway variable must remain
`https://test.elamedu.com`; no SMTP or template modification is required for
this defect. Never record verification tokens, codes, or full email links.

## Learner purchase history and recovery

The dashboard and order recheck previously selected `moyasar_payment_id` with
an authenticated database client, despite the column being excluded from that
role's SELECT grant. This caused purchase history to fail during server render.

The server now verifies the signed-in identity and scopes service-role reads
to that user's orders. The authenticated database grant remains unchanged.
Payment rechecks still verify provider results and order ownership before
granting access.

## Validation and staging acceptance

The focused authentication, purchase-history, and payment-recheck suites pass
all 15 tests, including internal Railway origins, failed verification, user
mismatches, and unauthenticated recheck requests.
The full project typecheck and lint also pass.

After deployment:

1. Request a fresh confirmation email from the staging site and open it in
   the same browser used to register (PKCE requires that browser's verifier).
2. Confirm the final address stays on `test.elamedu.com` and the account page
   recognizes the signed-in user. If an earlier link already verified the
   account, sign in normally rather than reusing the consumed link.
3. Visit `/dashboard` as a learner and confirm the purchase history renders,
   including an account with no purchases.
4. For a pending sandbox purchase with a provider reference, recheck its
   status and confirm the verified payment can grant access.

Deployment status is tracked in Railway for `elam-web`, staging environment,
branch `feat/staging-readiness`. This file does not constitute payment sandbox
acceptance or production launch sign-off.
