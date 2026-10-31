# Staging environment

## Architecture decision

Elam uses all three of these environments:

| Environment | Database | Application hosting | Data |
|---|---|---|---|
| Local | Supabase CLI and Docker | Local Next.js server | Synthetic only |
| Staging | Dedicated Supabase.com project | Railway staging web service | Synthetic only |
| Production | Separate Supabase.com project | Separate Railway production service/environment | Production |

Railway replaces the former Vercel hosting plan. Keep staging and production
services, Supabase projects, and provider credentials isolated. The old Vercel
GitHub integration remains in place until Railway staging has passed; do not
route the staging domain or live users to it.

## Repository-managed configuration

- `supabase/config.toml` configures local services.
- `supabase/migrations/` is the source of truth for database structure.
- `supabase/seed.sql` contains deterministic synthetic local and staging data.
- `.env.example` documents variable names only.
- Linked-project state under `supabase/.temp/` is never committed.

Database structure must not be created manually in the hosted dashboard. Build
and test a versioned migration locally before applying it to staging.

## Supabase.com staging provisioning

An account owner must complete these external steps:

1. Create a dedicated Supabase project named `elam-staging`.
2. Select the region intended for the application's primary audience.
3. Store the generated database password in the approved secret manager.
4. Record the project reference without committing credentials.
5. Authenticate locally with `npm exec supabase -- login`.
6. Link with `npm exec supabase -- link --project-ref <project-reference>`.
7. Add only synthetic records after Phase 2 migrations and tests pass.

Never run `supabase db reset` against a linked staging or production project.
The repository script `npm run supabase:reset` includes `--local` deliberately.

## Railway staging provisioning

An account owner must connect Railway before these external steps:

1. Create an `elam-staging` Railway project/service from `devMo76/elam-repo`, repository root `/`, on the approved staging commit/branch. Confirm Node.js 22.17.1 from `package.json`.
2. Build with `npm ci` and `npm run build`; start with `npm run start:railway`. Railway supplies `PORT`; the start script binds to `0.0.0.0` and does not hard-code port 3001.
3. Add staging environment values through Railway's service variables before building. Do not import `.env.local`.
4. Use only the staging Supabase project and Moyasar sandbox credentials.
5. Confirm that no server-only variable appears in a client bundle or deployment log.
6. Generate a temporary Railway URL to smoke-test, then add the owner-approved staging subdomain. Add **both** CNAME and TXT records shown by Railway at the DNS provider; confirm HTTPS.
7. Configure Supabase Auth Site URL/redirects and provider callbacks for that exact HTTPS origin.
8. Add a separate Railway cron service from the same repository. Override its build command to `npm ci` (it does not need a Next.js build), set start command `npm run jobs:payment-receipts`, schedule `*/5 * * * *`, and variables `RECEIPT_WORKER_URL=https://<staging-host>` plus the same `PAYMENT_RECEIPT_WORKER_SECRET` as the web service. Verify its run exits and reports a result.

Create an isolated production Railway environment/service later. Production
credentials are held by the owner and deployed jointly, as required by the
developer brief. Railway does not replace Supabase, Bunny, Moyasar, or Resend.

## Promotion rule

The promotion path is always:

1. Apply migrations and seeds locally.
2. Run database and application verification.
3. Provision Railway with staging-only variables, but do not expose a public hostname yet.
4. Apply the approved migrations to the verified staging Supabase project, then deploy the approved commit/branch to Railway.
5. Run staging integration tests.
6. Promote the same approved commit and migrations to isolated production later.

## Staging wiring checklist (fill in without committing secrets)

| System | Setting | Staging value/check |
| --- | --- | --- |
| Railway `elam-staging` | Git repository, root, commit | `devMo76/elam-repo`, `/`, approved candidate SHA |
| Railway web service | Public URL | Exact HTTPS staging hostname, also `NEXT_PUBLIC_SITE_URL` |
| Railway web service | Public Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` from **staging** project |
| Railway web service | Server Supabase | `SUPABASE_SERVICE_ROLE_KEY` from same **staging** project; never `NEXT_PUBLIC_` |
| Railway web service | Payment | `NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY=pk_test_…`, `MOYASAR_SECRET_KEY=sk_test_…`, separate staging webhook secret |
| Railway web service | Video | Bunny library ID, upload/read-only API keys, token key for approved staging media |
| Railway web service | Receipts | `EMAIL_API_KEY`, verified `EMAIL_FROM_ADDRESS`, random `PAYMENT_RECEIPT_WORKER_SECRET` (32+ chars) |
| Railway cron service | Receipt retry | Build `npm ci`; `RECEIPT_WORKER_URL`, matching `PAYMENT_RECEIPT_WORKER_SECRET`; start command exits |
| Supabase Auth | Site URL | Exact HTTPS staging origin |
| Supabase Auth | Redirect allowlist | Staging `/auth/callback` (including `next` query values for confirmation and password reset); the app then navigates to `/auth/reset-password` |
| Moyasar sandbox | Callback/webhook | Staging `/api/payments/callback` and `/api/webhooks/moyasar`; confirm provider's URL format |
| Bunny | Webhook | Staging `/api/webhooks/video`; confirm its verification flow |

Do not copy `.env.local` into Railway: it may target the local database and can contain development credentials. Set and review each hosted value in Railway service variables, then trigger a fresh build because `NEXT_PUBLIC_*` values are embedded in the client bundle. Inspect *names/presence and environment ownership*, not secret values, in deployment records.

Before launch, verify how Railway's edge sets the client IP forwarding headers. The current shared rate limiter reads `x-forwarded-for` outside Vercel; it must not trust an attacker-supplied address. Test with a forged header and fix the trust boundary if Railway does not overwrite it. Start with one web replica; multi-replica caching and signed-in behavior need load tests.

Before pushing migrations, confirm the linked Supabase project ref with the owner and run `supabase db push --dry-run`; then apply only to that staging project. Do not run `supabase db reset --linked`. Keep synthetic seed data out of the eventual production project.
