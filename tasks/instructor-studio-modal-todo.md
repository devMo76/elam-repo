# Instructor studio implementation tasks

Plan: [instructor-studio-modal-plan.md](../docs/roadmap/instructor-studio-modal-plan.md).
Status: locally implemented on 2026-10-11; owner-reviewed and staging deployed on
2026-10-12. Full authenticated/provider acceptance remains pending. Separate from
the production-launch tracker.
Each task is one focused implementation slice; split further if it exceeds about
five files, especially database or media lifecycle changes.

## A. Policy and safe live authoring

### Task 1: Confirm scope and audit editing boundaries (Small)
- [x] Owner approved admin-enabled, non-destructive published edits and additions; existing video/PDF replacement and deletion are deferred.
- [x] Map final RLS/triggers, API routes, PDF/video routes and learner read paths; record discrepancies.
- [x] Define draft/in-review/published/archived capability and operation matrix.
Verification: owner review of matrix and schema impact. Dependencies: none.
Files: plan, task list, capability specification/tests.

### Task 2: Add admin-controlled editing permission (Medium)
- [x] 2a: Write permission-storage migration, protected admin RPC/audit trigger, and database tests.
- [x] 2a verification: applied the single pending migration locally without reset; 15 permission tests passed and database types regenerated.
- [x] 2b API: implement protected admin permission endpoint, strict contracts, and grant/revoke/error tests.
- [x] 2b UI/capabilities: show the admin toggle and instructor capability response only after Task 3 enforcement; pending additions remain gated by Task 4a.
- [x] Persist a per-course permission with documented migration default and admin-only mutation.
- [x] Show the toggle in existing admin course management and record actor/time.
- [x] Return instructor capabilities without granting permission to change the setting.
Verification: migration/RLS tests, admin API tests, owner/non-owner checks.
Dependencies: 1; visible controls additionally depend on 3. Files: migration,
types/contracts, admin course service/route/UI. API and UI are separate slices.

### Task 3: Enforce the shared editing policy (Medium; split by endpoint family)
- [x] 3a course details: enforce owner/status/opt-in and commercial-field rules in service and database; preserve admin and draft publication paths.
- [x] 3a bypass protection: deny instructor live-to-draft escape and identity-field changes; recheck permission at database write time.
- [x] 3b curriculum: enforce module/lesson mutation rules, preserving draft CRUD and denying existing live changes.
- [x] 3c media/PDF: guard service-role mutations and separate inspection from modification.
- [x] Enforce capabilities for details, curriculum and service-role media/PDF mutations.
- [x] Separate inspection/read permission from mutation permission; do not lock metadata GET solely because a course is published.
- [x] Deny direct-request and database bypass, including permission revoked mid-workflow.
Verification: status/role/operation matrix tests and DB tests. Dependencies: 2.
Files: authoring capability/services, PDF/video access, policy migrations/tests.

### Task 4a: Prepare unpublished additions safely (Medium)
- [x] Add minimal pending visibility state without changing the live course to draft.
- [x] Update instructor/admin reads and every learner catalogue/playback/PDF/preview read boundary.
- [x] Preserve existing lesson IDs, enrollment and progress while preparing additions.
Verification: pending-content isolation in RPC/RLS/API tests. Dependencies: 3.
Files: migration, database types, read services and focused tests; split read families if needed.

### Task 4b: Release additions and protect replacements (Medium)
- [x] Implement explicit transactional release with existing readiness rules and permission recheck.
- [x] Keep published video/PDF replacement and deletion locked for this release; preserve existing media during all permitted edits.
- [x] Document progress denominator changes and prevent destructive instructor edits.
Verification: failed/processing/ready/revoked/idempotent release and learner regression tests pass; genuine concurrent staging races remain pending.
Dependencies: 4a. Files: media/release RPC or service, publication contracts, focused tests.

### Checkpoint A
- [x] Owner approves policy; API/database rules agree and direct bypass tests pass.
- [x] Learner access is stable and pending additions stay private.

## B. Focused course workflows

