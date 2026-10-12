# Instructor studio staging deployment

Date: 2026-10-12. Owner reviewed the local updates and authorized staging deployment.

Target: Railway `elam-staging` / `staging` / `elam-web`,
`https://test.elamedu.com`; GitHub `devMo76/elam-repo`,
`feat/staging-readiness`; Supabase `dnizkyfkltyfibgrftwf`.
Production, DNS, provider credentials and unrelated working-tree edits are out of scope.

## Preflight

- Railway follows the staging branch with no pin or pending config changes.
  Previous successful commit: `66383684263f7a4c1228400e6f8e4ad703bd9f01`;
  deployment: `7836c253-90b7-4c2b-a7ac-310d2ee6c0ab` (rollback candidate).
- Supabase linked-project reference checked; dry run identified exactly six studio
  migrations `202610110001` through `202610110006`, no seeds/role changes.
- Public schema-only backup saved to ignored local
  `supabase/.temp/studio-predeploy-20261012-schema.sql`. Table-record export was
  blocked by security review; no account/course records exported. This is a schema
  backup, not a full data backup or tested restore. Migrations preserve existing
  data and default all existing course edit permissions to disabled.
- Prior local evidence: 327 application tests, 436 DB assertions, 12 Edge tests,
  lint/typecheck/build/client-secret scan. Existing audit findings remain a launch
  follow-up; do not call the deployment production sign-off.

## Rollout status

Completed: six migrations applied; second dry run returned `upToDate: true`,
no pending migrations/seeds/roles. No staging reset or seed performed.

Release: `b82f23fc6a18c9b528f91f16852fd0081ad7ade0`, pushed to staging branch.
Railway deployment: `bbc9da6f-0577-4bd8-938d-0746eb23c83e`, **SUCCESS**, built
that exact commit. Runtime ready on port 8080; HTTP healthcheck succeeded.

Push alone did not create a rollout. Added a staging-web readiness check (`/`,
120s timeout), reviewed the two-field patch with no variable changes and applied
it under the owner's deployment authorization. This triggered the branch build;
no commit pin added. Future automatic push deployment remains to be checked;
this manual rollout does not establish it. Receipt worker was not changed.

## Verification

- `/`, `/courses`, `/auth/sign-in`: HTTPS 200.
- Anonymous browser visits to `/studio` and `/admin` end at `/auth/sign-in`, no
  page errors. Their initial HTTP 200 is a streamed redirect, not dashboard access.
- Unauthenticated release POST and admin edit-permission PATCH: 401.
- [CI run 38296873590](https://github.com/devMo76/elam-repo/actions/runs/38296873590):
  fresh database rebuild/seed, tests, DB lint and generated types pass, closing
  the prior empty-project migration-replay evidence gap.
- Quality typecheck/lint/tests/build/client-secret scan pass. Dependency audit
  fails with seven high findings: five-package development `braces` chain plus
  `sharp` and `source-map-js`. Overall CI is **not green**. No audit policy was
  weakened or breaking dependency downgrade attempted. Production security review
  remains open.

Do not reset/seed staging or enable published editing globally.
Manual real-video/PDF and cross-role acceptance remains on the
[verification checklist](../handover/instructor-studio-modal-verification.md).
