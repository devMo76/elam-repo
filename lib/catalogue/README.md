# Catalogue read services

This directory is the server-side boundary between Supabase rows and catalogue
UI data.

## Public functions

- `listPublishedCourses()` returns published course summaries only.
- `getCatalogueCourseBySlug(slug)` returns a published course, an authorized
  owner/admin preview, or `null` without revealing why the record is hidden.
- `getCatalogueCourseBySlugOrNotFound(slug)` provides the same behavior and
  invokes Next.js `notFound()` for a missing or unauthorized slug.

Call these functions from Server Components. Do not import `queries.ts` into a
Client Component; it is guarded by `server-only`.

## Security and performance

- RLS remains the database authority; query filters further narrow catalogue
  visibility.
- Viewer identity comes from `auth.getUser()`, never from a caller argument.
- Enrolment state is filtered to that viewer's ID and queried in one batch.
- Course, instructor, module, and lesson data is fetched as one nested query to
  avoid N+1 requests.
- Zod validates database results before DTOs cross the frontend boundary.
- DTOs omit course status, instructor roles, enrolment rows, orders, revenue,
  media status, and `video_asset_id`.
- Missing duration values contribute zero until video processing supplies a
  duration. The lesson remains visible in the syllabus with a nullable duration.

Archived-course learning access is intentionally not implemented here. Phase 4
will expose it through a dedicated authenticated learning service, never through
the public catalogue.
