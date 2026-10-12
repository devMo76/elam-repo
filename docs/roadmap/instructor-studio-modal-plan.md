# Instructor studio: editing, focused dialogs, and mobile navigation

Date: 2026-10-11. Status: locally implemented; staging and owner acceptance pending.
Task list: [instructor-studio-modal-todo.md](../../tasks/instructor-studio-modal-todo.md).
This proposal is separate from the unfinished production-launch plan.

## 1. Goal and scope

Make it easy for a شارح to create a course, add videos/PDFs, maintain an existing
course, and understand whether changes are saved or available to learners. Keep
the existing Arabic RTL design, logo, typography, colors, optional fields, and
short copy. Do not add new content requirements or long instructional paragraphs.

Requested changes:

1. Allow controlled updates after publication.
2. Replace the three scrolling links with focused modal workflows for المحتوى,
   تفاصيل المقرر, and النشر; restructure their contents for mobile and clarity.
3. Provide appropriate route/section skeletons and mutation feedback.
4. Rename the studio identity to `استوديو الشارح`.
5. Replace the small-screen horizontal navigation with a hamburger drawer.

Implementation was subsequently authorized by the owner, including non-destructive
published edits and additions. Staging/provider changes are not implied by this
document's completion. Launch blockers such as auth
verification feedback and commerce verification remain on their existing tracker.

## 2. Findings from the current implementation

| Surface | Current behavior | Planning consequence |
| --- | --- | --- |
| `InstructorCourseEditor.tsx` | Three anchor links scroll to permanently rendered sections; details are collapsed | Replace anchors with dialog triggers, not another layer over the same long page |
| Curriculum | `editable={course.status === "draft"}` | Drive editability from server capabilities rather than this one status check |
| Course-details backend | `updateInstructorCourse` filters out archived courses, not all non-draft courses | Audit and align rules across metadata and curriculum; UI restrictions alone are insufficient |
| PDFs | Route checks draft status for GET as well as mutations | Separate read permission from write permission; published attachments should remain inspectable |
| Database | Owner insert/update policies and draft-only deletion RPCs exist; publication transitions have separate controls | Audit the final policies/triggers from all migrations before making changes; do not loosen all owner policies blindly |
| Publishing | `instructor_direct_publish` controls direct publication | Do not reuse it as permission to edit live content |
| Uploads | Layout-level `InstructorUploadProvider` maintains video tasks across studio routes | Dialog closure must not remount or destroy this provider |
| Navigation | Existing navigation blocker protects unsaved forms | Dialog closing/switching must use the same dirty-state rules |
| Loading | Studio-level route skeleton exists | Extend selectively; do not rebuild working loading behavior or fake delays |
| Small screens | At 760px and below, sidebar becomes a sticky horizontal navigation row | Replace with a compact header and RTL navigation drawer |
| Identity | Visible and accessible labels use استوديو الشارح | Update both to استوديو الشارح |

Source review, not a fresh browser/device audit. No PRODUCT.md or DESIGN.md was
found in the backend file inventory. Existing studio components/styles are the
visual authority. Impeccable's context launcher could not run because its engine
cache was unavailable; planning uses the existing implementation directly.

## 3. Published-course editing: recommendation

Updating a published course is a good product feature. Silently removing access
or replacing a working video with an unprocessed one is not. Do not temporarily
turn a published course into a draft simply to unlock its editor: that can change
catalogue visibility and learner access.

### Proposed first-release policy

- Add an admin-only, per-course permission: `السماح للشارح بتحديث الدورة المنشورة`.
  Default off for existing published courses until an admin explicitly enables it.
- Draft authoring remains unchanged. In-review and archived courses remain
  read-only for instructors. Admin management remains a separate authorized path.
- Show the instructor a short, explicit status: updates allowed or locked. Show
  the admin setting and record who changed it and when.
- Permission permits correcting descriptive metadata and preparing added content.
  Price and public slug changes, deleting existing lessons/modules, removing an
  existing PDF, and destructive live replacements are not implicitly permitted.
  They require the existing admin path or a later approved revision workflow.
- Keep stable course/lesson IDs and enrolled learners' access/history. Adding
  lessons can change the progress denominator; explain this briefly in the publish
  confirmation and document the rule. Never reset watched lessons.

### Additions and replacements

New content needs a staging state separate from the live course status. An
unfinished lesson must not appear as a playable lesson in a published course.
Prepare new lesson metadata/video/PDF privately, then expose it through an explicit
`نشر التحديثات` action once the existing readiness rules are met. An instructor
allowed live updates can publish this bounded addition; optional descriptions and
PDFs stay optional. This is not a full versioning system for the whole course.

