# Roles, instructor finance, and learner resources plan

**Status:** Proposed for review; no implementation is authorized by this document  
**Prepared:** 2026-09-20  
**Surfaces:** `/admin/**`, `/studio/**`, `/dashboard`, `/learn/courses/[courseId]`  
**Mode:** Operate — clarity, permissions, and reliable feedback take priority over decoration

## 1. Outcome

This release expands the existing dashboards without replacing their design system. It introduces an owner/supervisor hierarchy, department-scoped administration, instructor applications, optional instructor revenue visibility, owner/supervisor draft inspection, a focused add-content dialog, lesson navigation, and private PDF resources.

Small Arabic terminology changes are delivered first, but security-sensitive role changes are not treated as copy edits. Database authorization remains authoritative and every scoped screen must be tested with users from two different departments.

## 2. Confirmed current state

- The database currently has three roles: `learner`, `instructor`, and unrestricted `admin`.
- A profile has no department. A course has only a free-text `department` value.
- Instructor statistics expose enrolment counts only; no financial values reach Studio.
- Admin revenue is calculated from paid orders, but no immutable instructor-share snapshot exists.
- There is no instructor-application workflow.
- Admin can list courses but has no dedicated read-only draft preview.
- Lesson completion is already submitted automatically when Bunny emits `ended`; the requested learner work is to harden and clearly present that behavior.
- Lessons currently support video only. There is no attachment table, private resource bucket, or signed PDF endpoint.

## 3. Product and architecture decisions

### 3.1 Terminology

UI terminology changes do not rename database tables, TypeScript domain types, routes, or API fields.

| Current UI copy | New UI copy | Scope |
| --- | --- | --- |
| إجمالي التسجيلات | عدد المسجلين | Admin overview/statistics; metric becomes distinct enrolled learners, not raw enrolment rows |
| المقررات / مقرر | الدورات / دورة | Admin and Studio user-facing copy |
| مدرّس | شارح | Role labels, Studio identity, public/instructor-facing copy |
| الدور | الرتبة | Admin user filters, table headings, and mutation controls |
| مرحبًا | ياهلا | Studio welcome heading |
| مقرراتي | دوراتي | Studio navigation/library/back links |
| مكتمل | تمت المشاهدة | Learner lesson state and save feedback |

Copy changes must be applied from a centralized presentation dictionary where practical, then checked in context for Arabic grammar rather than by blind search-and-replace.

### 3.2 Rank hierarchy and department scope

The intended hierarchy is:

1. **Owner / manager (`owner`) — المالك:** unrestricted platform governance, financial settings, rank assignment, departments, all courses, all users, and all audit records.
2. **Supervisor (`supervisor`) — مشرف:** administers only the assigned department and its instructors, applications, courses, and content. A supervisor cannot create owners, change global financial settings, inspect another department, or alter their own rank/scope.
3. **Instructor (`instructor`) — شارح:** manages owned courses and public profile.
4. **Learner (`learner`) — متعلم:** browses, purchases, and learns.

Recommended migration path: add `owner` and `supervisor`, migrate existing `admin` profiles to `owner`, retain the legacy enum value temporarily for rollback compatibility, and stop offering it in new UI/API contracts. All existing `is_admin()`-style checks must be replaced by explicit owner-or-scoped-supervisor capability functions.

Departments become first-class records. Profiles receive an optional `department_id`; supervisors and instructors require one, while owners and learners may remain unscoped. Courses reference a department record instead of relying only on free text. Migration must normalize existing department values before enforcing foreign keys.

### 3.3 Instructor revenue

“Instructor revenue” means the instructor’s contractual share of successfully paid, non-refunded orders—not a payout balance. Store percentages as integer basis points, never floating-point values.

- Each instructor has a default share configured by the owner.
- A course may optionally override that share.
- The effective percentage and instructor amount are snapshotted when an order becomes paid so later split changes do not rewrite history.
- Refund/reversal handling subtracts the associated instructor amount.
- A global owner-only setting controls whether instructors can see financial data. When hidden, no amount or split is returned by the instructor RPC/API—not merely hidden with CSS.
- Payout requests, bank details, tax records, and settlement status are out of scope until a payout ledger is designed.

### 3.4 Instructor applications

