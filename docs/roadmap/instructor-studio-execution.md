# Instructor studio execution log

## 2026-10-11: first foundation slice

Scope: Task 1 audit/policy matrix and Task 2a permission storage. Existing UI,
staging database and deployments are not changed by this slice.

### Confirmed implementation discrepancies

- `202609050002_restrict_archived_course_authoring.sql` is the later write-policy
  authority for course/module/lesson insert/update: it excludes archived courses,
  not published or in-review courses. Earlier policies must not be evaluated alone.
- `updateInstructorCourse` and module rename also filter non-archived status.
- The curriculum frontend is draft-only, while existing insert/reorder RPCs and
  direct lesson metadata writes need explicit policy alignment in Task 3.
- Deletion RPCs and deletion policies are draft-only.
- PDF metadata GET and all PDF mutations share a draft-only guard. Read and write
  authorization must be separated so published attachments can be inspected.
- Video management verifies role/ownership but does not itself provide safe
  pending replacement. Do not enable live replacement through a boolean UI change.
- `instructor_direct_publish` controls publication transitions, not live editing.
- Current learner reads have no pending-addition visibility field; enabling new
  lessons on published courses before Task 4a would expose unfinished content.

### Proposed instructor policy matrix

| Operation | Owned draft | Owned in-review | Owned published, locked | Owned published, allowed | Owned archived | Non-owner |
| --- | --- | --- | --- | --- | --- | --- |
| Inspect | Yes | Yes | Yes | Yes | Yes | No |
| Descriptive course metadata | Yes | No | No | Yes | No | No |
| Price/public slug | Yes | No | No | No | No | No |
| Prepare new content | Yes | No | No | Yes, private | No | No |
| Edit existing curriculum | Yes | No | No | No | No | No |
| Replace/remove existing media/content | Yes | No | No | No | No | No |
| Release prepared additions | Existing draft publish workflow | No | No | Yes | No | No |

This matrix is implemented as a pure, tested helper in `lib/authoring/edit-policy.ts`.
It is deliberately not wired to the authoring UI/API yet: persistence, database
enforcement, and pending-content visibility must agree before live editing unlocks.
The helper is an instructor policy only, not a replacement for admin authorization.
On 2026-10-11 the owner approved non-destructive edits and new lessons on
admin-enabled published courses. Replacement/deletion of existing published
videos and PDFs is deferred and must remain locked in this release. This scope
approval does not mean the permission migration or live authoring is deployed.

### Permission-storage migration

`202610110001_published_course_edit_permission.sql` adds
`courses.instructor_published_edits_allowed`, default false. It adds an admin-only
RPC and a table trigger protecting the flag from instructor direct writes and
non-admin inserts with permission enabled. Flag changes insert an audit event in
the same transaction; no-op writes do not generate duplicate audit events.
The audit event supplies actor/time/from/to without duplicating those columns.

**Important:** storage of this flag does not enforce all course editing operations.
Current write rules remain unchanged until Task 3. Do not represent this migration
as a complete live-edit lock or activate its UI before those safeguards are ready.

The database test covers defaults, anonymous/learner/instructor denial, owner direct
write bypass, admin grant/revoke, audit/no-op behavior, and missing course handling.
The migration has not been applied locally or to staging. Docker's Linux engine
pipe was unavailable. Before applying: start Docker/local Supabase, inspect pending
migrations, apply only approved migrations without resetting data, run database
tests, and regenerate database TypeScript definitions with the repository script.
Task 2b will expose the setting in the admin API/UI and instructor capability data.

### Verification

- `npm run test:backend -- lib/authoring/edit-policy.test.ts lib/authoring/capabilities.test.ts`:
  12 tests passed across two files (9 new policy cases and 3 existing publication cases).
- Database tests: written, not executed; Docker engine unavailable.
- `npm run typecheck`: passed.
- Focused ESLint on the new policy/helper tests: passed; `git diff --check`: passed.
- Browser visual checks: not applicable to this foundation; no new UI shipped.
- Staging deployment: not performed.

### Next checkpoint

Verify the migration against the local database, generate types, then implement
Task 2b's admin toggle and capability response. Continue Task 3 enforcement before
allowing live authoring, followed by pending additions and the focused dialogs.
Independent dialog groundwork can proceed without changing live permissions.

## 2026-10-11 continuation: database verification and admin API

### Local database verification (Task 2a complete)

- Docker's Linux engine was available. Migration history showed exactly one
  pending migration: `202610110001_published_course_edit_permission.sql`.
- Applied it with `supabase migration up --local`. No database reset, reseed of
  development data, staging migration, or user-account change was performed.
- Regenerated `lib/supabase/database.types.ts` through `npm run supabase:types`;
  the diff contains the new column and RPC, including the course-returning RPC type.
- The first full-suite run against development data failed because catalogue counts,
  course statuses, enrollments, audit records, and the direct-publishing setting
  differ from the deterministic seed assumptions. Those failures are not suppressed
  or reported as a passing run.
