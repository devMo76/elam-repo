# Elam Backend Roadmap

| | |
|---|---|
| Owner | Backend team |
| Status | Approved working roadmap |
| Updated | 2026-08-31 |

The backend team owns database integrity, RLS, authentication, authorization, shared contracts, payment verification, enrolment, video access, external-service integrations, operational security, and backend testing.

## Backend rules

- Treat every browser request and payload as untrusted.
- Validate request bodies, query parameters, route parameters, environment variables, and webhook payloads with Zod.
- Derive caller identity from the authenticated server session; never accept a user ID from a mutating request body.
- Keep the Supabase service-role client in exactly one server-only module.
- Use the service role only for operations that genuinely require RLS bypass.
- Keep database migrations forward-only.
- Enable and test RLS on every table.
- Never grant access from a browser redirect or unverified payment payload.
- Never expose permanent paid-media URLs.
- Do not implement learner profile editing, a learner watermark, a public admin bootstrap, or application-initiated refunds in v1.

## Backend Phase 0 — Repository, contracts, and quality baseline

### Deliverables

- Establish Git, branch, pull-request, and CI workflows.
- Define shared API error and DTO conventions in `lib/contracts/`.
- Pin Zod and validate contract fixtures.
- Select backend testing tools and add their commands.
- Add `.env.example` with names only.
- Document server-only import and secret-handling rules.
- Resolve staging hosting and Supabase provisioning.

### Tests

- Clean checkout and `npm ci` succeed under Node `22.17.1`.
- Type-checking, linting, backend tests, build, and dependency audit pass in CI.
- Contract fixtures validate against Zod schemas.
- Server-only modules cannot be imported from client code.

### Exit gate

The baseline CI and first shared contract pull request are approved by both teams.

## Backend Phase 2A — Schema, migrations, and synthetic seed data

### Deliverables

- Implement enums, tables, indexes, foreign keys, checks, and uniqueness constraints.
- Implement deferrable module and lesson position constraints.
- Implement database functions for role and enrolment checks.
- Implement the singleton `platform_settings` row with `instructor_direct_publish = false`.
- Implement publication-transition triggers.
- Create generated database TypeScript types.
- Create deterministic synthetic seed data in `supabase/seed.sql`.

Seed coverage must include:

- Learner, instructor, and admin identities.
- Draft, review, published, and archived courses.
- Multiple departments while launching with Electrical Engineering.
- Ordered modules and lessons.
- Free-preview and paid lessons.
- Absent, processing, ready, and failed media states.
- Enrolled and non-enrolled learners.
- Pending, paid, and failed synthetic orders.

### Tests

- Migrations apply successfully to an empty local database.
- Schema reset plus seed is deterministic and repeatable.
- All foreign-key, check, unique, and deferrable constraints behave as specified.
- Reordering commits completely or rolls back completely.
- Seed data contains no production data, secrets, or usable paid-media URLs.
- Seeded catalogue queries return only published courses for public access.

### Exit gate

An empty database can be migrated, seeded, typed, and verified automatically.

## Backend Phase 2B — RLS, authentication, roles, and settings

### Deliverables

- Enable RLS on every table.
- Implement and document the complete policy matrix.
- Implement session, browser, and service-role Supabase clients.
- Implement registration, email verification, sign-in, and password reset.
- Create one learner profile for every new account.
- Collect required learner data during registration; do not expose learner profile-editing operations.
- Allow approved instructor public-profile fields to be maintained without permitting role changes.
- Document the one-time manual first-admin promotion procedure.
- Implement audited admin role changes for all later promotions.
- Enforce direct-publishing settings in the database.

### Tests

- Test every table as anon, learner, instructor, and admin.
- Learners cannot self-promote or change protected profile fields.
- Instructors cannot access other instructors' private courses.
- Instructors cannot read orders, prices paid, revenue, or learner identities.
- Browser clients cannot create or update orders or enrolments.
- Direct REST calls cannot bypass publication rules.
- The first admin can be promoted manually without a public bootstrap endpoint.
- Changing the direct-publishing setting takes effect immediately without deployment.
- Service-role credentials do not appear in the production client bundle.

### Exit gate

Registration and role flows work on staging, and the complete RLS evidence matrix passes. This completes backend M1.

## Backend Phase 3 — Catalogue and course-read services

### Deliverables

- Public published-course queries.
- Course-detail and syllabus queries.
- Instructor public-profile DTOs.
- Enrolled-state queries derived from the authenticated session.
- Owner and admin preview access.
- Stable course slugs and not-found behavior.
- Frontend fixtures aligned with seeded database responses.

### Tests

- Public queries return published seed courses only.
- Draft, review, and archived courses remain inaccessible to unauthorized users.
- Owners and admins receive only their permitted preview access.
- Archived courses remain accessible to previously enrolled learners through learning queries, not the public catalogue.
- DTOs contain no privileged database fields.
- Database responses validate against shared Zod contracts.

### Exit gate