Published video/PDF replacement and deletion are deferred from this first release
by owner approval on 2026-10-11. They remain locked for instructors, including on
admin-enabled published courses. Uploading media for new, unpublished lessons is
still in scope, subject to the pending-content visibility and release safeguards.

A future media replacement workflow needs two references: current live media and pending replacement.
Keep the current video/PDF accessible until the replacement validates and is ready,
then swap atomically. Never overwrite or delete the original on upload start.
The current video upload flow must be audited before enabling future replacement;
it must not be assumed to already support this. This sprint ships descriptive edits
and prepared additions, with existing published media protected.

Database requirements may include a per-course permission, publication visibility
on newly prepared lesson content, and pending-media references. Determine the
minimal schema after auditing catalogue queries, playback/access RPCs, free-preview
access, instructor queries, admin review, progress totals, and upload finalization.
Every learner-facing query and RLS policy must exclude pending additions; a hidden
frontend row is not an access boundary. No service-role route may bypass the policy.

Alternative: full draft revisions with admin review for every live change. This
offers stricter moderation but is significantly larger and slower for instructors.
It is not the default recommendation for this bounded sprint.

**Owner scope approval (2026-10-11):** start with non-destructive descriptive edits
and new lessons on admin-enabled published courses. Defer replacement/deletion of
existing published videos and PDFs until a safe replacement workflow is ready.
New lessons must remain private until explicitly released; approval does not
bypass the database enforcement and verification gates below.

## 4. Course workspace and modal behavior

### Resting page

Keep a compact course heading, status, counts, save/publication state, and the three
obvious buttons. Preserve a useful course summary beneath them; do not show all
editable forms beneath the buttons. No duplicate scroll targets or giant stacked
forms. For a new course, `/studio/courses/new` still shows initial required/basic
fields directly. After creation, open the content dialog to add the first unit.
Subsequent visits open the compact summary, not a forced onboarding dialog.

### Shared dialog shell

One dialog at a time, with a clear title, close control, scrollable body, and action
footer where needed. A large bounded dialog on desktop; full-screen on narrow
screens with safe-area spacing and a footer above the keyboard. Avoid nested
modals. Internal step switches replace the body and provide a Back button.
Details and publishing dialogs may be narrower than the content workspace.

Use an accessible dialog primitive/native dialog evaluated against the existing
project: focus enters logically, stays inside, background becomes inert, Escape
uses the guarded close path, and closing restores focus to the opening button.
Dirty forms prompt before discard, including outside-click, Escape, dialog switch,
route navigation, and sign-out. Dismissal must not silently save or discard edits.
Only disable actions affected by a request; a video upload alone need not lock all
metadata editing. Do not lose state just because a dialog body is unmounted.

### Content dialog: المحتوى

- Unit/lesson list is the main view, with add-unit and add-lesson actions close to
  their context, clear empty states, and saved/processing/failed video status.
- Desktop may use a unit/lesson list next to the selected lesson editor; mobile
  uses list -> selected lesson -> Back. Large course lists must not squeeze every
  lesson form into a single mobile column.
- One selected lesson editor contains title, optional description if supported,
  preview flag, video upload/status, PDF upload/replace, and save controls. Do not
  promise description storage without checking the existing contract/schema.
- Keep current bulk-add, duplicate, reorder, delete confirmation, and unsaved-title
  functionality discoverable; respect published-course restrictions.
- Preserve the already implemented PDF button-to-picker immediate-upload flow.
- Video transfers continue through the layout provider after dialog closure.
  Keep global upload status visible above dialog/drawer stacking or deliberately
  summarize it in the dialog; do not create a second upload task.
- PDF uploads are component-owned today: until moved to a durable upload manager,
  block dismissal during upload/finalization with a short explanation. Do not claim
  they persist like video transfers.

### Details dialog: تفاصيل المقرر

Reuse existing fields/validation/backend. Present essential fields first, optional
description/cover/advanced fields without redundant guidance, and a stable save
action. Preserve optional fields; distinguish editable from locked fields for a
published course. Save errors stay in the dialog beside their fields. Successful
saves update the underlying heading/summary without a full-page reload.

### Publication dialog: النشر

Show actual server-derived course status, current readiness, and the one applicable
primary action: submit for review, direct publish, or release prepared updates.
Keep current platform publication permissions. Validation failures link to and open
the correct dialog and selected lesson, not an anchor hidden behind a closed modal.
No new readiness checklist, mandatory PDF/cover/description, or artificial steps.

