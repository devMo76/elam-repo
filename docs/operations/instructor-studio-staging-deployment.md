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

Pending: apply six migrations, verify remote migration history, push the scoped
release, observe Railway build/runtime and smoke-test the staging routes.
Do not reset/seed staging or enable published editing globally.
Manual real-video/PDF and cross-role acceptance remains on the
[verification checklist](../handover/instructor-studio-modal-verification.md).