### Task 5: Dialog primitive and durable editor state (Medium)
- [x] Replace scroll links with triggers; create desktop/mobile dialog shell with one overlay owner.
- [x] Preserve form state and guard Escape/backdrop/switch/navigation against unsaved loss.
- [x] Provide focus containment, restoration, scroll locking and safe-area layout.
Verification: dialog browser keyboard/mobile tests and state tests. Dependencies: 1.
Files: dialog primitive/styles, CourseEditor, NavigationBlocker integration, tests.

### Task 6: Details dialog (Medium)
- [x] Move existing form into focused dialog; keep optional fields and backend validation.
- [x] Preserve failed-save values and update workspace summary after success.
- [x] Explain and disable only fields locked by the published-edit policy.
Verification: create/details/save/failure/close browser cases. Dependencies: 3, 5.
Files: CourseEditor, CourseForms, editor-state helpers/styles/tests.

### Task 7: Content dialog (Medium per sub-slice)
- [x] Introduce unit/lesson selection with desktop list/editor and mobile drill-in.
- [x] Retain add/bulk-add/duplicate/reorder/delete and media/PDF actions under capability rules.
- [x] Keep video transfer outside dialog lifecycle; guard component-owned PDF uploads from dismissal.
Verification: curriculum API regression and browser upload/close/reopen/error cases.
Dependencies: 3, 4a, 5. Files: CurriculumBuilder, lesson editor, PDF/upload integration/styles/tests.
Split list/selection, lesson form, and media integration into separate sessions if needed.

### Task 8: Publication dialog (Medium)
- [x] Preserve review/direct-publish permissions and existing readiness behavior.
- [x] Add applicable release-update action without new mandatory fields.
- [x] Readiness shortcuts open the correct dialog/lesson and successes update workspace status.
Verification: publication/status tests plus browser readiness-to-lesson workflow.
Dependencies: 4b, 5, 7. Files: PublicationActions, readiness panel, CourseEditor/tests.

### Checkpoint B
- [x] Local desktop/mobile save/CRUD journeys and simulated upload lifecycle checks pass; real provider and staging publication checks remain pending.
- [x] Closing/switching cannot discard changes or cancel video transfer unexpectedly.
- [x] Owner reviewed local dialogs and approved deployment on 2026-10-12; final staging acceptance pending.

## C. Navigation and feedback

### Task 9: Studio identity and mobile drawer (Medium)
- [x] Use `استوديو الشارح` in sidebar and related accessible/loading labels.
- [x] Replace narrow-screen horizontal nav with hamburger/right-side drawer; keep desktop sidebar/logo.
- [x] Preserve navigation blocking, sign-out and upload provider; coordinate dialog/drawer overlap.
Verification: 320px/phone/tablet/desktop, keyboard focus, declined navigation, breakpoint change.
Dependencies: 5. Files: InstructorShell/styles, loading label, overlay integration/tests.

### Task 10: Targeted loading and mutation states (Medium)
- [x] Add genuine pending route/section skeletons without artificial delays.
- [x] Keep content/typed values during mutations; show local pending additions and recoverable failures.
- [x] Provide real upload/processing states, aria-busy/live announcements and reduced motion.
Verification: slow-network/create/save/upload failure browser cases. Dependencies: 6–9.
Files: studio loading boundaries, workspace styles, mutation components/tests; split by surface.

## D. Release review

### Task 11: Verify, document and collect feedback (Small per verification batch)
- [x] Focused unit/DB checks, typecheck, lint and build pass with recorded results.
- [x] Run plan's browser/device/RTL/security matrix and record failures/retests and owner feedback.
- [ ] Document migration/permission/media limits, then deploy reviewed changes to staging and repeat critical journeys.
Verification: evidence register below. Dependencies: all implemented tasks.
Files: this task list, implementation notes, tests/runbooks as needed.

### Final checkpoint
- [x] All five requested changes meet acceptance; deferred replacement scope is explicitly agreed.
- [x] Database-backed data and automated pending-content isolation/media-preservation checks pass; real-provider acceptance remains pending.
- [ ] Owner signs off staging behavior; unrelated production-launch gates remain open.

