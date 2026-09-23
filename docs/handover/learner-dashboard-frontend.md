# Learner dashboard and course player handover

## Scope delivered

This slice connects an authenticated learner to their learning space and to a
protected course player. It adds the learner-only, idempotent free-course claim
RPC and connects the pre-existing checkout API to the public course page; it
does not expose payment, Bunny, or Supabase service credentials to the browser.

## Sprint status — 2026-09-15

### Completed today

| Area | Delivered result |
| --- | --- |
| Authentication boundary | Learner dashboard and player require a learner session. Guests are sent to sign-in with a return URL; other roles are redirected to their own home route. |
| Learner dashboard | `/dashboard` reads enrolled-course progress from the existing RPC/query layer and presents loading, empty, progress, archived, and continue-learning states. |
| Course learning view | `/learn/courses/[courseId]` supplies an RTL learning shell around an LTR video frame, course navigation, resume/progress saving, completion, retry, access-denied, and unavailable-video states. |
| Lesson navigation | Every lesson is selectable. Free/enrolled lessons load playback; locked lessons remain visibly locked and explain their enrolment requirement in the player area. |
| Course catalogue | `/courses` is database-driven and now follows the port-3000 catalogue treatment: a restrained heading, wide three-column grid, full-card links, compact code bands without the `EE` prefix, Arabic lesson counts, and price/meta footer. |
| Public course page | `/courses/[slug]` uses the refined shared Elam visual language, a reduced title scale, linked curriculum rows, free enrolment, a server-authoritative paid checkout, and a separate free-preview action where one exists. |
| Course library | `claim_free_course` grants a published zero-price course to verified learners exactly once. The free `ابدأ التعلّم` action claims it before navigating to the player, so it appears in the dashboard library. |
| Paid purchase result | The embedded Arabic Moyasar card form is initialized only from server-issued order data. Its callback verifies the provider payment before granting access, then returns the learner to `/dashboard?payment=…` with a clear result message. |
| Database catalogue | The port-3001 marketing landing now reads published course DTOs from Supabase rather than the copied landing mock data. Its featured course and grid use the same database source as the catalogue. |
| Local catalogue | The local seed includes six published Arabic engineering courses (`EE201`, `EE202`, `EE251`, `EE301`, `EE311`, and `EE340`). `EE201` has a zero price and all seeded lessons are free previews. |
| Quality checks | TypeScript, ESLint, 39 backend test files / 154 tests, and the production build pass. Live HTTP checks confirm `/courses` and a seeded course page render with status 200. |

### Remaining learner-dashboard work

| Priority | Remaining work | Why it remains |
| --- | --- | --- |
| High | Configure Bunny Stream and attach real Bunny video GUIDs to lessons. | The current seed intentionally has synthetic/no media identifiers, so the player layout and access path work but cannot show a real video. |
| High | Complete real-video acceptance tests: resume after refresh, automatic 15-second save, pause/end save, completion, and progress-conflict recovery. | These behaviours require a real Bunny video and the server-only Bunny credentials. |
| High | Run real Moyasar sandbox purchase acceptance tests. | The embedded form and verified callback/result flow are connected; a real sandbox card is still required to prove the provider redirect and webhook configuration in this local environment. |
| Medium | Add an authorised learner course-detail query for archived enrolments. | The dashboard can show an archived enrolled course, but the current public course policy does not expose its curriculum to the learner player. |
| Medium | Run responsive, RTL, keyboard, and screen-reader acceptance checks with real course/video data. | The UI has the required states and focus targets; final validation should use the configured video environment. |
| Low | Replace the local Arabic seed with verified institutional catalogue data before production. | The development records are intentionally safe demo data, not a confirmed university catalogue. |

### Current acceptance status

The dashboard, course library enrolment, course detail, paid checkout result state, locked-lesson behaviour, and protected data flow are ready for local product review. Video playback is blocked on Bunny Stream configuration; a real paid checkout acceptance test is blocked on valid Moyasar sandbox credentials and a test card.