A learner submits one pending application with department, short motivation, and optional experience links. The admin navigation shows a highlighted pending count. Owners can review all requests; supervisors can review only their department. Approval atomically changes the applicant to `instructor`, assigns the department, closes the request, and writes an audit record. Rejection requires a concise reason and permits a later reapplication according to a documented cooldown.

### 3.5 Draft access and transparency

Owners and same-department supervisors receive a read-only course inspection page covering details, curriculum, media/resource readiness, and submission blockers. They do not impersonate the instructor and cannot silently edit a draft in the first version.

Studio displays a persistent, calm disclosure near draft status: “يمكن لمشرف القسم ومالك المنصة الاطلاع على المسودة لأغراض الدعم والمراجعة.” This is shown before content is added, not buried in terms or only after review submission.

### 3.6 Add-content dialog

The course workspace receives one prominent **إضافة محتوى** action using an accessible native `<dialog>`/portal. The dialog is a short action surface, not another course-details form:

1. Choose “وحدة” or “درس”.
2. For a lesson, choose its module and enter the lesson title; preview status remains optional.
3. Create the item, close the dialog, expand/scroll to the new editor, and retain the existing upload controls there.

Course title, long description, price, cover, and slug never appear in this dialog. Existing compact inline/quick-add tools may remain for experienced instructors if they do not duplicate the primary action confusingly. Escape closes, focus returns to the trigger, background content is inert, errors stay inside the dialog, and unsaved input is confirmed before dismissal.

### 3.7 Learner completion and navigation

The existing Bunny `ended` listener remains the completion authority. Work in this release adds idempotency/race coverage, retries or clear recovery feedback, and the new wording “تمت المشاهدة.” A manual completion control remains as a fallback unless product review explicitly removes it.

Previous/next controls use the canonical flattened curriculum order. They update the `lesson` query parameter, preserve browser navigation, disable at boundaries, and never navigate a preview user into a locked lesson. Finishing a lesson marks it watched but does not autoplay the next video without an explicit user action.

### 3.8 PDF resources

The required feature is support for private PDF attachments. The recommended default is that attaching a PDF is optional per lesson; drafts and publication are not blocked by a missing PDF unless the owner confirms a new mandatory-readiness rule.

- Store metadata in `lesson_resources` and files in a private Supabase Storage bucket.
- Accept PDF MIME type and verified file signature only; enforce size, filename, ownership, and one active upload per resource.
- Instructors can upload, replace, title, reorder, and remove PDFs only on editable owned drafts.
- Enrolled learners and users entitled to a free-preview lesson receive short-lived signed URLs. Other users receive no bucket path or metadata.
- PDFs open/download through a clear resource list below the active lesson; the video player remains the primary focal element.

## 4. Ordered implementation tasks

### Phase A — Language and governance foundation

#### Task A1 — Centralize and apply the requested Arabic terminology

**Description:** Introduce shared role/course/progress labels and update Admin, Studio, and learner surfaces without changing internal domain names.

**Acceptance criteria:**
- [ ] Every requested phrase is changed in its intended surface and Arabic grammar remains natural.
- [ ] Admin `عدد المسجلين` reports distinct enrolled learners, with its DTO renamed to remove ambiguity.
- [ ] Search placeholders, empty states, confirmations, accessibility labels, and mobile navigation use the same terminology.

**Verification:** Focused presentation tests, full copy search, desktop/mobile/RTL review.  
**Dependencies:** None  
**Files likely touched:** presentation dictionaries, dashboard/page components, contract/reporting tests  
**Estimated scope:** Medium, split Admin and Studio/Learner copy into separate commits

#### Task A2 — Add department and rank foundations

**Description:** Add first-class departments, `owner`/`supervisor` ranks, profile scope, migrations/backfill, and generated database types.

**Acceptance criteria:**
- [ ] Existing administrators migrate safely to owner and existing courses map to departments.
- [ ] Supervisors/instructors require a valid department; owner/learner behavior is explicit.
- [ ] New records cannot reference unknown departments or create an unscoped supervisor.

**Verification:** pgTAP migration/backfill/constraint tests on a clean database and a copy containing current development data.  
**Dependencies:** None  
**Files likely touched:** migrations, seed, database types, role contracts  
**Estimated scope:** Medium

#### Task A3 — Implement capability-based authorization

**Description:** Replace binary admin checks with owner and department-supervisor capabilities across server pages, API routes, RPCs, and RLS.

