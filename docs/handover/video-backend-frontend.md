# Video backend/frontend contract

Phase 4 uses Bunny Stream Player v2. The browser never receives Bunny API,
read-only API, token-signing, or Supabase service-role keys.

## Instructor upload

Call `POST /api/instructor/lessons/{lessonId}/upload` while signed in as the
course owner or an administrator. The response contains a Bunny TUS endpoint,
expiry, and scoped upload headers. Upload the file directly from the browser to
Bunny with `tus-js-client`; do not send video bytes to Next.js.

Use the response headers exactly as returned. Display upload percentage and
retry recoverable TUS failures. A second upload request returns `409` while the
current video is uploading or processing.

## Playback

Call `GET /api/lessons/{lessonId}/playback`. A successful response contains a
short-lived `playbackUrl`, `expiresAt`, and optional saved `progress`. Render the
URL in a Bunny Player v2 iframe. Do not persist or share the signed URL.

The endpoint returns `403` without lesson access and `409` while media is not
ready. Refresh the credential after expiry rather than modifying its query
parameters.

## Progress

Call `POST /api/lessons/{lessonId}/progress` approximately every 15 seconds,
on pause, and on ended/page exit:

```json
{
  "positionSeconds": 120,
  "revision": 2,
  "markComplete": false
}
```

Use the returned revision in the next write. A `409 progress_conflict` means a
newer write won; reload playback progress before writing again. The backend
marks a lesson complete at 90% watched, or when `markComplete` is true.

Use Bunny Player's `timeupdate`, `pause`, `ended`, and `seeked` events. Keep the
media surface left-to-right while the surrounding course interface remains RTL.

## Learner dashboard

Server-rendered dashboard code should call `getLearnerCourseProgress()` from
`lib/progress/queries.ts`. It returns one aggregated row per active enrolment,
including archived courses, without N+1 lesson queries.
