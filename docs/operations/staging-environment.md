# Staging environment

## Architecture decision

Elam uses all three of these environments:

| Environment | Database | Application hosting | Data |
|---|---|---|---|
| Local | Supabase CLI and Docker | Local Next.js server | Synthetic only |
| Staging | Dedicated Supabase.com project | Dedicated Vercel project | Synthetic only |
| Production | Separate Supabase.com project | Separate Vercel project | Production |

Vercel is selected as the application host because it is the PRD recommendation
and directly supports the fixed Next.js App Router stack. Staging and production
must use separate projects and credentials.

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

## Vercel staging provisioning

An account owner must complete these external steps. GitHub currently deploys previews from an existing Vercel project named `elam-staging`; **inspect and reuse it** rather than creating a duplicate:

1. Verify the existing `elam-staging` project is linked to `devMo76/elam-repo` with repository root `/`, its intended production branch, and Node.js 22.17.1.
2. Keep pull-request previews protected. A preview deployment alone is not the stable staging hostname.
3. Add staging environment values through Vercel's encrypted settings.
4. Use only the staging Supabase project and Moyasar sandbox credentials.
5. Confirm that no server-only variable appears in a client bundle or deployment log.
6. Assign the owner-approved staging subdomain only after checking the project's environment values. Configure Supabase Auth Site URL/redirects and provider callbacks for that exact HTTPS origin.
7. If deployment protection blocks sandbox webhooks, use a provider-compatible automation bypass only for the staging project, keep its secret out of Git, and verify provider signatures independently.

Create a separate Vercel production project later. Production credentials are
held by the client and deployed jointly, as required by the developer brief.

## Promotion rule

The promotion path is always:

1. Apply migrations and seeds locally.
2. Run database and application verification.
3. Merge the reviewed pull request.
4. Apply the approved migrations to staging.
5. Run staging integration tests.
6. Promote the same approved commit and migrations to production later.