**Acceptance criteria:**
- [ ] Owner can access every administrative resource.
- [ ] Supervisor can access only users, applications, courses, and content in the assigned department.
- [ ] Cross-department access, self-promotion, owner creation, finance/settings access, and direct table bypass are denied server-side.

**Verification:** Matrix tests for owner, two supervisors in different departments, instructor, learner, and anonymous users.  
**Dependencies:** A2  
**Files likely touched:** auth helpers, RLS/RPC migration, admin views/routes, authorization tests  
**Estimated scope:** Split into two Medium tasks: shared capability layer, then scoped admin queries

#### Task A4 — Adapt the Admin shell and user management to ranks

**Description:** Expose owner-appropriate global navigation and supervisor-scoped navigation; replace “دور” with “رتبة” and prevent unavailable actions before click.

**Acceptance criteria:**
- [ ] Navigation and page copy clearly explain whether the user is owner or department supervisor.
- [ ] Supervisors never see global settings/revenue or rank options they cannot assign.
- [ ] Owner rank changes require confirmation, audit logging, and safe last-owner protection.

**Verification:** Component/route tests plus owner/supervisor mobile and keyboard review.  
**Dependencies:** A3  
**Files likely touched:** AdminShell, users page/mutations, rank contracts/routes, styles  
**Estimated scope:** Medium

### Checkpoint A — Governance

- [ ] Cross-department and privilege-escalation tests pass at both RPC/RLS and route levels.
- [ ] Existing owner can still reach every current Admin function.
- [ ] Human review confirms rank names and existing-admin migration policy.

### Phase B — Instructor growth, finance, and oversight

#### Task B1 — Build instructor application submission

**Description:** Let a learner submit and track one instructor application from the account/dashboard area.

**Acceptance criteria:**
- [ ] Application records department, motivation, optional experience URL, status, timestamps, and reviewer outcome.
- [ ] Duplicate pending submissions are idempotently rejected and typed text survives validation/network failure.
- [ ] The learner sees pending, approved, rejected, and reapply states without gaining instructor access early.

**Verification:** Contract, RLS, route, and form-state tests.  
**Dependencies:** A2–A3  
**Files likely touched:** migration/RLS, contracts/service/route, learner application component/page  
**Estimated scope:** Split into backend and UI Medium tasks

#### Task B2 — Add the highlighted application review queue

**Description:** Add a pending-count badge and review page to Admin, scoped by owner/supervisor permissions.

**Acceptance criteria:**
- [ ] Pending requests are visibly highlighted without relying on color alone.
- [ ] Approval atomically assigns instructor rank/department and records reviewer/audit details.
- [ ] Rejection requires a reason; concurrent review cannot approve/reject twice.

**Verification:** Atomic RPC/concurrency tests, scope tests, and accessible badge/queue review.  
**Dependencies:** B1  
**Files likely touched:** review RPC/service/routes, AdminShell, application page/mutations  
**Estimated scope:** Medium

#### Task B3 — Create immutable instructor revenue attribution

**Description:** Add default/course split configuration and snapshot the effective share when a payment becomes paid.

**Acceptance criteria:**
- [ ] Amounts use integer halalas and percentages use basis points.
- [ ] Historical instructor earnings do not change when a later split changes.
- [ ] Refund/reversal and replayed payment events produce correct, idempotent net amounts.

**Verification:** Payment transaction pgTAP tests for paid, replay, refund, override, and split-change history.  
**Dependencies:** A2–A3; Moyasar domain contract, not live frontend activation  
**Files likely touched:** migration/payment RPCs, database types, payment tests  
**Estimated scope:** Medium

#### Task B4 — Add owner-controlled revenue visibility and Studio reporting

**Description:** Add an owner-only visibility setting and a Studio revenue page that returns data only when enabled.

**Acceptance criteria:**
- [ ] Hidden mode returns no financial fields from the instructor RPC/API.
- [ ] Visible mode shows effective split, gross paid revenue, instructor share, refunds/reversals, and net share by course/date range.
- [ ] Supervisor can view department-level operational counts but cannot change global visibility or splits unless explicitly delegated later.

**Verification:** Capability/contract tests, amount reconciliation against Admin reporting, hidden-state UI, mobile/RTL review.  
**Dependencies:** B3  
**Files likely touched:** settings migration/API, instructor revenue RPC/contracts/page, owner settings UI  
**Estimated scope:** Split into backend and UI Medium tasks

