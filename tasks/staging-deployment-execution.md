# Staging deployment and sprint sign-off

**Status:** Preparing. No hosted staging deployment, DNS change, or sprint sign-off has happened yet.

## Decision boundary

Use a dedicated Vercel project and dedicated Supabase project with synthetic data. Attach only a staging subdomain; keep the apex/production domain and live payment keys untouched. `NEXT_PUBLIC_SITE_URL` must equal the final HTTPS staging origin before building. Do not reset an existing database, push migrations to an unidentified project, or put secrets in Git, CLI output, or issue comments.

## Ordered tasks

### D1 — Identify the exact targets

**Acceptance:** Owner confirms staging hostname, DNS provider, Vercel team/project ownership, Supabase organization/region/project, and whether projects already exist. Record project IDs and hostname here, but never credentials.

**Verification:** Read-only inspection of Vercel/Supabase projects, domain ownership, DNS, and current repository deployment settings.

**Dependencies:** None. **Scope:** Small; no repository code changes.

### D2 — Freeze and verify the candidate

**Acceptance:** One reviewed commit contains Sprints 0–5 repository changes; no secrets or synthetic production content; clean CI quality/database jobs pass on a disposable database.

**Verification:** `npm run typecheck`, `npm run lint`, `npm run test:backend`, `npm run build`, `npm run verify:client-bundle`, and GitHub CI including `npm run test:db` and DB lint. Local long-lived DB failures do not count as clean CI evidence.

**Dependencies:** D1 for target branch strategy. **Scope:** Medium; commit/CI and targeted fixes if checks fail.

**Checkpoint:** Do not migrate or deploy until the target identity and clean CI are verified.

### D3 — Provision isolated Supabase staging

**Acceptance:** Dedicated hosted project, migration history reviewed with `supabase db push --dry-run`, then versioned migrations applied; synthetic seed only if explicitly selected; RLS/storage policies and database types verified. No production/local database reset.

**Verification:** Project ref matches D1; migration list and targeted pgTAP tests; read-only inspection of auth/storage settings.

**Dependencies:** D1–D2. **Scope:** Medium plus owner-managed cloud credentials.

### D4 — Provision isolated Vercel staging and hostname

**Acceptance:** Git-linked Vercel project points to `devMo76/elam-repo`, root directory `/`, Node 22.17.1, staging branch/commit, and only staging Supabase/Moyasar sandbox/Bunny/sender credentials. HTTPS staging hostname resolves to this project; `NEXT_PUBLIC_SITE_URL` equals that origin. A temporary `vercel.app` URL may be used first, but auth/payment callbacks must be updated when the canonical staging hostname changes.

**Verification:** Build/deployment ID, redacted environment-variable name audit, DNS/certificate check, response headers, and client-bundle secret scan. Configure Supabase Auth Site URL and exact callback/reset redirect paths for this hostname. Register staging-only webhook URLs and an authenticated receipt schedule when sandbox services are ready.

**Dependencies:** D1–D3. **Scope:** Medium plus DNS/provider configuration.

**Checkpoint:** Sign-in, confirmation email, and entitled video must work on the HTTPS hostname before payments are tested.

### D5 — Acceptance and sign-off for Sprints 0–5

**Acceptance:** Execute the [release-candidate checks](../docs/operations/release-candidate-checks.md): free/archived/PDF learning, Moyasar sandbox and receipt reconciliation, owner-approved legal/contact pages, headers/rate limits, support/monitoring/backup drill, browser/device/RTL/accessibility matrix, and 10/20/50-user representative measurements. Record evidence, defects, reviewer, and date against each item in [todo.md](todo.md). No item is checked based solely on a passing build or a written checklist.

**Verification:** Hosted browser traces, provider/dashboard records, clean CI, screenshot/device matrix, alert delivery, restore/rollback rehearsal, and signed review.

**Dependencies:** D4 and external provider/legal readiness. **Scope:** Several focused slices.

**Checkpoint:** Sprints 0–5 may be signed only when their respective acceptance evidence exists. Sprint 6 production cutover remains a separate owner-controlled decision.

## Current blockers / inputs

- Exact staging hostname and DNS provider: pending owner response.
- Vercel team/project and Supabase organization/region: pending owner response. Supabase CLI currently shows no `elam-staging` project; this repository is not linked to a hosted project.
- Moyasar sandbox, verified email sender, receipt worker secret, provider webhooks, final Arabic legal/support text, and alert destination: not configured or approved locally.
- Full local pgTAP suite is not a clean-baseline result because the current database contains additional records/settings. Use disposable CI or a separately provisioned database; never reset the active local database to obtain a green check.

## Evidence log

| Date | Item | Result | Evidence |
| --- | --- | --- | --- |
| 2026-10-02 | Repository/hosting inventory | GitHub remote and auth present; no local Vercel link or Supabase project link | Read-only CLI and file checks |