## Evidence register

| Check | Result | Date |
| --- | --- | --- |
| Owner scope | Non-destructive edits/additions approved; live media replacement/deletion deferred | 2026-10-11 |
| Application | 327 tests across 68 files passed | 2026-10-11 |
| Database | 436 assertions across 29 files in isolated current-schema/synthetic database; no development reset | 2026-10-11 |
| Browser | 12 Edge tests; widths 320/360/390/768/1440, real local CRUD and simulated media | 2026-10-11 |
| Quality | Lint, typecheck, production build, client-secret scan and whitespace passed | 2026-10-11 |
| Owner review | Local updates approved; staging deployment authorized | 2026-10-12 |
| Deployment | Release b82f23f and six migrations live; HTTPS/auth guards verified | 2026-10-12 |
| CI | Fresh DB replay/tests/lint/types pass; quality passes except seven high audit findings | 2026-10-12 |
| External acceptance | Real Bunny/PDF, concurrent races, physical phones/Safari/screen reader and final staging acceptance pending | — |

Execution: [instructor-studio-execution.md](../docs/roadmap/instructor-studio-execution.md).
Manual tests and staging prerequisites:
[instructor-studio-modal-verification.md](../docs/handover/instructor-studio-modal-verification.md).

### Remaining external checks

- [x] Apply reviewed migrations and web code to staging; initial HTTPS/auth smoke checks pass.
- [ ] Repeat authenticated real-provider journeys and obtain staging acceptance.
- [ ] Exercise actual Bunny transfers and concurrent uploads; mocks are not provider evidence.
- [ ] Exercise simultaneous permission revoke/release/media finalization.
- [ ] Verify physical-phone keyboard, Safari and assistive technology.
- [x] Owner reviewed local dialogs and approved deployment; final staging sign-off remains open.

## E. Published-course maintenance extension — planned 2026-11-07

Plan: section 10 of [instructor-studio-modal-plan.md](../docs/roadmap/instructor-studio-modal-plan.md).
This extends the same instructor work; the unfinished production-launch tracker
and existing acceptance items are preserved. The November 7 update is planning,
not implementation. Earlier approval covered bounded non-destructive changes;
replacement publication must follow the safe design before controls are enabled.

Owner-confirmed amendment, 2026-11-07: **Allow updates is an instructor-wide
permission covering all their existing and future published courses.** No
course-level overrides. E0a–E0c below replace the earlier plan to reuse a writable
per-course flag. Historical completed tasks above describe the old implementation.

### E0. Verify the existing permission journey (Small)
- [ ] Reproduce the existing course-scoped behavior and inventory all API/RPC/RLS consumers before replacing it; identify configuration and request/policy failures separately.
- [ ] Prepare a legacy course-flag inventory grouped by instructor without changing real permissions; record which grants need explicit transition review.
Verification: focused edit-policy/admin permission tests and authenticated staging/local fixture; record evidence and exact active release.
Dependencies: none. Inspect: `lib/authoring/edit-policy.ts`, `lib/admin/courses.ts`, admin action/route and existing tests.

### E0a. Establish instructor-wide database authorization (Medium)
- [ ] Add the default-false admin-managed instructor permission and a shared capability helper; normal profile edits and direct owner writes cannot modify it.
- [ ] Enforce current instructor ownership/role and permission across published authoring RLS/RPCs; serialize permission revocation with publication and keep drafts/learner access intact.
Verification: SQL role/direct-write tests; two courses owned by instructor A and one by B; legacy enabled course flags cannot override the new disabled permission.
Dependencies: E0. Likely files: permission migration/helper, generated database types and focused SQL tests.

### E0b. Provide the single admin instructor toggle (Medium)
- [ ] Add an admin-only instructor permission endpoint/control in `/admin/users`, with audit records and confirmation covering all current/future published courses.
- [ ] Replace per-course toggles with inherited state/link; retire the legacy mutation path so it cannot silently create conflicting settings.
Verification: admin/non-admin API/UI tests; reject learner targets and self-grants; toggling one instructor does not affect another.
Dependencies: E0a. Likely files: instructor permission route/service, admin users/course controls and focused tests.