## 5. Loading and mutation feedback

- Preserve studio-level loading; add route/section-specific skeletons only where
  data is genuinely pending. Use shapes matching heading/list/form proportions.
- Switching between already loaded dialogs should be immediate; no fake skeleton.
- During create/save operations, retain visible existing content and typed values,
  show the pending action and a small placeholder for the item being created, and
  prevent duplicate submission. Do not replace the entire editor with a skeleton.
- Insert an item only on server confirmation, or clearly identify optimistic items
  and roll them back on failure. Never leave a permanent skeleton after an error.
- Video bytes use real upload progress; processing uses an indeterminate status,
  not invented percentages. PDF states remain distinguishable from video states.
- Use aria-busy on the affected region, one meaningful live status announcement,
  decorative skeletons hidden from assistive technology, and reduced-motion styles.

## 6. Sidebar and mobile drawer

Desktop sidebar keeps its design and logo, renamed to `استوديو الشارح` in visible
text, accessible names, and applicable loading labels. Do not rename the learner
or admin dashboard accidentally. Wider terminology cleanup is outside this request.

At the existing 760px breakpoint, replace horizontal navigation with a hamburger
button in a compact header. The RTL drawer opens from the right, includes identity,
active links, return-to-site, and sign-out, and closes after successful navigation.
If the user declines an unsaved-change prompt, do not navigate or discard state.
Support focus containment/restoration, Escape/backdrop, scroll locking, safe areas,
44px touch targets, and no horizontal overflow at 320px. A modal editor and modal
navigation drawer must not both remain active; coordinate them through one overlay
owner. The layout upload provider must remain mounted through all menu changes.

## 7. Execution order and checkpoints

1. Approve editing boundaries and the interaction proposal.
2. Unify edit capabilities and enforce admin-controlled published permissions.
3. Establish private pending additions and safe visibility/media transitions.
4. Build shared dialog/state handling, then details, content, and publication slices.
5. Add mobile drawer/rename and targeted loading states.
6. Run security and browser tests, collect owner feedback, fix confirmed issues.
7. Document migrations, permission behavior, operational limits, and staging sign-off;
   deploy only the reviewed changes and do not mark the launch tracker complete.

Scope is split into focused tasks in the linked task file. Published editing is
the highest-risk dependency; modal UX can be delivered independently with current
permissions if policy decisions take longer.

## 8. Verification and acceptance

Automated: capability/status matrix; admin-only permission writes; owner/non-owner
authorization; database RLS and direct-request bypass; learner exclusion of pending
content; atomic media switch; stable enrollments/progress; dialog trigger semantics,
dirty-state closure, loading/error states, and existing publication readiness.

Browser: create course -> open content -> add unit/lesson -> upload video/PDF ->
switch dialogs -> save details -> publish/submit. Repeat for a published course
with edits disabled/enabled; confirm live learner access stays stable. Close a
dialog during a video transfer; confirm it continues. Verify PDF dismissal guard.

Devices: 320/360/390px phones, 768px tablet, desktop; Arabic RTL, long course/lesson
names, 50-lesson content lists, keyboard, screen-reader labels, reduced motion,
mobile keyboard, slow requests, failed saves, and network interruptions. Final
browser/device evidence must be recorded; source review and SSR markup tests alone
cannot sign off modal interaction or accessibility.

Commands during implementation: focused `npm run test:backend -- <files>`,
`npm run typecheck`, `npm run lint`, `npm run build`; `npm run test:db` for policy
migrations with a disposable/local database. Add browser test infrastructure only
after checking the repository's current tooling. Never reset the staging database.

## 9. Main risks

| Risk | Mitigation |
| --- | --- |
| Learners lose published access while editing | Keep published course state and current media intact |
| Pending lessons leak through catalogue/RPC/RLS | Audit every read path, enforce visibility in database, test direct access |
| Admin lock is bypassed or revoked during an upload | Server/database enforcement; recheck when finalizing/releasing changes |
| Modal unmount drops forms or uploads | Hoisted editor state, shared dirty guard, durable video provider, PDF dismissal guard |
| Too much complexity inside a mobile modal | List-to-editor drill-in, one overlay, clear back/close controls |
| Skeletons hide real content or failures | Local loading states, preserved forms, explicit recovery |
| Existing live-edit behavior changes unexpectedly | Migration defaults and regression/status tests before staging deployment |

## Review requested

Approve or amend the published-edit policy and the three focused dialog workflows
before implementation. The task list remains unchecked until implemented and
verified; document creation is not feature completion.
