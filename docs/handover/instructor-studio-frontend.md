# Instructor studio frontend handover

## Delivered

The protected Arabic RTL instructor workspace is available under `/studio`.
It is a persistent Next.js route layout, so navigation between the overview,
course library, and public profile preserves the studio shell. Every displayed
course, curriculum state, media state, enrolment count, and profile field is
read from the existing instructor-authoring services; no dashboard placeholder
data is used.

| Route | Instructor task | Backend connection |
| --- | --- | --- |
| `/studio` | Resume authoring from an actionable overview | `listInstructorCourses()`, `getInstructorStatistics()` |
| `/studio/courses` | Scan/open every owned course | `listInstructorCourses()`, `getInstructorStatistics()` |
| `/studio/courses/new` | Create a draft course | `POST /api/instructor/courses` |
| `/studio/courses/[courseId]` | Edit course details, curriculum, lesson preview/media, and publication status in one progressive workspace | Authoring course read plus all course/module/lesson mutation routes |
| `/studio/profile` | Update public instructor biography | `GET/PATCH /api/instructor/profile` |

## Authoring workflow

1. The create page shows all course fields in two concise groups: course basics
   and display information. Code, cover URL, short description, and description
   remain optional; only the slug-format and zero-price input rules retain
   supporting copy. The UI sends only the validated backend payload, converting
   SAR to halalas on the client. The server creates the course as a draft and
   the UI enters its workspace.
2. Once a course exists, its editor is content-first: curriculum and video work
   appear before the collapsed course-details panel. This keeps metadata out of
   the way during recurring lesson uploads while retaining it one clear action
   away.
3. Course details save through `PATCH /api/instructor/courses/:courseId` with
   adjacent Arabic pending, success, and recoverable error feedback.
4. The curriculum builder calls the protected create/rename/delete/order
   endpoints. It supplies labelled move-up/move-down controls for both modules
   and lessons, so the core ordering workflow works with mouse, keyboard, and
   touch rather than relying on drag-and-drop. Failed reorders restore the
   previous visible order.
5. Each lesson can be marked as the free preview and has a media-status
   control. The upload control requests `POST .../upload`, uploads directly to
   Bunny through `tus-js-client` using only the returned scoped credentials,
   then polls `GET .../video-status` until ready or failed. No video bytes or
   Bunny signing secrets pass through Next.js or remain in browser storage.
6. Draft/review courses offer submission and direct-publish requests. A
   `direct_publish_disabled` response explicitly guides the instructor to the
   review workflow. The backend remains authoritative for every transition.
7. The profile page permits only avatar URL, headline, and biography updates;
   the public name is visibly read-only.

## Security and data boundaries

- `requireRole(path, "instructor")` protects every server page. The existing
  authoring services enforce the instructor role and course ownership again at
  the data boundary.
- Client components call only `/api/instructor/**`. They receive DTO-shaped
  records and controlled API errors, never a Supabase client, raw database row,
  service-role credential, Bunny API key, or payment secret.
- Statistics show per-course enrolment counts only. There is no learner name,
  learner identifier, order, paid amount, revenue, or refund UI in the studio.
- Archived content is safely read-only. Deleting modules/lessons is visibly
  confirmed and depends on the backend's draft-only policy.

## Automated verification

Completed on 2026-09-16:

- `npm run lint` — passed with zero warnings.
- `npm run typecheck` — passed.
- `npm run test:backend` — passed: 40 files, 158 tests.
- `npm run build` — passed; all five `/studio/**` pages compile as dynamic
  server-rendered routes.
- `npm run verify:client-bundle` — passed; 61 client bundles contained no
  server-only variables or configured secrets.
- Added `lib/authoring/presentation.test.ts` to verify the studio's curriculum
  summary only derives module, lesson, and ready-media counts.

## Manual acceptance checklist

Use a real local user promoted to `instructor`; seeded identities intentionally
cannot sign in. Do not reset an active local database solely for these checks.

- [ ] At 1440px, 768px, and 360px, visit every studio route. Confirm RTL
  alignment, the active navigation item, visible keyboard focus, 44px controls,
  and no document-level horizontal overflow.
- [ ] As anonymous and learner users, request each `/studio/**` route. Confirm
  the sign-in/role-home redirect does not render studio content.
- [ ] Create a free draft, save metadata, refresh, and confirm every entered
  field still comes from the database. Attempt a duplicate slug and confirm the
  Arabic recovery message.
- [ ] Add two modules and multiple lessons. Rename, reorder each level with the
  visible controls, mark one preview, cancel a deletion, then confirm a safe
  deletion in a draft.
- [ ] With Bunny Stream configured, upload a small video. Confirm browser-to-
  Bunny progress, processing state, ready state, a recoverable failure, and
  that a second active upload is prevented.
- [ ] Submit a complete draft. Test direct publish with both the enabled and
  disabled platform setting; the disabled result must guide the instructor to
  review instead of implying publication.
- [ ] Update headline, biography, and avatar URL. Refresh the course catalogue
  page and confirm the public instructor block shows the new allowed data.
- [ ] Inspect the overview/library/browser network responses and confirm no
  learner identity, order, paid amount, or revenue field is rendered.

## Known runtime dependency

Direct upload is fully wired to the existing contract but its live happy-path
acceptance check requires configured Bunny Stream credentials and a library.
Without them, the UI preserves the provider-unavailable and recovery states;
it does not fabricate a successful media upload.