| Surface | Route | Purpose |
| --- | --- | --- |
| Learner dashboard | `/dashboard` | Shows the learner's enrolled courses, completion percentage, completed lesson count, archived status, and a continue-learning action. |
| Course player | `/learn/courses/[courseId]?lesson=[lessonId]` | Shows a course outline, allows a learner to select accessible lessons, and plays an authorised lesson. |
| Catalogue entry | `/courses/[slug]` | Gives enrolled learners a continue-learning action, or signed-in visitors a direct free-preview action when the course has one. |

## Access and data flow

1. `requireRole(..., "learner")` protects both learner routes. An anonymous visitor is sent to sign-in with the requested URL in `next`; another role is redirected to that role's home route.
2. The dashboard is a Server Component. It obtains its display data from `getLearnerCourseProgress()` and never exposes Supabase credentials to the browser.
3. The course player is protected before it queries the published course DTO with `getLearningCourseById(courseId)`.
4. The browser requests `GET /api/lessons/:lessonId/playback` only after a learner chooses an accessible lesson. The backend determines whether the user is enrolled or whether the lesson is a free preview, and returns a short-lived signed Bunny URL.
5. The player sends `POST /api/lessons/:lessonId/progress` after approximately 15 seconds of new watch time, on pause/seek, on completion, and on page exit when there is unsaved progress. It sends the backend revision number and reloads playback data after a `409 progress_conflict` response.
6. A paid-course action sends only `{ courseId }` to `POST /api/checkout`. The server authenticates and verifies the learner role, creates the pending order using the database price, and returns the public form configuration. The browser passes that returned configuration to Moyasar's Arabic card form. The form receives no secret key and no browser-supplied price.
7. Moyasar redirects to `GET /api/payments/callback`. The server fetches and verifies the provider payment before granting enrolment, then redirects to `/dashboard?payment=…` so the learner sees the result state with their refreshed library.

The surrounding learning interface remains RTL. The embedded video container is explicitly LTR so the external player controls render correctly.

## Learner CRUD boundary

For this v1 slice, the learner has the backend-supported operations below:

| Operation | How it is used |
| --- | --- |
| Read | Read enrolled-course progress, published course content, and an authorised playback URL. |
| Update | Create/update their own lesson progress and completion state through the existing progress endpoint. |
| Create/Delete | Not applicable to learners in this product boundary. Course, module, lesson, and enrolment CRUD belongs to instructor, checkout, and administrator flows. |

## UI states covered

- Dashboard loading skeleton, empty enrolled-course state, course progress, and archived-course display.
- Free preview versus locked lessons for a learner without an enrolment. Every lesson can be selected; a locked lesson presents its enrolment requirement in the player area.
- Loading playback, access denied, video not ready, malformed/unavailable playback, retry, saving, saved, and complete states.
- Resume position from the playback response, manual completion, and optimistic completion label after a successful save.

## Local setup and known limitations

1. Start Docker Desktop, then from `backend/` run `npm run supabase:start` and `npm run dev`. The web app is `http://localhost:3001`; Supabase Studio is `http://localhost:54323`; local email is in Mailpit at `http://localhost:54324`.
2. Register and verify a fresh learner through the website. The supplied seed identities are database fixtures, not sign-in accounts.
3. The seeded course is published and includes a free preview, so its catalogue page supplies the free-preview entry point even when the learner dashboard is empty.
4. The seed's ready video identifiers are synthetic and the local environment does not include real Bunny Stream credentials. Consequently the UI and access/progress flow can be exercised, but a real embedded video requires a Bunny Stream library/video and the server-only Bunny variables described in `video-backend-frontend.md`.
5. The dashboard can display an archived enrolled course from the progress RPC. The player currently loads published course content only, because the public course read policy does not expose archived course structure to ordinary learners. Keep archived courses as a dashboard record until the backend exposes an authorised learner-course-detail query.

## Local Arabic catalogue seed

`supabase/seed.sql` contains six published Arabic courses that mirror the port-3000 landing placeholders: `EE201`, `EE202`, `EE251`, `EE301`, `EE311`, and `EE340`. `EE201` is the local free course: its price is zero and all of its seeded lessons are free previews, so an authenticated learner can open every listed lesson without an enrolment.

