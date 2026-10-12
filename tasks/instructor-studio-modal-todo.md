# Instructor studio implementation tasks

Plan: [instructor-studio-modal-plan.md](../docs/roadmap/instructor-studio-modal-plan.md).
Status: locally implemented and verified on 2026-10-11; owner/staging acceptance
remains pending. No staging deployment or GitHub push is claimed. Separate from
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
- [ ] Owner reviews actual dialogs before further polish.

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
| External acceptance | Owner, staging, actual Bunny transfers, real concurrent races, physical phones/Safari/screen reader pending | — |

Execution: [instructor-studio-execution.md](../docs/roadmap/instructor-studio-execution.md).
Manual tests and staging prerequisites:
[instructor-studio-modal-verification.md](../docs/handover/instructor-studio-modal-verification.md).

### Remaining external checks

- [ ] Apply reviewed migrations and web code to staging; repeat critical journeys.
- [ ] Exercise actual Bunny transfers and concurrent uploads; mocks are not provider evidence.
- [ ] Exercise simultaneous permission revoke/release/media finalization.
- [ ] Verify physical-phone keyboard, Safari and assistive technology.
- [ ] Collect owner feedback and sign off actual dialogs.
