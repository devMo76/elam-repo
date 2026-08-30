# Server-only and secret-handling rules

## Public configuration

Only variables explicitly named with the `NEXT_PUBLIC_` prefix may be included
in browser code. The approved public variables are:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

The Supabase anon key is public by design. Row-Level Security must still restrict
every operation performed with it.

## Server-only configuration

The following variables must never reach Client Components, props, browser
bundles, URLs, analytics, or logs:

- `SUPABASE_SERVICE_ROLE_KEY`
- `MOYASAR_SECRET_KEY`
- `MOYASAR_WEBHOOK_SECRET`
- `VIDEO_API_KEY`
- `VIDEO_TOKEN_SIGNING_KEY`
- `EMAIL_API_KEY`

## Import boundaries

1. Every module that reads a server-only variable or creates a privileged client
   starts with `import "server-only";`.
2. The Supabase service-role client is created in exactly one module:
   `lib/supabase/admin.ts`.
3. Client Components must not import server-only modules, directly or indirectly.
4. Shared contracts must not import environment modules, Supabase clients, or
   external-provider SDKs.
5. A production build is mandatory in CI because Next.js fails the build when a
   Client Component crosses a declared `server-only` boundary.

## Handling rules

1. Store local values in `.env.local`; store staging and production values in the
   deployment platform's encrypted environment settings.
2. Keep local, staging, and production credentials separate.
3. Never commit credential values or copy production data into local or staging.
4. Never log access tokens, cookies, authorization headers, payment credentials,
   webhook secrets, service-role keys, or signed playback credentials.
5. Never send privileged values in component props, URLs, or API responses.
6. Derive the acting user from the verified server session; never trust a user ID
   supplied by a mutating request.
7. Use the service role only where RLS bypass is required. Each new import is a
   security-review event.
8. Rotate a credential immediately if it is committed, logged, or shared through
   an unapproved channel.

## Review checklist

- Does the module require `import "server-only";`?
- Is the service role genuinely required?
- Could an error, log, response, or prop expose privileged data?
- Is caller identity derived from the verified session?
- Do type-checking, linting, tests, and a production build pass?
