# Admin course-content review — 2026-11-11

## Problem and scope

The admin course queue exposed publication actions without a way to inspect the submitted curriculum. An admin could see a readiness count but could not open lessons, videos, or attachments to assess quality.

The implementation adds a read-only review route for submitted courses and also supports inspecting drafts, published courses, archived courses, and private additions using existing admin permissions. Instructor authoring remains separate.

## Review flow

1. Go to Admin → Courses, whose initial filter is the review queue.
2. Select **مراجعة المحتوى** on a course.
3. The new `/admin/courses/[courseId]` page displays the actual title, instructor, department, subtitle, description, price, and publication status.
4. Select lessons from the module list. The current lesson is identified accessibly, readiness and private/free-preview states are explicit, and only one player is mounted.
5. Ready videos use the existing signed playback endpoint. Processing, uploading, failed, and absent media show an explicit status instead of an unusable player.
6. Open each PDF in a separate tab through the existing protected endpoint. Loading, missing attachment, and failure/retry states are visible; mixed-direction file names are isolated with bdi.
7. Publish, return to draft, or archive using the existing confirmation and audit flow. Unready content remains blocked from publication.

Mobile uses stacked curriculum/player sections with a bounded, scrollable lesson list. Desktop places the curriculum beside the player. No enrollment or learner-progress write is performed by review playback. There is no forced watch timer or new approval requirement.

## Backend and security

- `getAdminView` enforces the admin role before loading course content. Invalid/missing IDs show not found.
- `lib/admin/course-review.ts` reads real course/module/lesson/profile rows using the authenticated Supabase client and existing RLS. It orders the curriculum through the existing authoring transform.
- Existing RLS permits admins to inspect unpublished content and private additions. Existing SQL access tests already cover admin draft playback.
- Playback uses `GET /api/lessons/[lessonId]/playback`, whose access RPC authorizes the admin and whose response contains a short-lived signed Bunny URL.
- PDF metadata/download uses `GET /api/lessons/[lessonId]/pdf`, with the same lesson access check and a short-lived storage link.
- Provider asset IDs, API keys, and storage paths are not included in the course-review payload.
- Published-course permission labels derive from the existing admin permission service.
- Publication still uses the existing status endpoint, readiness guard, and audit log. The client readiness indicator uses the existing readiness evaluator.
- No schema migration, provider configuration, live course change, or new public access policy is required.

The new route inherits the admin loading skeleton and error boundary. A provider URL expiry or playback error offers retry; changing lessons discards the previous player and aborts its pending preview request.

## Files

- `app/(admin)/admin/courses/[courseId]/page.tsx`: protected server page, course information and decision controls.
- `lib/admin/course-review.ts`: authenticated content loader.
- `components/admin/AdminCourseReviewContent.tsx` and its CSS module: responsive read-only curriculum, shared video preview and PDF review states.
- `components/admin/AdminMutations.tsx`: review link in course queue actions; suppressed on the detail page itself.
- Existing instructor preview component and playback/PDF endpoints are reused without authorization changes.
- Loader/route tests and the existing isolated browser fixture cover the added behavior.

## Verification

- Production-based checkout `.deploy/instructor-updates-20261107`: **354 backend tests across 74 files passed**; **18 browser tests passed**, including mobile 390px and desktop 1440px, lesson switching without player stacking, PDF switching/error/retry/missing states, and unfinished media.
- Route tests verify the admin guard runs before content loading and that invalid/missing courses are rejected.
- Loader tests verify submitted/private curriculum, ordering, missing/query-error handling, published permission inheritance, and exclusion of raw media identifiers.
- TypeScript and lint checks passed.
- The normal Turbopack production build passed in the original `backend/` worktree, with the new dynamic admin review route in its output. Its mirrored browser suite passed **16 tests**; the isolated release checkout has two additional pre-existing instructor-permission tests.
- The isolated checkout's shared node_modules junction prevents its default Turbopack build from resolving dependencies; a Webpack attempt also encounters a pre-existing unscoped CSS selector. No build configuration was changed to work around those local checkout limitations.
- Actual authenticated production playback/approval acceptance remains for after deployment. Automated browser tests mock HTTP/provider responses and do not approve or alter real courses.

## Manual acceptance after deployment

- Submit a course containing at least two ready videos and a PDF. Sign in as admin, find it in the review queue, and open review content.
- Check its full description and ordered module/lesson list against the instructor's course.
- Play each video, switch lessons repeatedly, and confirm only the selected video remains.
- Open the PDF and verify the file belongs to the selected lesson.
- Inspect a lesson without a PDF and confirm the missing-file message.
- On a phone, select a lesson, scroll to its player, and verify no horizontal page overflow.
- Verify a learner and an unrelated instructor cannot open the admin review route or obtain unpublished media through the existing media endpoints.
- Publish a complete reviewed course or return it to draft, and verify the resulting status/audit record and instructor visibility.
- Confirm admin review playback creates no enrollment or learner-progress records.

## Release state

Implemented and mirrored into the original backend worktree. **Not deployed yet.** Keep this together with the pending instructor upload-status synchronization fix for the next requested release. The production-based checkout preserves the already deployed instructor-wide update permission behavior.
