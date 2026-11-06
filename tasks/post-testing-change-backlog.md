# Post-testing change backlog

Created: 2026-11-02, Asia/Riyadh.

Purpose: collect this and subsequent owner-reported changes while current testing
continues. Document requirements now; do not implement, deploy or mark them fixed
until the owner explicitly starts the post-testing implementation work.
Keep existing launch and instructor implementation trackers intact.

For each new item, record its date, affected workflow, reported behavior, expected
behavior, acceptance checks and status. Reports are not independently reproduced
unless evidence is explicitly recorded. Keep tokens, credentials and personal
data out of this file.

## PT-001: Instructor video preview after upload

Reported: 2026-11-02. Status: implementation authorized on 2026-11-06; implemented locally. Automated verification and production rollout are tracked in `docs/operations/video-playback-fixes-2026-11-06.md`. Real Bunny playback acceptance remains pending.
Area: instructor studio, course lesson/video authoring.

### Reported behavior

Video upload progress works correctly. Once upload and processing finish and the
video is ready, the instructor cannot see or watch their uploaded video in the
studio. The successful upload is not apparent or verifiable through playback.

### Expected behavior

Show a clear, discoverable playable preview associated with the correct lesson
when Bunny reports that the video is ready. The instructor should be able to
review their own content without opening Bunny's dashboard, enrolling as a learner
or publishing the course first. Make the uploaded/ready state apparent alongside
the preview. Preserve the working upload progress and dashboard persistence.

### Acceptance checks for later implementation

- [ ] A ready lesson video has an obvious playable preview in the instructor's
  course/content workflow, including a draft course.
- [ ] Playback shows the correct lesson video and offers usable video controls
  on desktop and mobile, including within the existing content modal if applicable.
- [ ] Preview remains available after closing/reopening the editor, refreshing,
  navigating away and returning; selecting another lesson cannot show stale video.
- [ ] Uploading, processing, ready and failed states are distinct. Completing
  the transfer alone must not falsely claim the video is playable.
- [ ] Signed playback/access expiry and provider errors have clear feedback and
  a safe retry/refresh path, without requiring another upload.
- [ ] Only authorized course owners/reviewers can obtain the preview. Draft and
  paid videos are not made public; no provider keys reach the browser.
- [ ] Existing upload progress, concurrent uploads, learner playback and live
  editing restrictions continue to work unchanged.

### Later investigation and verification

Inspect the instructor editor, upload manager, video-status response and existing
playback authorization before choosing an implementation. Determine whether the
gap is missing UI, missing instructor preview access or both; do not assume a
root cause from the report alone. Reuse existing Bunny integration where suitable.
Add focused permission/state tests and authenticated browser checks with a real
ready video, including processing/error and unauthorized-user cases. Document
findings, changes, test evidence and owner feedback when implementation begins.

### Implementation update — 2026-11-06

The existing backend already supports signed playback for course owners and administrators, including drafts. Added an inline ready-video preview to the actual studio lesson editor, including read-only published lessons. It has a loading skeleton, Arabic errors, retry/credential refresh, and stops playback when its lesson, module, panel or modal is no longer active. Upload/processing state continues to come from the persistent upload manager; no upload behavior, publication requirements or access policies were changed.

Browser regressions use the actual editor with mocked HTTP and provider frames. They cover desktop/mobile, draft and published read-only views, closing/reopening, refresh, readiness, expiry/error retry and aborted requests. The unchecked acceptance items above remain the owner's real-provider acceptance checklist, not a claim that every live scenario has already been exercised.

## PT-002: Learner players stack when switching paid lessons

Reported and implementation authorized: 2026-11-06. Status: fixed locally; deployment pending.

The video panel and PDF attachment were siblings with identical React keys. A browser regression reproduced the duplicate-key warning and two iframes after selecting the second lesson. Distinct playback/PDF keys now ensure the old player is removed. Bunny SDK initialization uses Next Script's `onReady` so progress events reconnect on subsequent player mounts; stale aborted playback responses are ignored.

Verification covers repeated switches, one player/PDF, next/previous, automatic completion after switching, locked lessons and delayed responses. Details, limitations and owner acceptance steps: `docs/operations/video-playback-fixes-2026-11-06.md`.

## Subsequent changes

Append future owner-reported changes as PT-003, PT-004, etc. Leave pending items
deferred until the owner authorizes implementation after testing.
