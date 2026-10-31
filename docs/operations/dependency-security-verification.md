# Dependency security remediation and verification

Started: 2026-10-22. Verification completed where locally available: 2026-10-23.
Owner authorized dependency updates and verification after the
production release audit failed. This task does not authorize deployment, DNS
cutover, live charges or hosted database changes.

## Scope and sequence

- [x] Inspect working-tree changes and installed Next.js upgrade guidance.
- [x] Confirm compatible patched versions using official npm metadata.
- [x] Update Next.js and matching ESLint config from 16.3.8 to 16.4.2.
- [x] Update Vitest and matching coverage provider from 4.1.11 to 4.1.12.
- [x] Refresh affected transitive dependencies within their compatible ranges.
- [x] Verify reproducible clean installation from the updated lockfile.
- [x] Run full and production-only dependency audits; record remaining findings.
- [x] Run typecheck, lint, unit tests/coverage, production build and secret scan.
- [x] Run read-only local production-build HTTP and public browser smoke checks.
- [x] Run local database/type checks and authenticated browser regressions after Docker became available; see the clean-fixture qualification below.
- [x] Review the diff and update production gate documentation with actual results.

Preserve unrelated user changes. Do not use `npm audit fix --force`, disable
lint/security rules, invent dependency versions, or suppress known advisories.
Keep the existing React version where it satisfies the updated Next.js peer range.

## Initial evidence

- Approved old release ce14317: fresh audit returned 1 critical, 8 high and
  3 moderate package findings. Prior CI failed at the audit step, not at build,
  typecheck, lint, unit tests or database checks.
- Next.js advisories list 16.4.1 as patched; registry confirms 16.4.2 supports
  the existing Node 22.17.1 and React 19.2.8 versions.
- `braces` 3.0.3 has no published patched release at inspection time. Matching
  `eslint-config-next` 16.4.2 still uses `@next/eslint-plugin-next` -> `fast-glob`
  -> `micromatch` -> `braces`. Keep any remaining finding visible and the full
  audit gate open; a clean runtime-only audit is not a clean full audit.
- Docker daemon probe failed because the Docker Desktop Linux engine pipe is
  absent. Do not substitute hosted staging/production for local database tests.
- Normal Supabase CLI link remains staging dnizkyfkltyfibgrftwf; any DB tests must
  explicitly use `--local`, not that hosted link.