The same seed mirrors the port-3000 instructor mapping: `EE201`/`EE202` use
محمد الجعيدان (خريج), `EE251`/`EE301` use عبدالعزيز اسامة (طالب سنة رابعة),
and `EE311`/`EE340` use the explicitly labelled demo instructors. The public
course page reads the instructor through its database course DTO
(`course.instructor.fullName`, `headline`, and `bio`); it does not carry a
separate static instructor profile.

The port-3001 marketing landing calls `listPublishedCourseDetails()` on the server and passes those database DTOs to its featured-course section and course grid. It has no course-value copy of its own; the first zero-price course is featured when one exists.

The original draft, review, and archived fixture rows remain to preserve the database-policy test coverage. None of the seeded lessons contains a playable video URL; attach a real Bunny video before testing playback.

The seed executes only when the local database is reset. A reset removes local users and data, so do not run it while preserving a local account or test changes is important.

## Implementation and test references

- Free enrolment database rules: `supabase/migrations/202609140001_add_free_course_enrollment.sql`, `202609140002_restrict_free_course_enrollment_to_learners.sql`, and `202609140003_fix_free_course_enrollment_conflict_target.sql`.
- Free enrolment UI/API: `components/catalogue/FreeCourseEnrollmentButton.tsx` and `app/api/courses/[courseId]/enroll/route.ts`.
- Paid checkout UI/result: `components/catalogue/PaidCourseCheckoutButton.tsx`, `app/api/checkout/route.ts`, `app/api/payments/callback/route.ts`, and `components/learning/LearnerDashboard.tsx`.
- Catalogue/listing presentation: `app/(catalogue)/courses/page.tsx` and `components/catalogue/CourseCard.tsx`.
- Test coverage: free-enrolment service/route/database tests, course-card presentation tests, payment-callback route tests, and player completion-state tests.

## Manual verification checklist

1. Visit `/dashboard` while signed out. Confirm redirect to `/auth/sign-in` and, after a successful sign-in, return to `/dashboard`.
2. Sign in as a learner with no enrolments. Confirm the dashboard shows the empty state and that the catalogue link works.
3. Open a free published course while signed in. Select `ابدأ التعلّم`, then confirm it appears in `/dashboard` and opens `/learn/courses/<course-id>`.
4. Open a paid published course while signed out. Confirm `اشترك في المادة` sends the visitor to sign-in and preserves the course return URL.
5. Open a paid published course with a free preview. Confirm `اشترك في المادة` opens the Arabic Moyasar form after checkout preparation, while `شاهد الدرس المجاني` opens `/learn/courses/<course-id>?lesson=<free-lesson-id>` without granting the paid enrolment.
6. With valid Moyasar sandbox keys, complete a successful test-card payment. Confirm the callback shows the dashboard success message and adds exactly one course to the library. Repeat its URL and confirm it does not create a duplicate enrolment.
7. Confirm the player opens the free lesson, shows the RTL page with an LTR video frame, and marks paid lessons as locked for a learner without enrolment. Select a locked lesson and confirm its enrolment explanation appears.
8. With real Bunny configuration, play for more than 15 seconds, pause, refresh, and confirm the player resumes near the saved position.
9. Mark a lesson complete. Confirm the UI reports a saved completion and the dashboard count/progress updates after returning to it.
10. Open the lesson in two browser sessions, create progress in both, and confirm the stale session reloads rather than silently overwriting the other session after a progress conflict.
11. Test a processing/failed media lesson and a lesson outside the learner's access. Confirm a clear retry or access-denied state and no video URL is shown.
12. On a mobile viewport, confirm the curriculum moves below the player and all actions have a usable 44px minimum target.

## Implementation files

- `app/(learn)/dashboard/page.tsx` and `app/(learn)/dashboard/loading.tsx`
- `app/(learn)/learn/courses/[courseId]/page.tsx`, `loading.tsx`, and `not-found.tsx`
- `components/learning/LearnerDashboard.tsx` and `CoursePlayer.tsx`
- `lib/progress/course.ts`
- `app/(catalogue)/courses/[slug]/page.tsx`
