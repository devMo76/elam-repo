# Zod production preflight patch

Date: 2026-10-24. The fresh production-deployment audit found one high-severity
finding for Zod 4.5.4 after the earlier 0659b62 release had passed CI/staging.
Do not treat an earlier clean audit as evidence against a newly reported finding.

Advisory: [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
affected versions below 4.6.6; patched version selected: 4.6.7. This is a compatible
Zod 4 dependency update, without application behavior changes, forced audit fixes,
new overrides or suppressed findings. Preserve unrelated owner changes.

Production credentials are applied: all 14 required names present, intended
production URLs correct, live payment-key formats consistent, webhook/worker
secrets satisfy 32-character checks and are different. Format validation does not
prove merchant identity, payment acceptance or webhook delivery. No secret values
displayed, no payment request or DNS change performed.

## Verification sequence

1. Resolve/install the pinned patch and check dependency diff/audit.
2. Run local typecheck, lint and 333-test coverage suite.
3. Commit only manifests/this report; run exact-commit Linux CI including fresh
   migration replay, 436 SQL assertions, generated types, build and secret scan.
4. Promote the patched commit through Railway staging and public smoke checks.
5. Use that same patched code for the first production build and temporary-origin
   smoke checks. Do not attach production to future unreviewed staging changes.

No deployment of the newly vulnerable 0659b62 code to production was started.
Results below will be recorded after execution; provider/content/domain/owner
acceptance remains independent of the package patch and preview deployment.

## Initial local results

Pinned Zod 4.6.7 and resolved the lockfile without forced fixes. Manifest/lockfile
diff changes only Zod's version and integrity metadata. Full and runtime-only
official-registry audits now return zero findings. All 333 tests across 69 files
and coverage thresholds passed. Typecheck/lint and exact-commit CI remain in
progress at this commit's documentation snapshot; final results belong in the
production cutover execution record before deployment acceptance.

A Railway-managed preview hostname was created for the existing production web
service: elam-web-production.up.railway.app, port 8080. No apex/email/staging DNS
record was changed and no app was deployed by hostname creation.