- Corrected a new test fixture error: catalogue course `400…001` belongs to seeded
  instructor `200…002`, not `200…001`. An UPDATE by the non-owner affected no rows,
  so the trigger could not be tested that way. The permission test now creates its
  own instructor-owned draft inside its rollback transaction.
- Expanded permission coverage to 15 assertions, including forged permission on
  INSERT, ordinary draft edits, exact audit transition, revocation audit, and null
  rejection. All 15 passed against the existing development database.
- For the full suite, created temporary database `elam_studio_verify_20261011` in
  the existing local container, copied **schema only**, and installed synthetic seed
  records plus the migration-defined settings row and private PDF bucket configuration.
  No existing account/course data was copied. All 381 assertions across 26 files
  passed. This validates the current local schema with deterministic data; it is
  not a fresh replay of every historical migration or a staging sign-off.
- Removed that agent-created synthetic database and its temporary seed-file copy
  after verification. The development database and its content remain intact.

### Protected admin API (Task 2b API complete; UI pending)

`PATCH /api/admin/courses/{courseId}/edit-permission`

Request: `{ "publishedEditsAllowed": true }` (or `false`). Response:
`{ "data": { "courseId": "<uuid>", "publishedEditsAllowed": true } }`.

- Uses `requireAdmin` before input processing and the authenticated Supabase client;
  no service-role authorization bypass. The RPC independently rechecks admin role.
- Strict boolean contract rejects missing/null/coerced values and extra fields,
  including a forged audit actor. The database derives the actor from `auth.uid()`.
- Validates the course UUID; maps database authorization, missing-course, and invalid
  permission errors to 403/404/422; unexpected failures return a generic 500.
- Successful revocation (`false`) is explicitly treated as success, not missing data.
- Success responses are `private, no-store`. Audit insertion remains transactional
  in the database; the route does not create duplicate audit events.
- The setting records admin intent only. This endpoint does **not** complete live-edit
  enforcement. Instructor controls and the visible admin toggle remain unchanged
  until Task 3 closes direct-write/service-role bypasses. New additions additionally
  require Task 4a's visibility boundary before being offered on published courses.

### Verification results

- Focused permission/admin/policy regression: 34 tests passed across five files
  (17 new route/service cases).
- Full application suite: 295 tests passed across 67 files.
- Full database suite: 381 assertions passed across 26 files in the isolated
  synthetic database; permission-only suite: 15 passed on the development database.
- Typecheck: passed after correcting a test fixture to use the application's typed
  API-error response rather than a plain `Response`.
- Focused ESLint on changed API/service/contracts/tests: passed.
- Production build: passed, including the new dynamic permission route.
- `git diff --check`: passed. Browser/device checks: pending; no new UI in this slice.
- No GitHub push or staging deployment performed.

### Next implementation slice

Task 3: enforce the approved course-description and curriculum operation matrix
in database and server services, starting with descriptive course updates. Preserve
draft submission/publication transitions and admin operations. Keep existing live
media immutable and unpublished additions disabled until their visibility boundary
is implemented. Then connect the admin toggle/capability response and proceed to
the dialog workflows with focused browser/mobile verification.

## 2026-10-11: Task 3a course-details enforcement

### Implemented boundaries

- `updateInstructorCourse` now reads the owned course's status, current price/slug,
  and admin permission through the authenticated client, then applies the shared
  operation policy before writing. Missing/inaccessible courses return 404;
  forbidden detail/commercial changes return 403 without issuing an UPDATE.
- Published descriptive saves may include unchanged price/slug, as the existing
  full form does. Actual commercial changes are denied; draft commercial edits
  remain available. No new required description, image, or PDF was introduced.
- The UPDATE filters the status observed during the policy read. A concurrent status
  change cannot silently convert a stale draft save into an unrestricted live save.
- Migration `202610110002_enforce_course_detail_edit_policy.sql` adds a table trigger
  checking the existing row's status and permission on every instructor UPDATE.
  Direct browser REST writes cannot bypass the course-details rules, and permission
  revocation after the service preflight is rechecked by the database.
- The trigger protects ownership, ID, currency, creation time, and other fields
  outside the explicit mutable whitelist. Existing status/timestamp/permission
  triggers remain authoritative for their own fields.
- Closed a live-to-draft escape: the existing direct-publishing setting formerly
  permitted instructors to return a published course to draft. The new guard denies
  that transition for instructors, even when live edits or direct publishing are
  enabled. Admin unpublishing is preserved.
- Draft submission/publication and review withdrawal retain their existing status
  rules; in-review descriptive updates are denied. Archived instructor updates
  remain filtered by existing RLS. Admin management is unchanged. Trusted
  seed/maintenance/service writes retain their existing path, so this guard is not
  a replacement for later service-role media authorization.

### Review and verification

- Applied the single new migration locally without resetting or reseeding the
  development database. This is a trigger-only schema change; no new client-facing
  database columns or RPC types were introduced.
- New database suite: 20 assertions covering draft/live/review/archived operations,
  identity spoofing, ownership, learner denial, unchanged commercial values,
  revocation, failed-write preservation, admin management, and live-to-draft denial.