Sources: [Next.js release](https://github.com/vercel/next.js/releases/tag/v16.4.2),
[critical image advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw),
[critical cache advisory](https://github.com/advisories/GHSA-673q-mjm6-r5xr),
[unpatched braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

## Verification results

### Dependency changes

| Package | Previous | Updated |
| --- | --- | --- |
| next / eslint-config-next / @next/eslint-plugin-next | 16.3.8 | 16.4.2 |
| vitest / @vitest/coverage-v8 | 4.1.11 | 4.1.12 |
| sharp | 0.35.4 | 0.35.5 |
| source-map-js | 1.2.1 | 1.2.2 |
| vite | 8.2.2 | 8.3.5 |

Only package.json and the generated package-lock.json were changed for the
application update. React remains 19.2.8 and Node remains 22.17.1. No application
behavior changes, dependency overrides, forced fixes, or audit suppressions.

The first lockfile resolution with npm 10.9.2 crashed in Arborist's peer resolver
(`edgesOut`). A one-off `npx --yes npm@11.21.1` invocation resolved the lockfile
without `--legacy-peer-deps` or a global npm upgrade. A subsequent ordinary
`npm ci --no-audit --no-fund` on npm 10.9.2 succeeded: 456 packages installed.
Confirmed Linux glibc/musl SWC and Linux sharp/libvips lock entries remain present
for Railway/Linux; local Windows success does not replace a Linux CI run.

### Checks and evidence

| Check | Result |
| --- | --- |
| Clean npm ci | Passed |
| npm audit --omit=dev --audit-level=low | Passed, zero reported vulnerabilities |
| npm audit --audit-level=high | Passed, zero reported vulnerabilities on 2026-10-23 |
| npm run typecheck | Passed |
| npm run lint | Passed, zero warnings |
| npm run test:backend:coverage | Passed, 333 tests across 69 files |
| Coverage thresholds | Passed; measured contract scope: statements/lines/functions 100%, branches 80% |
| npm run build | Passed on Next.js 16.4.2; 44 static pages generated |
| npm run verify:client-bundle | Passed, 66 browser asset files scanned |
| Local production HTTP smoke | Auth pages 200, unknown path 404, security headers and Arabic RTL present |
| Local browser smoke | Three auth forms and three signed-out dashboard redirects passed, no uncaught page errors |
| Database suite | Passed, 436 assertions across 29 files in an isolated clean-fixture database; existing edited local data is not the suite's seed baseline |
| npm run lint:db | Passed, no public-schema errors |
| Generated DB type comparison | Passed, generated local types match checked-in file; file unchanged |
| npm run test:studio:browser | Passed, 12 authenticated tests against the local production build |
| git diff --check | Passed |

Build and local server used process-scoped CI canary values and a loopback
Supabase URL, not hosted or live-payment credentials. The browser checks used
headless Edge at 390x844, visited /auth/sign-in, /auth/register and
/auth/password-reset, checked forms/RTL/no horizontal overflow, then verified
/admin, /studio and /dashboard returned to sign-in with their correct `next`
parameters. No form submission, account creation, email or payment occurred.

The initial HTTP probe assumed a 307 status for every dashboard redirect. These
routes stream an HTTP 200 shell with Next.js's documented redirect meta tag.
Inspection and actual browser navigation confirmed correct redirects; no auth
code change was needed. See installed Next.js redirect function documentation.

### Audit result changed during verification

On 2026-10-22 the patched tree still reported five high-severity package entries
from the single braces advisory chain. On 2026-10-23 the advisory was
[withdrawn by GitHub](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) because it
was judged not practically exploitable. Repeated full and runtime-only audits,
including explicit `--registry=https://registry.npmjs.org --prefer-online`, then
returned zero findings and exit 0. Braces remains 3.0.3 in the dev-only lint chain;
it was not patched, hidden, replaced or manually waived. The original critical
Next.js and other patchable findings were addressed by the dependency upgrades.

### Boundaries and remaining work

Verification ran on the existing working tree, which includes unrelated owner
edits. Those edits were preserved; they were not silently selected for release.
No commit, push, hosted deployment, hosted database operation or DNS change was
performed. The local canary-built artifact is not a production deployment artifact;
production needs a fresh build with its own correct public configuration.

The dependency-audit blocker is cleared for the updated local dependency tree,
not the original ce14317 release. The formerly blocked database/type and Studio
browser checks were completed after Docker became available, as detailed below.
Before promotion, select a deliberate patched commit and verify that exact commit
in CI/staging, including fresh migration replay. Provider/auth/content/DNS/owner
launch gates remain open independently of this local dependency verification.

The earlier clean-source audit export was moved out of backend/supabase/.temp to
tasks/.verification/production-release-code-ce14317 at the outer workspace root
so the app's broad TypeScript include would not scan a second copy of the app.
This is only a retained temporary source artifact, not a deployed or modified
release; no user source or secrets were deleted.

## 2026-10-23: Docker-backed verification completed

Docker 28.3.2 and the existing local Supabase services were available. Verified
that .env.local points only to loopback Supabase and the installed Next.js version
is 16.4.2; no keys were printed. No reset, hosted migration, deployment or DNS
operation was performed.

### Existing local data versus deterministic test fixtures

The first `npm run test:db` against the owner's existing development database
failed seed-dependent counts/status assertions. Inspection found 10 profiles,
11 courses, 3 enrollments and instructor_direct_publish=true, whereas the tests
expect the repository's seven-profile/nine-course seed and direct publishing off.
Some edited course statuses and audit history also differed. This was not treated
as permission to reset, delete records or switch off the owner's setting.

Created a separate database named elam_verification_20261023 inside the existing
local Supabase PostgreSQL container. Restored a **schema-only** snapshot, retaining
object owners/privileges using the local Supabase maintenance role; no user rows,
auth credentials, uploaded resources or audit data were copied. Initialized only
the platform-settings singleton, private lesson-pdfs bucket configuration and the
repository's synthetic seed. The 29-file suite then passed **all 436 assertions**
using an explicitly local database URL. Removed only that disposable database
after testing; it is reproducible from the schema and fixtures.

This verifies the installed schema's behavior against clean fixtures. It does
not claim a new from-empty migration replay; that remains part of the selected
release's CI/staging verification. The original dirty-fixture run remains a
recorded failure, not a reason to weaken tests or modify business logic.

### Types, production build and authenticated browser checks

- `npm run lint:db` passed against the existing local public schema with no errors.
- Generated public-schema TypeScript types in memory via `supabase gen types
  typescript --local --schema public`; normalized line endings and compared with
  lib/supabase/database.types.ts. Exact normalized match, no source-file write.
- Rebuilt on Next.js 16.4.2 using verified local Supabase configuration rather
  than the earlier canary values. Build passed; the client scan again passed on
  all 66 browser asset files without printing any local credentials.
- Ran the production server only on loopback port 3001 and executed
  `npm run test:studio:browser`: **12 passed in 18.6 seconds**, one Edge worker.
  Covered focus trapping and failed-save recovery, publication readiness links,
  responsive content at 320/360/390/768/1440px, published-course read-only fields,
  real local curriculum CRUD and persisted metadata, mocked PDF upload UI/close
  protection, drawer resizing, and processing feedback across route navigation.
- Browser fixture setup created a disposable local instructor/course dataset;
  suite cleanup removed it. No Bunny upload, external payment or real email was
  sent; PDF upload/status responses are mocked in the relevant UI cases.
- Re-ran typecheck/lint, all 333 tests across 69 files with coverage thresholds,
  and full/runtime npm audits as the final verification pass. All passed; both
  audits report zero vulnerabilities.
- Before/after local counts match: 10 profiles, 11 courses, 3 enrollments,
  direct publishing remains true. Zero temporary studio-ui users remain and the
  disposable verification database no longer exists. Hosted services unchanged.

Local dependency verification is complete. Commit selection, Linux CI/fresh
migration replay, hosted staging acceptance and production provider/cutover gates
are deliberately not signed off by these results.
