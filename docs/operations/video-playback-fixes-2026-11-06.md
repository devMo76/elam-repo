# Learner playback and instructor preview fixes

Date: 2026-11-06, Asia/Riyadh. Owner authorized implementation of both issues. Changes are local; production deployment and real-provider acceptance are pending.

## Learner duplication: reproduced cause and fix

`CoursePlayer` rendered `PlaybackPanel` and `LessonPdf` as siblings with identical lesson-ID keys. React cannot reliably reconcile siblings with duplicate keys. An isolated browser regression using the real component reproduced React's duplicate-key warning and an iframe count of two after selecting the second paid lesson.

The siblings now use distinct `playback-<lessonId>` and `pdf-<lessonId>` keys. Switching lessons removes the previous iframe and its PDF component. Existing listener cleanup remains in place. The player SDK uses Next Script's `onReady`, rather than one-time `onLoad`, to attach progress/completion listeners after each remount even when the SDK is cached. Aborted playback responses are discarded before updating state.

No payment, enrollment, progress persistence API, or lesson access rules were changed.

## PT-001: Instructor ready-video preview

The backend gap was not authorization: `GET /api/lessons/:lessonId/playback` already calls `get_lesson_playback_access` and issues short-lived signed Bunny credentials for authorized course owners/reviewers. The studio lacked UI that consumed it.

Added `InstructorVideoPreview` to the existing lesson editor. It:

- Appears above the PDF controls when the selected video's status is ready, including draft and read-only published courses.
- Uses the existing private, uncached playback endpoint without exposing provider keys or recording learner progress.
- Displays an inline skeleton while loading; shows Arabic API/network/readiness errors and a retry action.
- Rejects already expired credentials; provides an always-available refresh action once loaded to obtain fresh credentials without uploading again.
- Removes the iframe when switching lessons/modules, switching editor panels or closing the modal. Reopening obtains a fresh signed URL.
- Uses the persistent upload manager's current media status. Uploads continue independently when preview/editor UI closes.
- Preserves publication restrictions and published-media replacement/deletion restrictions.

The cross-origin Bunny player owns playback controls and internal provider error screens. The parent cannot inspect every iframe HTTP/player error. A refresh action is available, but automatic detection of all provider-side playback failures is not claimed.

## Verification

The tests use the actual React learner and studio components, production global styles and existing Vite/Playwright tooling. Next routing/script adapters, HTTP responses and Bunny iframe content are mocked. No existing user, course, payment or provider data was altered. The isolated fixture does not require Docker or real API keys.

Commands:

```text
npx playwright test tests/browser/video-players.spec.ts --reporter=line
npm run typecheck
npm run lint
npm run test:backend
npm run build
```

Backend suite: 364 tests across 71 files passed, including eight new shared playback-route tests. They verify that credentials are minted only after the access RPC returns an authorized ready lesson; unauthorized, invalid, absent, uploading, processing, failed and access-query-error cases fail closed. These mocks do not substitute for testing real database roles.

Final verification: all **11 browser regressions passed** (9.9 seconds); type checking and full lint passed; all **364 backend tests across 71 files passed**; the production build passed compilation, TypeScript and static generation. The production client-bundle secret scan passed across **67 files**. A final lint of the changed files and `git diff --check` also passed.

SQL policies and migrations were unchanged. Database tests were not rerun because the local Docker engine was unavailable. Live Bunny playback, real authenticated database roles and production rollout remain manual acceptance items.

Browser checks cover:

1. Repeated paid lesson switching leaves exactly one iframe/PDF and no React errors.
2. SDK completion listeners reconnect after switching.
3. Next/previous navigation and completion saving target the correct lesson.
4. Selecting a locked lesson removes the previous free-preview iframe.
5. Actual draft editor preview, switching, panel/modal close, reopen and page refresh at 390 px and 1440 px.
6. Published read-only preview without media replacement controls.
7. Processing/failed media creates no preview; becoming ready reveals it.
8. Authorization failures and expired credentials offer retry/refresh without upload.
9. Delayed learner responses cannot restore the previous selection.
10. Instructor loading skeleton and cancellation ignore late responses.

Screenshots are local ignored artifacts: `test-results/video-preview-studio-390.png` and `test-results/video-preview-studio-1440.png`. The mobile screenshot was visually inspected. Fixtures use the production CSS but system fallback fonts rather than loading the site's Google font build assets.

The initial development-server fixture required correction for Next adapter resolution and UTF-8 delivery before valid app assertions; these harness failures are not product regressions. The final fixture uses an in-memory browser bundle, avoiding development-server adapter/dependency races. The completion test waits for the selected iframe source before emitting its simulated ended event and uses keyboard activation for next/previous, avoiding click-coordinate timing during the site's smooth scrolling. Sidebar switching uses pointer clicks.

## Owner acceptance after deployment

- [ ] Hard-refresh the website to load the new client bundle.
- [ ] Using the learner account that already bought the two-lesson course, switch between lessons repeatedly. Only the selected video should remain, with one corresponding PDF link if attached. No second purchase is needed.
- [ ] Play both real videos; confirm the previous one stops when switching. Check next/previous and automatic completion at the actual end of each video, then refresh to confirm saved progress.
- [ ] As the owning instructor, open an existing ready lesson in a draft course. Verify that the preview plays its real Bunny video before publishing.
- [ ] Switch lessons and close/reopen the content modal. Verify correct video, no continuing audio from hidden players and successful signed-URL refresh.
- [ ] Repeat on a phone. Confirm video controls and fullscreen work and the modal remains usable.
- [ ] If testing a new short upload, confirm transfer/processing feedback remains persistent and the preview appears only after readiness. Existing ready videos suffice for initial review.

Production's separately documented network-blocking incident may affect access to the site or provider requests. Distinguish network/provider failures from component duplication; do not change payment or media permissions to work around connectivity problems.