#### Task B5 — Add transparent read-only draft inspection

**Description:** Provide owner and same-department supervisor access to a dedicated instructor-draft preview while informing instructors of that policy.

**Acceptance criteria:**
- [ ] Reviewers see course details, ordered content, resource/media state, and readiness without edit controls.
- [ ] Cross-department and anonymous access return no draft data.
- [ ] Studio shows the disclosure on every draft and links submitted courses to their review state.

**Verification:** Role/scope route tests and manual instructor/reviewer comparison.  
**Dependencies:** A3  
**Files likely touched:** admin course detail query/page, review components, Studio disclosure  
**Estimated scope:** Medium

#### Task B6 — Add the focused “إضافة محتوى” dialog

**Description:** Add an accessible modal action for creating modules/lessons without reopening course metadata.

**Acceptance criteria:**
- [ ] The dialog contains only content-type, module, lesson title, and optional preview inputs relevant to creation.
- [ ] Successful creation closes the dialog and focuses/opens the new item; failures preserve input.
- [ ] Escape, focus trap/return, backdrop behavior, pending state, mobile layout, and unsaved-dismiss confirmation are correct.

**Verification:** React interaction tests plus keyboard, 360px, and RTL checks.  
**Dependencies:** Existing curriculum APIs; independent of B1–B5  
**Files likely touched:** course editor/curriculum builder, dialog component, styles/tests  
**Estimated scope:** Medium

### Checkpoint B — Instructor workflow

- [ ] Learner application → scoped review → approved instructor works end to end.
- [ ] Revenue visible/hidden modes are enforced by the backend and reconcile with orders.
- [ ] Reviewer draft access is read-only and disclosed to the instructor.
- [ ] Add-content dialog reduces scrolling without duplicating course metadata.

### Phase C — Learner completion, navigation, and PDFs

#### Task C1 — Harden automatic lesson completion and update its language

**Description:** Verify and harden the existing Bunny `ended` completion path, then replace completion copy with “تمت المشاهدة.”

**Acceptance criteria:**
- [ ] A genuine `ended` event records completion exactly once and updates course progress immediately.
- [ ] Concurrent periodic/pause/end saves cannot make progress flicker, regress, or create a conflict loop.
- [ ] Failure leaves a clear retry/manual-complete path and all completed labels read “تمت المشاهدة.”

**Verification:** Player-event and progress-route concurrency tests; real Bunny completion smoke test.  
**Dependencies:** None  
**Files likely touched:** CoursePlayer, progress client helper, player/progress tests  
**Estimated scope:** Medium

#### Task C2 — Add previous and next lesson controls

**Description:** Add explicit navigation around the player using curriculum order and access rules.

**Acceptance criteria:**
- [ ] Previous/next buttons show lesson names, disable at boundaries, and update the canonical lesson URL.
- [ ] Preview users skip or cannot enter locked lessons; enrolled users traverse all lessons across module boundaries.
- [ ] Buttons are keyboard/touch accessible and do not autoplay without consent.

**Verification:** Ordering/access unit tests and desktop/mobile browser navigation checks.  
**Dependencies:** C1 recommended, not required  
**Files likely touched:** CoursePlayer, player styles, navigation tests  
**Estimated scope:** Small–Medium

#### Task C3 — Add secure PDF resource storage and contracts

**Description:** Introduce private lesson PDF resources, validation, ownership/access rules, and signed delivery.

**Acceptance criteria:**
- [ ] Only validated PDFs within the configured limit enter the private bucket and metadata table.
- [ ] Instructor draft ownership controls upload/replace/delete; learner lesson entitlement controls signed read access.
- [ ] Bucket paths and service credentials never reach unauthorized clients; deletion cleans metadata and object safely.

**Verification:** Storage/RLS/RPC tests, malicious MIME/signature and cross-course access tests, contract tests.  
**Dependencies:** A3 for reviewer access; otherwise independent  
**Files likely touched:** migration/storage policies, resource contracts/services/routes, database types/tests  
**Estimated scope:** Split into storage foundation and API Medium tasks

#### Task C4 — Connect PDF management to the instructor editor

**Description:** Add upload, title, reorder, replace, and remove controls to the contextual lesson editor and add-content flow.

**Acceptance criteria:**
- [ ] Upload progress and validation are clear and do not interfere with video upload state.
- [ ] Resource order/title updates persist; destructive replacement/removal requires confirmation.
- [ ] Reviewers see resource readiness read-only and instructors understand whether PDFs affect publication.

