# Sprint 3 — Instructor efficiency and upload feedback

Date: 2026-09-18  
Status: Implemented; automated application checks pass; database and human review remain open.

## Scope

Sprint 3 reduces technical decisions and repetitive scrolling in the instructor workflow. It covers generated course URLs, compact curriculum editing, persistent video feedback, and publication capability/readiness before an action is attempted.

Sprint 2 remains implemented but is not product-approved. The final Moyasar frontend integration, account activation, live assets, sandbox verification, and owner review are still pending.

## Delivered

### Course creation

- Slugs are generated server-side from Arabic or Latin course titles.
- Generated conflicts retry with `-2`, `-3`, and later suffixes.
- The slug override lives in an optional advanced disclosure.
- Explicit invalid or conflicting overrides still fail clearly.
- Changing a saved title does not change its URL.

### Curriculum operations

- Modules are collapsible and summarize lesson count plus processing/failure states.
- Only the selected lesson editor opens; a deep lesson link expands and scrolls to the correct target.
- Lessons can be duplicated directly after the source. Provider video identifiers and media state are deliberately not copied.
- Up to 50 newline-separated lesson titles can be appended atomically in input order.
- Mobile actions wrap instead of creating horizontal overflow.

### Video lifecycle feedback

- The upload provider remains mounted in the Studio layout, so jobs survive client-side navigation between Studio pages and courses.
- Active jobs are stored in local storage and identify/link to both course and lesson.
- Browser upload progress comes from TUS events; provider encoding progress comes from the authenticated status endpoint.
- Polling backs off from 5 to 10 to 20 to 30 seconds, pauses in a hidden tab, resumes immediately on focus, and stops after a terminal provider state.
- The UI distinguishes ready, failed, stalled (no provider progress for 30 minutes), cancelled, and an upload whose local file cannot resume after a browser reload.
- Cancellation is authorized on the backend, deletes the Bunny video, and resets the lesson media fields only for the owned asset.

### Publishing and review

- The editor loads the database-backed direct-publish capability alongside the course.
- Standard instructors see review submission as the sole primary path and receive a short explanation of what happens next.
- Direct publish appears only when the platform capability is enabled and the local readiness model is satisfied.
- Admin course rows show minimum publication readiness based on module, lesson, and ready-media counts.
- The admin database mutation independently refuses to publish an incomplete course.

## Verification completed

- `npm run typecheck` — passed.
- `npm run lint` — passed with zero warnings.
- `npm run test:backend` — 57 files, 242 tests passed.
- `npm run build` — passed on Next.js 16.3.3.
- `npm run verify:client-bundle` — 64 client files scanned; no configured server secret was found.
- Focused fake-timer coverage proves polling backoff, hidden-tab pause, focus resume, and cleanup.
- Focused route/service coverage verifies upload cancellation, capability mapping, admin readiness mapping, and the admin readiness error.

## Verification still required

The local database tests did not run because Docker Desktop's Linux engine was unavailable:

```text
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified
```

After Docker Desktop reports that the Linux engine is running:

```powershell
cd D:\06-Projects\14-elam_website\backend
npm run supabase:start
npm run supabase:reset
npm run test:db
npm run lint:db
```

`supabase:reset` is required before manual review because Sprint 3 adds authoring and admin-readiness migrations.

## Human review checklist

1. Create two Arabic courses with the same title; confirm their URLs are valid and distinct.
2. Change the first course title; confirm its existing URL is unchanged.
3. Exercise empty, normal, and large curricula; verify collapse, deep links, duplicate, bulk add, ordering, and mobile wrapping.
4. Upload two videos in different courses, navigate throughout Studio, hide/restore the tab, and confirm each row links to the correct lesson.
5. Reload during a browser upload and confirm the UI requests cancellation/reselection instead of claiming that the file is still transferring.
6. Cancel an active test upload and confirm the Bunny asset is removed and a new upload can start for that lesson.
7. Leave a processing test asset unchanged long enough (or use a controlled timestamp) to verify the stalled guidance.
8. With direct publishing disabled, confirm only review submission appears. Enable it as admin, reload the editor, and confirm direct publish appears only for a ready course.
9. In `/admin/courses`, confirm incomplete rows cannot be published and a ready reviewed course can be published.
10. Review all touched Studio and admin states at narrow mobile width and in RTL before signing off Checkpoint 3.
