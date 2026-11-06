# Instructor-wide published-course update permission

2026-11-07. Owner authorized implementation and deployment. Release scope is the
instructor-wide permission; it does not implement published media replacement,
existing curriculum renaming/reordering, or other pending maintenance extensions.

## Behavior

An admin manages `السماح بالتحديثات` / `إيقاف التحديثات` for each instructor in
`/admin/users` (filter by instructor). One value covers all currently owned and
future published courses. `/admin/courses` displays inherited status and links
to instructor management rather than offering a separate override.

The existing bounded edits remain the same: course descriptive details and
private new lessons/modules can be edited when enabled; ready additions are
released explicitly. Published videos/PDFs and existing curriculum remain protected.
Commercial fields stay locked. Drafts, purchases, learner access and progress
are unaffected by this permission setting.

## Enforcement

- New default-false `profiles.instructor_published_updates_allowed` is admin-managed.
- `admin_set_instructor_edit_permission` requires an admin actor and an instructor
  target; validation and audit are in the database. Changes record old/new value.
- A shared database helper checks current instructor role and locks the permission
  row for the duration of authoring/release writes, serializing revocation.
- Existing final authoring/media guards, RLS and RPCs are migrated to consult the
  helper. Existing application DTO field `publishedEditsAllowed` is derived from
  the current course owner's profile, including owner role, rather than copied
  into writable per-course authority.
- The legacy course column remains inert for compatibility/history. The old
  course grant RPC rejects writes, and the authenticated legacy API returns 410.
  A legacy true course flag cannot override a disabled instructor setting.
- Direct profile updates cannot grant this permission. Read/preview rights remain
  separate from authoring rights. A previously issued provider upload token may
  remain valid until expiry; current permission is rechecked when binding/releasing.

## Migration and rollout

Migration: `202611070001_instructor_wide_edit_permission.sql`. No automatic grant
is made based on historical course flags. Production aggregate preflight found
zero enabled legacy courses and zero instructors with such grants, so no existing
production grant requires transition approval. All instructor settings start off.

The migration rewrites the reviewed final guard/RPC/policy definitions to change
only their permission source. It fails on unmapped references rather than leaving
an unnoticed bypass. Fresh schema replay, SQL role/isolation tests, lint and type
generation checks are required before production application. Apply the migration
and record its version before deploying the matching code. Never reset production.

## Verification and manual acceptance

Automated checks cover admin/learner/instructor roles, direct profile self-grants,
two published courses, future course inheritance, another instructor's isolation,
revocation, inert legacy flags, commercial locks, invalid targets and audit
idempotency. Existing private additions/media SQL tests now use instructor grants.
The API suite verifies schema/authentication/error handling and the retired route.

After deployment, as admin filter `/admin/users` by instructor, enable one chosen
instructor and confirm the scope dialog. In Studio, that instructor should be
able to edit descriptions and prepare new lessons in multiple published courses.
Existing published video replacement remains unavailable. Disable the setting
and retry an edit from an already open tab; the server must reject it without
discarding published content. Check that a learner can still open a purchased
course. No new purchase is needed. Grant changes to real instructors are left to
the admin; deployment itself does not enable anyone.

Release CI, schema deployment, web SHA and smoke-check evidence will be appended
after completion. Until those steps pass, this file describes a candidate release.
