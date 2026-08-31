# Backend Phase 2B security verification

## Scope

This record maps the Phase 2B exit requirements to repeatable evidence. It
covers local and CI verification only. Hosted staging verification remains an
environment-owner action and must pass before backend M1 is declared complete.

## Evidence matrix

| Requirement | Automated evidence | Result |
| --- | --- | --- |
| Every application table has RLS enabled | `schema_test.sql` | Pass |
| Anonymous, learner, instructor, and admin access is enforced | `rls_*_test.sql` | Pass |
| New accounts receive exactly one learner profile | `auth_profile_test.sql` | Pass |
| Learners cannot self-promote or edit protected profile data | `rls_learner_test.sql` | Pass |
| Instructors cannot access other instructors' private courses | `rls_instructor_test.sql` | Pass |
| Instructors cannot read learner identities, orders, revenue, or progress | `rls_instructor_test.sql` | Pass |
| Browser sessions cannot write orders or enrolments | `rls_anon_test.sql`, `rls_learner_test.sql`, `rls_admin_test.sql` | Pass |
| Direct REST-equivalent writes cannot bypass publication rules | `publication_test.sql` | Pass |
| Direct publishing changes immediately with the database setting | `publication_test.sql`, `rls_admin_test.sql` | Pass |
| First admin promotion requires a direct database session | `rls_admin_test.sql`, `first-admin-promotion.md` | Pass |
| Later role and setting changes are administrator-only and audited | `rls_admin_test.sql` | Pass |
| Service-role configuration is referenced only by approved modules | `service-role-boundary.test.ts` | Pass |
| Server-only variables and configured values are absent from browser assets | `verify-client-bundle-secrets.mjs` | Pass after production build |
| Migrations, seed, generated types, DB lint, and tests pass from a clean database | CI database job | Required on pull request |

Current automated totals at the time this record was created:

- Database: 10 files, 129 assertions.
- Backend: 6 files, 21 assertions.
- Strict database lint: no warnings or errors.
- Dependency audit: no known vulnerabilities at the configured threshold.

## Local verification commands

```powershell
npm run typecheck
npm run lint
npm run test:backend
npm run test:db
npm run lint:db
npm run build
npm run verify:client-bundle
npm audit --audit-level=high
```

`npm run supabase:reset` is intentionally excluded from routine local checks
because it deletes local test accounts. The CI database job performs the clean
reset safely in an isolated runner.

## Hosted staging exit gate

Before backend M1 is complete, deploy the same reviewed commit to the dedicated
staging Supabase and Vercel projects, then confirm:

1. A new user registers, receives the confirmation email, verifies, and signs in.
2. The user has exactly one `learner` profile.
3. A manually established administrator promotes the user to `instructor`.
4. A non-admin receives `403` from both administrator routes.
5. The administrator changes direct publishing and the audit row records the actor.
6. The deployed browser assets pass the server-secret scan or equivalent artifact inspection.

Do not use production identities, payment credentials, or course data for this
verification.
