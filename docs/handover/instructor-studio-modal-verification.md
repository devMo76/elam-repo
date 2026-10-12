# Instructor studio: verification and staging handover

2026-10-11; updated 2026-10-12. Owner reviewed local updates; staging deployed.
Full authenticated/provider acceptance pending. See
[deployment evidence](../operations/instructor-studio-staging-deployment.md).
Scope: admin-enabled, non-destructive published edits and private additions.
Cover, descriptions and PDFs remain optional. Existing live media cannot be
replaced/deleted by instructors in this first release.

## Deployment prerequisites

1. Review this worktree; unrelated changes exist. Do not push all outstanding
   files indiscriminately or publish secrets/artifacts.
2. Back up staging and apply pending migrations in timestamp order through the
   normal Supabase migration workflow; never reset staging:
   `202610110001_published_course_edit_permission.sql`,
   `202610110002_enforce_course_detail_edit_policy.sql`,
   `202610110003_private_course_additions.sql`,
   `202610110004_pending_media_and_cleanup.sql`,
   `202610110005_curriculum_cascade_safety.sql`,
   `202610110006_preserve_reparent_contract.sql`.
3. Verify migration history/types/database checks, then deploy reviewed web code.
   The new application requires these columns/RPCs.
4. Editing defaults to disabled. Enable one disposable published course from
   `/admin/courses`; do not enable every live course for testing.
5. Test with separate admin, owning instructor, other instructor, learner and
   anonymous sessions; configure real staging storage/Bunny privately.

No new API key is introduced. Six migrations and web release were deployed on
2026-10-12; provider credentials and DNS were not changed.

## Owner acceptance checklist

| Journey | Expected result |
| --- | --- |
| Create course | Full initial details; optional fields may be blank; saved course opens content |
| Open course | Compact identity/status/counts and three dialog actions, not stacked forms |
| Details | Persistent Save/status; failed save retains input; successful save updates heading |
| Dirty dismissal | Escape/backdrop/close/route departure asks; declining keeps editor |
| Phone content | Lesson opens focused editor; Back returns to list; typed title survives reopening |
| Curriculum | Add/rename unit; single/bulk lessons; duplicate/reorder/delete drafts; reload persists |
| Readiness | Blockers link to relevant lesson; no mandatory PDF/description added |
| Navigation | Desktop sidebar; phone hamburger drawer, logo, studio name, links and sign-out |
| Loading | Genuine navigation/PDF/addition feedback; no reset of typed content |

## Published-course and learner checks

1. Disabled permission: instructor writes locked; existing content/PDF metadata
   remains inspectable. Direct API/database writes must also be denied.
2. Enable edits as admin: descriptive metadata editable; price/slug locked. New
   units/lessons are marked unpublished.
3. Before release, verify catalogue, course page, free preview, learner player,
   PDF/playback and dashboard progress never expose pending additions. Owner/admin
   can inspect them.
4. Missing/processing/failed video blocks release without damaging live content.
   Ready video can be released explicitly.
5. Existing lesson IDs, enrollment and watched history remain intact. Percentage
   may decrease after release because new lessons increase the denominator; the
   publication UI explains this.
6. Repeated release is idempotent. Revoke edits and try saves/releases/uploads
   again; server/database must deny them, not only hide buttons.
7. Existing live videos/PDFs cannot be replaced/deleted. Pending media remains
   mutable only while editing permission is enabled.
8. Exercise genuinely simultaneous revoke/release/PDF finalization/upload cancel
   in staging. Local transactional assertions do not prove concurrent load behavior.

## Real media/device checks still required

- Upload a genuine Bunny video, navigate among dialogs/courses/studio routes, and
  upload another video. Confirm both transfers/processing states remain tracked
  and panel links open the right lesson. An in-memory transfer is not expected to
  survive a browser reload or closed tab.
- Upload an actual PDF through `رفع الملف`; picker opens, dismissal is blocked
  during transfer/finalization, and saved attachment opens afterward.
- Verify provider/network failure, retries and revoked permission during transfer.
- Verify real publish/release followed by learner playback/PDF on the staging domain.
- Physical iOS/Android keyboard, rotation, short viewports, safe areas and zoom;
  Safari and keyboard/screen reader announcements. No full WCAG claim is made.
- Owner reviews concise Arabic copy and actual desktop/phone usability; record feedback.

## Reproduce local checks

From `backend/`:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:client-bundle
npm run test:studio:browser
```

Browser suite: existing local app on 3001, local Supabase on 54321/54322 and
Microsoft Edge. Non-local Supabase URLs are rejected. Disposable accounts/courses
are created and removed; development data is not reset. Curriculum CRUD uses real
local endpoints; PDF transfer and Bunny processing are mocked, not real-provider
acceptance. Ignored `test-results/` captures cover 320/360/390/768/1440px.

Results: 327 application tests/68 files; 12 browser tests; 436 database
assertions/29 files. Database regression used a separate current-schema clone with
synthetic seed data, preserving development seed drift. It is **not** a fresh
empty-project migration replay. Subsequently, 2026-10-12 CI passed fresh database
rebuild, seed, tests, lint and generated types; staging migrations applied successfully.
Lint, typecheck, build and client-secret scan passed.

Existing npm audit findings in `sharp` and `source-map-js` remain a separate
launch-security follow-up; no broad dependency fix was silently included here.