- Corrected one test-fixture issue during verification: `now()` equals the creation
  timestamp inside the same transaction, so the forged timestamp test now adds one
  day and genuinely attempts a change.
- Both new detail and prior permission suites passed against the development DB:
  35 assertions, with all fixture changes rolled back.
- Recreated the temporary schema-only/synthetic database using the prior documented
  procedure. Full database suite passed: **401 assertions across 27 files**, including
  publication, authoring, catalogue, learner access, admin, and payment regressions.
  Removed only that temporary database and temporary seed-file copy afterward.
- Full application suite: **306 tests across 67 files passed**. Added 11 service
  cases for locked states, permitted saves, commercial restrictions, access failures,
  revocation, and concurrent status changes; prior creation tests remain passing.
- Typecheck, focused ESLint, production build, and whitespace checks passed.
- Code review: verified existing publication-trigger ordering, no permission checks
  based on the incoming flag, no new service-role client, and no learner-read changes.
- Browser/device verification remains pending because this slice does not change UI.
  No GitHub push, staging migration, or deployment was performed.

### Remaining scope / next slice

Task 3 is **not complete**: module/lesson mutation enforcement and video/PDF
service-role guards remain outstanding. Current curriculum policies must not be
described as safely locked merely because course details now are. Keep the visible
admin toggle/instructor live-edit controls deferred until those guards agree.
At that checkpoint, Tasks 3b/3c/4 and UI remained pending; the continuation below
supersedes that historical status.

## 2026-10-11: Remaining local implementation and verification

### Backend

- Migrations 003–006 add private curriculum additions, learner-read/progress
  isolation, readiness-checked transactional release and pending-media protection.
  Applied locally without resetting/reseeding existing development data.
- Course permission is default-deny, admin-controlled and audited. Live metadata
  edits require owner/permission; commercial and identity fields remain locked.
- Existing live module/lesson/media mutations remain denied; pending additions
  retain safe CRUD while permission is enabled. PDF/video inspection is separate
  from modification; database guards cover service-role finalization/cancellation.
- Cancellation clears the database binding before provider deletion. Release
  preserves existing IDs/enrollment/history, then expands the progress denominator.
- New protected release endpoint, generated types, admin UI toggle and instructor
  capabilities connect the database to both dashboards. No new required PDF or
  descriptive fields and no new API credentials.
- Regression fixes: preserve trusted maintenance/cascade deletion of disposable
  draft fixtures; retain original reparenting error contract; prevent browser
  changes to pending visibility/identity. Full existing DB regression passed.

### Frontend and final review

- Compact workspace and three focused native dialogs with durable mounted forms,
  guarded dismissal/navigation, explicit focus containment/restoration, safe-area
  layout and a persistent Save/status footer.
- Unit selection, desktop inline lesson editor and phone lesson drill-in/Back.
  Draft add/bulk/duplicate/order/delete retained; live controls follow capabilities.
- Video manager stays above route/dialog lifecycle; deep links reopen content and
  correct lesson. PDF-owned transfer blocks dismissal/deletion while busy.
- Hamburger/right drawer replaces narrow horizontal nav; desktop sidebar retained;
  visible/accessible studio name is `استوديو الشارح`.
- Real skeletons and local busy/failure feedback; no artificial loading delay.
- Independent Impeccable finishing reviewer inspected 15 responsive captures and
  requested mobile drill-in, persistent Save, consistent accessible labels and
  44px targets. All implemented; browser regression added for Back/reopen retention.
  A follow-up found clipped mobile title from column-flex sizing; corrected that
  inherited sizing and recaptured. Independent documenter found no new canonical
  design-system change; incumbent RTL font/palette preserved.
  Final narrow post-fix review: **ship**; all four findings and the clipping
  regression resolved across updated phone captures.
- Skill engine/detector unavailable due external cache permissions; used documented
  manual handoffs. Interactive browser tool unavailable; ordinary Playwright/Edge
  provided working browser evidence instead. No generated design-system documents.

### Evidence and boundaries

- Application: 327 tests/68 files. Database: 436 assertions/29 files in an isolated
  current-schema/synthetic database. This is not empty-project migration replay.
- Browser: 12 Edge tests, including real fixture CRUD/save; 320/360/390/768/1440px,
  focus, dirty dismissal, failed-save retention, readiness shortcuts, PDF mocks,
  drawer breakpoint behavior and persistent processing mocks.
- Lint, typecheck, production build, client-secret scan and whitespace passed.
  Browser tooling was added as a dev dependency; generated captures are ignored.
- Local browser fixtures were removed; development data and existing dev server
  preserved. No staging/GitHub deployment occurred.
- Staging migration/deployment, owner review, real Bunny/PDF/publish journeys,
  genuine concurrency, physical phone/Safari/screen reader checks remain external.
- Existing production npm audit reports high findings in `sharp`/`source-map-js`;
  keep separate launch-security follow-up rather than silently broadening this task.

Acceptance steps and deployment order:
[instructor-studio-modal-verification.md](../handover/instructor-studio-modal-verification.md).
