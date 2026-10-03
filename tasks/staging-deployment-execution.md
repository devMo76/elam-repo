# Staging deployment and sprint sign-off

**Status:** Hosting target changed to Railway. Earlier Vercel previews and clean CI are historical evidence; Railway staging configuration, DNS, and sprint sign-off remain open.

## Decision boundary

Use a dedicated Railway staging service and dedicated Supabase project with synthetic data. Attach only a staging subdomain; keep the apex/production domain and live payment keys untouched. `NEXT_PUBLIC_SITE_URL` must equal the final HTTPS staging origin before building. Do not reset an existing database, push migrations to an unidentified project, or put secrets in Git, CLI output, or issue comments.

## Ordered tasks

### D1 — Identify the exact targets

**Acceptance:** Owner confirms staging hostname, DNS provider, Railway workspace/project ownership, Supabase organization/region/project, and whether projects already exist. Record project IDs and hostname here, but never credentials.

**Verification:** Read-only inspection of Railway/Supabase projects, domain ownership, DNS, and current repository deployment settings.

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

### D4 — Provision isolated Railway staging and hostname

**Acceptance:** Connect Railway to `devMo76/elam-repo`; confirm root directory `/`, Node 22.17.1, approved staging branch/commit, build command `npm run build`, start command `npm run start:railway`, and only staging Supabase/Moyasar sandbox/Bunny/sender credentials. HTTPS staging hostname resolves to the web service; `NEXT_PUBLIC_SITE_URL` equals that origin. A temporary Railway URL may be used first, but auth/payment callbacks must be updated when the canonical staging hostname changes. Add an isolated Railway receipt cron service using the same commit, build command `npm ci`, start command `npm run jobs:payment-receipts`, and a five-minute UTC schedule.

**Verification:** Build/deployment ID, redacted environment-variable name audit, DNS/certificate check, response headers, and client-bundle secret scan. Configure Supabase Auth Site URL and exact callback/reset redirect paths for this hostname. Register staging-only webhook URLs and an authenticated receipt schedule when sandbox services are ready.

**Dependencies:** D1–D3. **Scope:** Medium plus DNS/provider configuration.

**Checkpoint:** Sign-in, confirmation email, and entitled video must work on the HTTPS hostname before payments are tested.

### D5 — Acceptance and sign-off for Sprints 0–5

**Acceptance:** Execute the [release-candidate checks](../docs/operations/release-candidate-checks.md): free/archived/PDF learning, Moyasar sandbox and receipt reconciliation, owner-approved legal/contact pages, headers/rate limits, support/monitoring/backup drill, browser/device/RTL/accessibility matrix, and 10/20/50-user representative measurements. Record evidence, defects, reviewer, and date against each item in [todo.md](todo.md). No item is checked based solely on a passing build or a written checklist.

**Verification:** Hosted browser traces, provider/dashboard records, clean CI, screenshot/device matrix, alert delivery, restore/rollback rehearsal, and signed review.

**Dependencies:** D4 and external provider/legal readiness. **Scope:** Several focused slices.

**Checkpoint:** Sprints 0–5 may be signed only when their respective acceptance evidence exists. Sprint 6 production cutover remains a separate owner-controlled decision.

## Current blockers / inputs