### E0c. Derive all studio/media capabilities from the instructor (Medium)
- [ ] Course DTOs, capability helpers and authoring/media prepare/finalize/release paths read the new authority; no duplicated writable per-course booleans.
- [ ] Existing/future published courses inherit the setting; current ownership/role changes take effect; prepared updates survive revocation but cannot be promoted until authorized.
Verification: API/browser capability matrix and source audit for legacy column references; stale UI and old course RPC calls cannot bypass instructor permission.
Dependencies: E0a–E0b. Likely files: authoring transforms/access helper, video/PDF authorization, contracts and focused tests; split remaining endpoint consumers into focused follow-ups if needed.

### E1. Make enabled/locked editing clear (Medium)
- [ ] Studio and admin show the same inherited instructor-wide permission state; locked content remains inspectable with a concise reason and no per-course toggle.
- [ ] Enabled course details save through the existing API, report live visibility and retain input on errors/revocation; optional fields and commercial locks remain intact.
Verification: owner/non-owner, enabled/disabled and revoke-while-open browser/API cases.
Dependencies: E0a–E0c. Likely files: instructor editor/details form, admin user/course presentation and browser regression.

### E2. Permit safe published title corrections (Medium)
- [ ] Owner with current permission can rename an existing lesson/module without changing IDs or media fields.
- [ ] Narrow database/API/capability rules continue to reject changes to provider metadata, visibility, ownership, reparenting and protected commercial fields.
Verification: SQL direct-write bypass tests, policy/route tests and instructor/learner browser read-back.
Dependencies: E0a–E0c. Likely files: focused migration, edit-policy helper, curriculum controls and focused tests.

### E3. Permit stable curriculum reordering (Medium)
- [ ] Validate the complete ordering ID set and allow permitted owner ordering without changing lesson/module identities.
- [ ] Concurrent changes, foreign IDs and permission revocation fail safely; enrollments, completion and lesson links survive.
Verification: ordering RPC SQL tests plus actual studio ordering and learner navigation checks.
Dependencies: E2. Likely files: ordering migration/RPCs, curriculum controls and focused SQL/browser tests.

### Checkpoint E-A: Non-destructive maintenance
- [ ] E0–E3, including E0a–E0c, meet acceptance; existing private additions/upload/release still work.
- [ ] Admin-reviewed transition grants are documented; one toggle covers multiple existing courses and a newly published course, with no legacy per-course override.
- [ ] Typecheck, lint, backend/SQL/browser tests, build and client-secret scan pass for the exact candidate.
- [ ] Review enabled/locked UX and deploy the reviewed slice; do not wait for replacement implementation to provide this usable release.

### E4. Define pending video revisions (Medium)
- [ ] Add versioned candidate persistence with owner/admin isolation and an explicit active/base revision relationship; backfill existing active media safely.
- [ ] Define typed prepare/status/preview/promote responses, idempotency and controlled conflicts; no active pointer changes during preparation.
Verification: migration replay, schema/RLS tests and contract tests.
Dependencies: E-A, replacement design review. Likely files: migration, video contracts, database types and schema/access tests.

### E5. Connect replacement upload and provider status (Medium)
- [ ] Prepare/upload a separate Bunny asset; route webhook/polling events to its revision without changing the published lesson's ready state.
- [ ] Duplicate/out-of-order events, cancellation and lost responses cannot alter another candidate or delete the active asset.
Verification: provider-mocked upload/status/webhook tests and a real short staging upload.
Dependencies: E4. Likely files: video upload/status/webhook services and focused adapter tests.

### E6. Secure preview and atomic video promotion (Medium)
- [ ] Owner/admin can preview the candidate; learners and non-owners cannot retrieve its credentials.
- [ ] Promotion verifies readiness/base revision/current permission under consistent database locks, changes the active pointer atomically, is retry-safe and records an audit event.
Verification: role SQL/API matrix; failed/concurrent/revoked promotion leaves the original playable; signed credentials remain private/uncached.
Dependencies: E5. Likely files: promotion migration, preview/promotion handlers, signer integration and focused tests.