**Verification:** Upload/state component tests and multi-resource mobile/RTL review.  
**Dependencies:** C3, B5; integrate with B6 if both are underway  
**Files likely touched:** curriculum lesson editor, resource manager, styles/tests  
**Estimated scope:** Medium

#### Task C5 — Display entitled PDFs in the learner player

**Description:** Show lesson PDFs below the active video with signed open/download actions and clear empty/error states.

**Acceptance criteria:**
- [ ] Enrolled learners and eligible preview users can open/download current signed URLs.
- [ ] Switching lessons updates resources; expired links refresh without reloading the whole course.
- [ ] Locked lessons expose neither resource names nor signed URLs.

**Verification:** Entitlement/expiry route tests, PDF keyboard/screen-reader checks, real private-bucket smoke test.  
**Dependencies:** C3  
**Files likely touched:** learning query/contracts, resource route, CoursePlayer resource panel/tests  
**Estimated scope:** Medium

### Checkpoint C — Learner workflow

- [ ] Video end → “تمت المشاهدة” → progress update works without manual refresh.
- [ ] Previous/next navigation works across modules and respects free-preview access.
- [ ] Instructor upload → reviewer visibility → entitled learner PDF access works end to end.

### Phase D — Release verification and documentation

#### Task D1 — Run the cross-role release matrix and update handovers

**Description:** Verify every new capability on a clean seeded database and realistic development database, then update operational and handover documentation.

**Acceptance criteria:**
- [ ] Typecheck, lint, unit/integration, pgTAP, database lint, production build, and client-secret scan pass.
- [ ] Owner, two departments/supervisors, instructor applicant, instructor, learner, and anonymous journeys pass.
- [ ] Desktop/mobile RTL, keyboard, focus, loading, empty, error, permission, and concurrent mutation states are documented.

**Verification:** Repository quality commands plus a signed human-review checklist.  
**Dependencies:** All accepted tasks  
**Files likely touched:** tests, handovers, operations guides, integration report  
**Estimated scope:** Medium

## 5. Recommended delivery order

1. A1 terminology (safe, visible baseline).
2. A2–A4 role/department foundation and governance checkpoint.
3. B1–B2 instructor applications.
4. B5 draft inspection and B6 add-content dialog.
5. C1–C2 learner completion/navigation.
6. C3–C5 PDF resources.
7. B3–B4 instructor revenue after the payment-domain snapshot design is approved; this does not require live Moyasar activation to implement or test locally.
8. D1 complete release verification.

## 6. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Treating supervisor scope as a UI filter | Critical data exposure | Enforce scope in RLS/RPC and routes; test two departments on every read/mutation. |
| Migrating existing admins incorrectly | Loss of platform access | Backfill current admin → owner transactionally; retain legacy enum compatibility and document rollback. |
| Revenue changes when split settings change | Financial inconsistency | Snapshot effective basis points and amount at paid transition; reconcile refunds/reversals. |
| “عدد المسجلين” remains a raw enrolment count | Misleading metric | Change query to distinct learners and rename DTO, not only label. |
| Modal becomes another long editor | Poor instructor UX | Keep creation minimal; open the created item in the existing contextual editor. |
| PDF storage becomes public | Content leakage | Private bucket, server-authorized signed URLs, short TTL, entitlement tests. |
| Automatic completion races periodic saves | Flicker/conflicts | Serialize/coalesce saves and make end completion idempotent and monotonic. |

## 7. Decisions to confirm before implementation

Recommended defaults are included so work can begin after review:

1. **PDF requirement:** support is required, but a PDF is optional per lesson and does not block publication. Confirm if every published lesson must instead include one.
2. **Existing administrators:** migrate them to `owner`; introduce `supervisor` as the scoped operational rank. Confirm the Arabic owner label should be “المالك” rather than “المدير”.
3. **Revenue visibility:** one global owner-only switch, with per-instructor default split and optional per-course override. Confirm whether visibility also needs a per-instructor override.
4. **Draft review:** first release is read-only for owner/supervisor. Direct administrative editing remains out of scope unless explicitly requested.
5. **Completion fallback:** keep the manual “تمت المشاهدة” action for provider-event failures, even though normal completion is automatic.

Implementation should pause after each checkpoint for human review.