- Staging hostname is `test.elamedu.com`; DNS is managed in Netlify. The TXT ownership record now verifies in Railway, but the CNAME is absent and TLS is not ready. Railway's web service has no Git source or deployment yet. Do not point DNS to it until the app is healthy.
- Railway MCP is connected. The isolated Railway project `elam-staging` (`4ad5665e-0562-4aa6-8052-57be6fa9c037`), environment `staging` (`7fe7c6b0-664c-44de-8921-e15dd50b6728`), and web service `elam-web` (`531132dd-9089-4bce-b4aa-eec06d078557`) exist. The older Vercel `elam-staging` integration remains linked to GitHub but is not the chosen host. The new Supabase staging project `elam-staging` (`dnizkyfkltyfibgrftwf`) is in organization `mobile store mock` (`dwvqhbuzpbpzelyxdxxo`), region `eu-central-1` (Frankfurt). The local CLI is linked to this project via ignored `supabase/.temp` state; verify the ref before every remote database command.
- A security review rejected automatically transferring Supabase API keys to Railway; the owner instead entered them manually. On 2026-10-03, Railway shows `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as **live** service variables. Values were not read or validated. `NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY` is still missing and the current app's build-time environment validation requires a sandbox `pk_test_…` value. Do not copy local `.env.local` values. The generated database password was cleared from the temporary shell; the owner must place a new/reset password in their secret manager before future remote migration work.
- Moyasar sandbox, verified email sender, receipt worker secret, provider webhooks, final Arabic legal/support text, and alert destination: not configured or approved locally.
- Full local pgTAP suite is not a clean-baseline result because the current database contains additional records/settings. Use disposable CI or a separately provisioned database; never reset the active local database to obtain a green check.

## Evidence log

| Date | Item | Result | Evidence |
| --- | --- | --- | --- |
| 2026-10-02 | Repository/hosting inventory | GitHub remote and auth present; no local Vercel link or Supabase project link | Read-only CLI and file checks |
| 2026-10-02 | Candidate `b54811b` | Pushed `feat/staging-readiness`; protected Vercel preview succeeded at `https://elam-staging-gyi0sfked-devmo76.vercel.app` | GitHub deployment 6811405876; direct request returned Vercel SSO redirect |
| 2026-10-02 | Clean CI run 37023937273 | Database job passed; quality job failed only at dependency audit (Next.js critical, brace-expansion high) | [GitHub Actions run](https://github.com/devMo76/elam-repo/actions/runs/37023937273) |
| 2026-10-02 | Dependency remediation | Updated Next.js and matching ESLint config to 16.3.8; `npm audit fix` addressed transitive issue. Local audit zero vulnerabilities; typecheck, lint, 260 tests, and build pass | Local checks; clean CI rerun below |
| 2026-10-02 | Patched candidate `fa3e0ce` | Pushed branch; protected Vercel preview deployed at `https://elam-staging-qy1ztxty4-devmo76.vercel.app`. Existing Vercel Production deployment remains on `ee440c2`; no main merge or domain change | GitHub deployment 6813618041 |
| 2026-10-02 | Clean CI rerun | **Both quality and database jobs passed**, including dependency audit, clean seed/pgTAP, DB lint, and generated types | [GitHub Actions run](https://github.com/devMo76/elam-repo/actions/runs/37036787131) |
| 2026-10-02 | Railway repository preparation | Added dynamic-port web start and short-lived authenticated receipt cron command; updated staging/receipt/release runbooks. Local typecheck, lint, 260 existing tests, 2 new cron tests, production build, and 66-file client-bundle scan passed. Railway hosting and provider acceptance remain untested. | Local commands and `tests/payments/payment-receipt-job.test.ts` |
| 2026-10-02 | Railway project creation | Created private `elam-staging` project `4ad5665e-0562-4aa6-8052-57be6fa9c037` with `staging` environment `7fe7c6b0-664c-44de-8921-e15dd50b6728`; read-only status confirmed no services, domains, or staged changes | Railway project creation and environment status |
| 2026-10-02 | Staging hostname preparation | Created empty `elam-web` service `531132dd-9089-4bce-b4aa-eec06d078557`; configured Railpack, build `npm run build`, start `npm run start:railway`, and `NEXT_PUBLIC_SITE_URL=https://test.elamedu.com`. Attached `test.elamedu.com` on Railway; ownership and TLS await Netlify DNS. No source, deployment, or Netlify DNS change. | Railway service and domain status |
| 2026-10-02 | Supabase staging database | Created `dnizkyfkltyfibgrftwf` in `mobile store mock`, Frankfurt. Applied 29 migrations after a dry run; a second dry run reported `upToDate: true`. No seed data was pushed. Temporary database password cleared. | Supabase CLI project creation and `db push` output |
| 2026-10-02 | Credential boundary | Attempt to transfer the new project's API keys into Railway was rejected by security review. Stopped without retry; confirmed Railway web service still has only `NEXT_PUBLIC_SITE_URL`, no deployment. | Railway service variable-name inspection |
| 2026-10-03 | Manual Supabase variable entry | Owner entered the three Supabase variables on `elam-web`. Read-only Railway inspection confirms names are staged in a non-destructive patch; live variables still contain only `NEXT_PUBLIC_SITE_URL`. Key values were not inspected or transferred by the agent. TXT domain ownership is verified; CNAME and app deployment remain pending. | Railway service config, staged-change review, and domain status |
| 2026-10-03 | Supabase variables applied; source preflight | Owner deployed the three variables. Read-only Railway inspection confirms all three names are live; values were not inspected. No Git source or deployment yet. Local typecheck, lint, 262 tests, production build, and 66-file bundle scan pass. Moyasar sandbox publishable key is the remaining build-time variable. | Railway service status and local release checks |

## Netlify DNS handoff for `test.elamedu.com`

These are the current records returned by Railway for the `elam-web` service. Add the TXT verification record in Netlify DNS when ready. Add the CNAME only after the web deployment is healthy, or expect the unused staging hostname to return an error until then. Do not change the apex (`elamedu.com`), `www`, nameservers, email, or existing Netlify site records.

| Type | Netlify host label | Full name | Value |
| --- | --- | --- | --- |
| CNAME | `test` | `test.elamedu.com` | `d5m46wpp.up.railway.app` |
| TXT | `_railway-verify.test` | `_railway-verify.test.elamedu.com` | `railway-verify=4e145a956c538bae652b5e93d6c87a51ecf0d3146eb8cbd43cbdba16b99b8099` |

After both records propagate, verify Railway ownership, certificate status, HTTPS response, sign-in redirects, and the isolated staging data before calling the hostname ready.