### E7. Preserve learner progress across video versions (Medium)
- [ ] Keep completion/history; effective resume starts at zero when media version changes, including replacement with a shorter video.
- [ ] Stale player writes are rejected or reconciled explicitly and cannot overwrite the new version's progress; migrate old progress without bulk resets.
Verification: SQL/API/browser cases with two open sessions and existing completed lessons.
Dependencies: E6; ship alongside replacement activation. Likely files: progress migration/contracts/route, learner player and progress tests.

### E8. Add the replacement UX to the existing studio (Medium)
- [ ] Show active and pending states, correct candidate preview and a concise publish/discard action; closing the preview stops it while upload persists.
- [ ] Persistent jobs identify the correct revision and lesson; failed uploads retain the live video; mobile/keyboard interactions remain usable.
Verification: desktop/mobile browser tests and real staging Bunny preview/promotion; no added required course fields.
Dependencies: E6–E7. Likely files: upload manager, lesson editor, preview, publication summary and browser regression.

### Checkpoint E-B: Video replacement
- [ ] Prepare -> process -> preview -> publish works on a purchased staging course while the original video remains available until promotion.
- [ ] Permission, cancellation, provider retries, progress and concurrent-promotion tests pass; no unsafe controls ship early.
- [ ] Owner reviews the video replacement behavior and retention/progress defaults before production rollout.

### E9. Stage validated PDF replacements (Medium)
- [ ] Extend existing private resource metadata for immutable pending attachments; validate the candidate before promotion.
- [ ] Keep the existing attachment active through failed uploads/cancellation and block learner access to pending objects, including direct storage access.
Verification: bucket/RLS/API tests, malicious/oversized files and revoked-permission finalization.
Dependencies: E4 and resource-schema audit. Likely files: resource migration, PDF service/contracts and focused route/storage tests.

### E10. Preview/publish PDF updates in Studio (Medium)
- [ ] Existing PDF control supports add/replace on authorized published lessons with clearly separated active/candidate links.
- [ ] Explicit publication atomically switches the validated resource reference; discard affects only pending data; no extra course forms or nested modal.
Verification: real staging PDF upload/open/promote and mobile/error/retry browser tests.
Dependencies: E9. Likely files: PDF handler/promotion RPC, instructor PDF control, publication summary and tests.

### E11. Retention and recovery safeguards (Medium)
- [ ] Define a rollback window covering signed URL expiry/in-flight use; retain superseded assets until that window expires.
- [ ] Cleanup only removes unreferenced eligible candidates/superseded assets, is idempotent and never removes the current video/PDF.
Verification: reference/retention/job tests plus a documented rollback rehearsal using disposable staging assets.
Dependencies: E6 and E9. Likely files: cleanup/reference queries, worker entry point, tests and operations runbook.

### E12. Final acceptance and rollout (Medium)
- [ ] Verify enabled/locked owner, non-owner instructor, learner and admin; two instructors with multiple courses and future-course inheritance; profile self-grant/direct API/RLS bypass; paid learner access; two tabs; instructor-wide revoke during upload/publication; failed/out-of-order provider events.
- [ ] Verify existing videos/PDFs, new additions, replacements, mobile modal, progress preservation and clear Arabic feedback with real staging providers.
Verification: full quality/SQL/browser/build/client-secret gates; document candidate SHA, migration order, backfill counts, role/provider evidence and rollback steps. Deploy reviewed migrations before matching controls, then repeat production smoke checks without new purchases.
Dependencies: all released extension tasks. Files: verification handover, operations runbook and this evidence register.

### Final checkpoint E-C
- [ ] The supported published-maintenance operations work without unpublishing or losing paid access/history.
- [ ] No new required course fields, routine per-edit admin approvals or destructive content deletion were introduced.
- [ ] Owner acceptance and exact staging/production versions are documented; untested provider/race cases stay explicitly open.