The frontend catalogue renders directly from seeded staging data without contract changes. This completes backend support for M2.

## Backend Phase 4 — Video access and progress

### Entry decision

Select the video provider and confirm signed playback, direct upload, webhook authentication, adaptive HLS, and RTL player compatibility.

### Deliverables

- Provider adapter isolated under `lib/video/`.
- Single-use direct-upload credentials.
- Verified video-processing webhooks.
- Playback authorization for free preview, enrolment, ownership, and admin access.
- Short-lived signed playback credentials.
- Progress position, completion, and resume behavior.
- Learner dashboard progress queries.
- No per-learner watermark behavior.

### Tests

- A non-enrolled learner receives `403`.
- Free previews, enrolled learners, owners, and admins receive their intended access.
- Expired credentials fail.
- No permanent or unsigned media URL is returned or stored.
- Uploads do not transit the Next.js server.
- Invalid, unsigned, duplicate, and out-of-order video webhooks are handled safely.
- Users cannot read or update another learner's progress.
- Progress writes remain correct under retry and concurrency.

### Exit gate

Secure playback, upload, and progress tests pass end to end on staging. This completes backend M3.

## Backend Phase 5 — Payments, orders, and enrolment

### Entry decisions

- Confirm the no-platform-refund policy for customer-facing terms.
- Select the transactional email provider.
- Confirm current Moyasar request fields, status values, and webhook signature rules.

### Deliverables

- Server-authoritative checkout using database price and SAR currency.
- Pending, paid, failed, and externally refunded/reversed order states.
- Signed Moyasar webhook verification.
- Server-side payment retrieval and verification.
- Atomic payment confirmation and enrolment grant.
- Idempotent webhook and callback processing.
- Receipt delivery that cannot roll back a successful payment.
- Already-enrolled protection.
- Failed and abandoned payment recording.
- No application refund endpoint or admin refund action.

### Tests

- Client-supplied or tampered amounts are rejected.
- Forged callbacks grant no access.
- Invalid webhook signatures are rejected before processing.
- Amount, currency, payment status, and order metadata must all match.
- Duplicate and concurrent confirmations create one paid order and one enrolment.
- Webhook and callback can arrive in either order.
- Already-enrolled users cannot purchase again.
- Email failure does not undo payment or enrolment.
- Orders are never deleted, and external reversal status is recorded immutably.

### Exit gate

A Moyasar sandbox purchase grants exactly one enrolment under replay and concurrency tests. This completes backend M4.

## Backend Phase 6 — Instructor authoring

### Deliverables

- Instructor-owned course, module, and lesson mutations.
- Transaction-safe ordering.
- Free-preview and media-status mutations.
- Review submission and publication transitions.
- Conditional direct publication governed by the database setting.
- Counts-only instructor statistics through a security-definer function.
- Instructor public-profile fields required for catalogue credibility.

### Tests

- Instructors can modify only their own courses.
- Learners cannot execute instructor mutations.
- Instructors cannot archive courses.
- Direct publication fails when disabled and succeeds when enabled.
- Ordering is atomic and preserves unique positions.
- Instructor statistics contain no monetary or learner-identity fields.
- Direct REST calls produce the same authorization result as application actions.

### Exit gate

The frontend studio can author and submit a complete seeded course while all isolation tests pass.

## Backend Phase 7 — Administration and reporting

### Deliverables

- Revenue, enrolment, and active-course summaries.
- Searchable and filterable purchase history.
- Course review, publishing, unpublishing, and archival actions.
- User-role management.
- Platform-setting management.
- Audit records for privileged changes.
- Revenue reporting by course and date range.
- No platform-initiated refund action.

### Tests

- Every admin operation rejects non-admins.
- Role changes cannot occur through normal profile mutations.
- Settings changes are immediate and audited.
- Course archival preserves purchased access.
- No code path deletes orders or enrolments.
- Revenue calculations treat failed and externally reversed payments correctly.
- Audit records contain actor, action, subject, detail, and timestamp.

### Exit gate

All administration contracts and authorization tests pass against the staging frontend. This completes backend M5.

## Backend Phase 8 — Security, load, operations, and launch

### Deliverables

- Structured logging and error monitoring.
- Security headers and appropriate endpoint rate protection.
- Webhook failure and retry visibility.
- Backup, restore, migration, and incident runbooks.
- Secret and production-bundle inspection.
- Load-test scripts targeting 500 concurrent learners.
- Production environment, provider credentials, and deployment configuration.

### Tests

- Complete RLS, payment, publication, and media checklists pass.
- A database backup is restored successfully.
- No secret is present in client bundles or logs.
- Playback authorization, progress, dashboard, and checkout endpoints meet the agreed load target.
- Provider timeouts, duplicate events, retries, and partial failures recover safely.
- Staging and production smoke tests pass against the same approved commit.

### Exit gate

The production release candidate passes security, restore, load, observability, and operational review. Production launch and handover complete backend M6.
