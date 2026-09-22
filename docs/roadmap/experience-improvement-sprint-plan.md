# Experience Improvement Sprint Plan

**Status:** Proposed for review; no implementation is authorized by this document yet  
**Prepared:** 2026-09-17  
**Source audit:** `docs/roadmap/end-to-end-experience-performance-plan.md`  
**Scope:** learner journey, instructor authoring journey, accessibility, payment reliability, and measured performance readiness

## 1. Purpose

This plan converts the experience and performance audit into small, testable vertical slices. The aim is to improve the complete path from discovery to learning, while making course authoring faster and safer without turning it into a wizard or a compliance checklist.

The existing `tasks/plan.md` and `tasks/todo.md` contain unfinished work for earlier dashboard efforts. They are intentionally not overwritten. After this proposal is approved, the selected first sprint can be added to the active tracker without destroying previous work state.

## 2. Product principles

1. **Drafting stays free-form.** An instructor can save an incomplete course at any time.
2. **Readiness is checked only at the publishing boundary.** It should not interrupt routine editing.
3. **Block only broken learner experiences.** Quality recommendations remain warnings.
4. **The backend is authoritative.** The UI explains backend rules; it does not invent a second definition of readiness.
5. **Preserve user intent.** Authentication, payment, and navigation should return people to the action they started.
6. **Measure before scaling infrastructure.** Optimize confirmed request and query costs before adding caches or services.
7. **Arabic-first and RTL-safe.** Copy, direction, pluralization, focus order, and responsive layouts are verified in Arabic.

## 3. What “course readiness” means

Readiness is not a quality score and is not a long list of content requirements. It is the smallest automatic check that prevents an instructor from submitting something that a learner cannot actually use.

### 3.1 Three levels

| Level | Meaning | Effect |
|---|---|---|
| Blocker | The course cannot provide a coherent learning experience | Submission is disabled until fixed |
| Warning | The course can work, but conversion or clarity may suffer | Instructor may submit anyway |
| Suggestion | Optional improvement or best practice | Never affects submission |

### 3.2 Proposed blockers

Only the following should prevent submission:

1. The course has at least one module.
2. The course has at least one lesson.
3. Every lesson included in the submitted course has playable content. With the current video-only lesson model, this means its video status is `ready`.
4. The existing core data rules pass: usable title, valid slug, and a valid non-negative price. These are already normal data-validity rules rather than new editorial requirements.

If text, live, audio, or downloadable lessons are introduced later, rule 3 should become “the lesson has ready content matching its content type.” We should not permanently encode “every lesson must have video” as a product assumption.

### 3.3 Proposed warnings, never blockers

- No course cover image.
- No subtitle or detailed description.
- Instructor profile has no headline, biography, or avatar.
- A paid course has no free preview lesson.
- The course is unusually short.
- A lesson has no optional description.

### 3.4 Explicit non-requirements

The first implementation will not require:

- a minimum number of modules beyond one;
- a minimum number of lessons beyond one;
- a minimum course duration;
- a cover image;
- a long description or minimum character count;
- an instructor biography;
- a free preview lesson;
- manual readiness checkboxes;
- a multi-step authoring wizard;
- completing course metadata again when adding a lesson.

### 3.5 Intended instructor experience

The instructor creates and edits normally. Near the publication controls, a compact summary says, for example, **“متبقي عنصران للإرسال”**. Expanding it shows the exact two blockers and any optional warnings. Each item links to the relevant editor section. The list updates automatically from saved data.

Draft saves remain available at all times. The submit button is disabled only when blockers exist. Warnings use calm language and can be ignored. The server repeats the same check atomically when submission is requested, so an outdated browser cannot bypass it.

### 3.6 Proposed readiness contract

The backend should expose one structured result used by both Studio and Admin:

```ts
type CourseReadiness = {
  canSubmit: boolean;
  blockers: Array<{
    code: string;
    message: string;
    target?: "details" | "curriculum" | "lesson" | "media";
    entityId?: string;
  }>;
  warnings: Array<{
    code: string;
    message: string;
    target?: "details" | "curriculum" | "lesson" | "profile";
    entityId?: string;
  }>;
};
```

The exact Arabic copy belongs to the presentation layer; stable codes are the API contract. Submission must calculate readiness and change status in the same database transaction.

## 4. Delivery sequence

The work is organized into four sprints. Each task is a vertical slice and should leave the product usable. Implementation pauses at every checkpoint for review.

### Sprint 0 — Measurement and shared contracts

This sprint prevents UX and performance work from being judged by intuition alone.

#### Task 0.1 — Define the course-readiness domain contract

**Description:** Add the typed readiness result, stable codes, and one server-side evaluator. This establishes the product rule before changing submission behavior or UI.

**Acceptance criteria:**

- [x] One readiness evaluator returns blockers and warnings from saved course data.
- [x] The four blocker rules and all non-blocking warnings match section 3.
- [x] Unit tests cover an empty draft, processing video, ready minimum course, paid course without preview, and missing optional metadata.

**Verification:**

- [x] Focused Vitest tests pass.
- [x] Typecheck passes.
- [ ] Review returned codes and Arabic presentation mapping with the product owner.

**Dependencies:** None  
**Files likely touched:** `lib/contracts/authoring.ts`, new readiness service under `lib/authoring/`, readiness tests  
**Estimated scope:** Medium (3–5 files)

#### Task 0.2 — Establish request and journey measurements

**Description:** Instrument the important routes and external boundaries so later optimizations have comparable before/after data. Record server duration, database duration where practical, Bunny/Moyasar/Resend duration, response status, and anonymized route labels. Do not log secrets or personal data.

**Acceptance criteria:**

- [x] Sign-in, catalogue, course detail, checkout callback, learner dashboard, course player, Studio overview, editor, and video-status routes have timing visibility.
- [x] Client Web Vitals are captured for public, learner, and Studio route groups.
- [x] A short measurement runbook identifies local limitations and production/staging procedure.

**Verification:**

- [x] Instrumentation initializes once and does not expose secrets.
- [x] A development request produces traceable timing output.
- [x] Build and client-bundle secret checks pass.

**Dependencies:** None  
**Files likely touched:** Next instrumentation entry, telemetry helper, selected route boundary, runbook  
**Estimated scope:** Medium (3–5 files)

#### Checkpoint 0 — Approve rules and baseline

- [x] Product owner approves the lightweight readiness policy.
- [ ] Baseline metrics are recorded before performance changes.
- [x] Typecheck, lint, focused tests, and build pass.

### Sprint 1 — Continuity and publishing safety

This is the recommended first implementation sprint. It removes journey breaks and adds safety without redesigning the whole product.

#### Task 1.1 — Preserve destination through registration and verification

**Description:** Carry the safe `next` destination across sign-in, registration, email confirmation, and the final authenticated redirect. A learner who began enrolment should return to that course instead of the home page.

**Acceptance criteria:**

- [x] Switching from sign-in to registration preserves a validated local destination.
- [x] Email confirmation preserves the same destination without permitting external redirects.
- [x] Invalid or absent destinations fall back to the appropriate dashboard.

**Verification:**

- [x] Redirect unit tests cover valid, encoded, missing, and malicious destinations.
- [ ] Manual flow: course → sign in → register → confirm → same course.
- [x] Existing sign-in route tests remain functional.

**Dependencies:** None  
**Files likely touched:** auth pages/form, register route, auth callback, redirect tests  
**Estimated scope:** Medium (3–5 files)

#### Task 1.2 — Enforce readiness atomically on submission

**Description:** Make the submit operation use the shared readiness evaluator inside the authoritative backend transaction. A stale or manipulated client receives structured blockers and the course remains a draft.

**Acceptance criteria:**

- [x] An unready course cannot transition from `draft` to `in_review` in the atomic database function.
- [x] A minimally ready course transitions once and returns its new state.
- [x] The failure response contains stable blocker codes and no partial state change.

**Verification:**

- [ ] Database tests prove the transition rules and ownership rules.
- [x] Route tests cover success, blockers, unauthorized access, and stale state.
- [ ] Existing admin review queue behavior remains unchanged.

**Dependencies:** Task 0.1  
**Files likely touched:** Supabase migration/function, submit route, publishing service, database/route tests  
**Estimated scope:** Medium (3–5 files)

#### Task 1.3 — Add a compact publication-readiness panel

**Description:** Show automatic blockers and warnings only beside the publication action. Keep the normal editor content-first and compact. Each actionable issue should take the instructor to the relevant field, lesson, or upload.

**Acceptance criteria:**

- [x] The collapsed state communicates ready/not-ready and remaining blocker count in one line.
- [x] Expanded items distinguish blockers from warnings and link to their targets.
- [x] The instructor can continue saving drafts regardless of readiness; only submission respects blockers.

**Verification:**

- [x] Component tests cover ready, blocked, warning-only, loading, and server-error states.
- [x] Semantic review confirms the native disclosure and links are keyboard and screen-reader operable.
- [ ] Manual Arabic RTL review at mobile and desktop widths.

**Dependencies:** Tasks 0.1 and 1.2  
**Files likely touched:** publication action component, editor composition, module CSS, component tests  
**Estimated scope:** Medium (3–5 files)

#### Task 1.4 — Protect unsaved instructor work

**Description:** Clearly distinguish saved, saving, and unsaved states. Warn before leaving an editor with unsaved form changes, while avoiding warnings during normal saved navigation or video processing.

**Acceptance criteria:**

- [x] Changed course or lesson fields show an unobtrusive unsaved state.
- [x] Internal navigation, browser history navigation, and tab close warn only when editable fields contain unsaved changes.
- [x] Successful save clears the warning and exposes a timestamp or concise success status.

**Verification:**

- [x] Tests cover dirty, saving, saved, failed, and retry states.
- [ ] Manual checks cover sidebar navigation, browser navigation, refresh, and upload-in-progress behavior.
- [x] No warning appears solely because Bunny is processing an already uploaded file.

**Dependencies:** None  
**Files likely touched:** course forms/editor, navigation guard hook, status component, tests  
**Estimated scope:** Medium (3–5 files)

#### Checkpoint 1 — Core continuity

- [ ] New learner returns to the course that triggered authentication.
- [ ] Empty/incomplete course submission is prevented without disrupting drafting.
- [ ] Minimally ready course submission succeeds.
- [ ] Unsaved instructor changes cannot be lost silently.
- [ ] Typecheck, lint, backend/database tests, build, and mobile/desktop manual review pass.
- [ ] Human review before Sprint 2.

#### Sprint 1 implementation record — 2026-09-17

- Authentication intent now travels as a server-validated local `next` path through sign-in, registration, confirmation resend, and the auth callback. Query strings and fragments are preserved; external destinations fall back safely.
- `submit_course_for_review` now performs ownership, draft-state, identity, module, lesson, and playable-media checks in one locked database operation. A blocked submission returns stable issue codes while leaving the course as a draft.
- The Studio publication area now derives live readiness from saved course data and local curriculum mutations. Its compact native disclosure separates mandatory blockers from optional improvements and links to the relevant details, curriculum, or lesson upload.
- Curriculum state is owned once by `InstructorCourseEditor`; the builder reports event-driven updates instead of updating its parent from inside a child state updater. This avoids React's cross-component render update warning while keeping readiness live.
- Course details and lesson/module title edits register independently with the Studio navigation guard. Saved, saving, dirty, failed, and timestamped-success feedback is visible; video upload/processing state is deliberately excluded.
- Studio links use Next.js `onNavigate`; refresh/tab close uses `beforeunload`; browser back/forward cancellation is restored through a capture-phase `popstate` guard.
- The Studio and admin shells expose a responsive sign-out action. Studio sign-out reuses the unsaved-work confirmation before ending the session, and failed requests remain retryable in place.
- Automated verification completed: 47 Vitest files / 208 tests, TypeScript, ESLint, production build, and client-bundle secret scan all pass.
- Pending local-environment verification: database pgTAP/lint and signed-in visual/manual flows. Docker Desktop's Linux engine pipe was unavailable (`dockerDesktopLinuxEngine`), so these remain unchecked rather than being reported as passed.

### Sprint 2 — Purchase reliability and accessibility

#### Task 2.1 — Load the payment widget only on purchase intent

**Description:** Keep the course page immediately usable and load Moyasar only after the learner chooses to purchase. Show a stable loading state and restore focus if loading fails.

**Acceptance criteria:**

- [x] Moyasar assets are not requested during initial course-detail rendering.
- [x] Clicking purchase starts one idempotent loader and displays clear progress.
- [x] Success, retryable failure, configuration failure, and cancellation are understandable and keyboard-accessible.

**Verification:**

- [x] Tests cover repeated clicks, script success, script failure, and retry.
- [ ] Network inspection confirms no initial Moyasar asset request.
- [ ] Focus moves to the payment region and returns appropriately on close/failure.

**Dependencies:** Task 0.2  
**Files likely touched:** checkout button, payment loader utility, styles, tests  
**Estimated scope:** Medium (3–5 files)

#### Task 2.2 — Remove receipt delivery from the payment redirect critical path

**Description:** Confirm payment and enrollment first, redirect the learner promptly, and deliver the receipt through a durable retryable job/outbox. Receipt failure must never make a successful payment look failed.

**Acceptance criteria:**

- [x] A confirmed payment grants idempotent enrollment without waiting for email delivery.
- [x] Receipt work is recorded durably and can be retried safely.
- [x] Repeated callbacks/webhooks do not duplicate enrollment, transactions, or receipts.

**Verification:**

- [x] Tests simulate slow/unavailable email delivery and still confirm access.
- [x] Retry and duplicate-event application tests pass.
- [ ] Callback timing is compared with the Sprint 0 baseline.

**Dependencies:** Task 0.2  
**Files likely touched:** payment confirmation/receipt services, migration, callback/webhook tests  
**Estimated scope:** Medium (3–5 files) per sub-slice; split migration and worker if needed

#### Task 2.3 — Correct landmarks, skip navigation, and form error focus

**Description:** Remove nested main landmarks, add a skip link, and make validation errors announce themselves and move focus to the first invalid field where appropriate.

**Acceptance criteria:**

- [x] Every page has exactly one `main` landmark and a working skip link.
- [x] Authentication, profile, course, and lesson forms announce error summaries and associate field errors correctly.
- [x] Dynamic checkout and disclosure controls have logical focus behavior.

**Verification:**

- [ ] Automated accessibility checks have no new serious violations.
- [ ] Keyboard-only smoke test covers public, auth, learner, and Studio flows.
- [ ] Screen-reader spot check covers an invalid form and readiness disclosure.

**Dependencies:** None  
**Files likely touched:** root/route layouts, shared form error utility, representative forms, tests  
**Estimated scope:** Split into two Medium tasks if more than five files are required

#### Sprint 2 implementation record — 2026-09-18

> **Review status:** Implementation is complete enough to proceed, but Sprint 2 is not product-approved. The owner will review it later because the live Moyasar account and final frontend payment activation have not been completed. Payment sandbox behavior, live asset loading, and the final purchase UX must be rechecked after Moyasar is activated; do not treat Checkpoint 2 as signed off yet.

- Moyasar CSS and JavaScript now load only after purchase intent through one idempotent loader. Loading, configuration failure, provider failure, cancellation, retry, and focus restoration have explicit states.
- Payment confirmation no longer awaits receipt delivery. A paid-order database trigger creates a one-row-per-order outbox record transactionally; callback and webhook paths schedule an immediate post-response attempt.
- A secret-protected receipt worker retries unsent outbox rows in bounded batches. Database leases and the stable provider idempotency key protect overlapping callback, webhook, and scheduled attempts.
- The global skip link now targets the single route-level `main` landmark. Nested public-page landmarks were removed, while public, admin, Studio, and standalone error shells expose the same `main-content` target.
- Authentication errors focus the first invalid field when available, and profile/course/lesson editor error summaries are focusable and announced. Server-provided profile and course field errors are associated with their controls.
- TypeScript, ESLint, all 218 application tests, the production build, and the client-bundle secret scan pass. Database pgTAP/lint is blocked because Docker Desktop's Linux engine pipe is unavailable; live Moyasar network inspection and keyboard/screen-reader checks remain part of Checkpoint 2 verification.

#### Checkpoint 2 — Trustworthy acquisition

- [ ] Paid purchase remains usable under slow widget and email dependencies.
- [ ] Successful payment reaches learning without a receipt-induced delay.
- [ ] Primary journeys pass keyboard and landmark checks.
- [ ] Typecheck, lint, tests, build, and payment sandbox verification pass.
- [ ] Human review before Sprint 3.

### Sprint 3 — Instructor efficiency and upload feedback

#### Task 3.1 — Generate slugs and simplify technical fields

**Description:** Generate a safe slug from the course title by default, preserve uniqueness server-side, and move the slug into an optional advanced control. Do not force instructors to understand URL syntax.

**Acceptance criteria:**

- [x] A new course gets a valid unique slug without manual input.
- [x] Advanced editing remains possible with immediate validation.
- [x] Existing course URLs are not silently changed when titles are edited.

**Verification:**

- [x] Tests cover Arabic titles, duplicate titles, invalid overrides, and title edits.
- [ ] Manual create-course flow requires only meaningful course information.
- [ ] Existing course links continue to resolve.

**Dependencies:** None  
**Files likely touched:** course schema/service, creation form, route, tests  
**Estimated scope:** Medium (3–5 files)

#### Task 3.2 — Make long curricula easier to operate

**Description:** Add collapsed module summaries and contextual lesson editing so instructors can scan a large course without scrolling past every field. Add low-risk efficiency actions such as duplicate lesson and quick-add multiple lesson titles.

**Acceptance criteria:**

- [x] Modules can collapse while retaining lesson count and processing/problem indicators.
- [x] Opening a lesson brings its editor into view without expanding unrelated lessons.
- [x] Duplicate and quick-add actions preserve explicit confirmation and ordering.

**Verification:**

- [ ] Tests cover collapse state, deep-link target, duplication, ordering, and partial failure.
- [ ] Manual check uses minimum, typical, and large curricula.
- [ ] Mobile editing remains possible without horizontal overflow.

**Dependencies:** None  
**Files likely touched:** curriculum builder, lesson form/editor, authoring route/service, styles/tests  
**Estimated scope:** Split into separate Medium tasks for layout and bulk actions

#### Task 3.3 — Make upload processing persistent and economical

**Description:** Keep uploads visible throughout Studio navigation, link each row back to its lesson, show last checked time, and reduce wasteful status polling. Prefer webhook updates, with visibility-aware exponential backoff as a fallback.

**Acceptance criteria:**

- [x] Upload and processing rows persist across client-side Studio routes and identify course/lesson.
- [x] Polling backs off approximately 5 → 10 → 20 → 30 seconds, pauses in a hidden tab, and resumes on focus.
- [x] Ready, failed, stalled, cancelled, and “file cannot resume after reload” states give accurate next actions.

**Verification:**

- [x] Fake-timer tests prove backoff, pause/resume, and cleanup behavior.
- [x] Webhook/provider status updates remove terminal uploads from the polling set.
- [ ] Multi-upload manual test covers navigation between courses and mobile layout.

**Dependencies:** Task 0.2  
**Files likely touched:** upload manager/provider, video-status client, webhook/state adapter, styles/tests  
**Estimated scope:** Medium slices; persistence UI and polling policy may be implemented separately

#### Task 3.4 — Show publishing capabilities before an action fails

**Description:** Retrieve the instructor's publishing capability with the course/editor data. Hide or disable direct publish when unavailable and explain the review path before the click.

**Acceptance criteria:**

- [x] Direct publish is offered only to authorized roles/capabilities.
- [x] Standard instructors see submission-for-review as the clear primary action.
- [x] Admin/reviewer states reuse the same readiness information.

**Verification:**

- [x] Role/capability and route tests cover standard instructor, direct-publish capability, and rejected unauthorized operations.
- [ ] Manual review confirms no permission is discovered only through an error toast.
- [x] Backend authorization remains enforced independently of the UI.

**Dependencies:** Tasks 0.1 and 1.2  
**Files likely touched:** authoring view contract, editor/publication component, publish route tests  
**Estimated scope:** Medium (3–5 files)

#### Sprint 3 implementation record — 2026-09-18

- Course creation now derives stable Latin URL slugs from Arabic or Latin titles. Duplicate generated slugs receive a deterministic numeric suffix, while explicit advanced overrides still receive immediate validation and conflict feedback. Editing a title never silently changes an existing URL.
- The curriculum builder now starts with compact module summaries, exposes one contextual lesson editor at a time, honors module/lesson hash links, duplicates lessons without copying provider media, and appends up to 50 lesson titles atomically in their entered order.
- Studio upload tracking remains mounted across client-side routes and stores active jobs locally. Rows identify the course and lesson, link back to the exact editor, show their last status check, and distinguish active upload, provider processing, ready, failed, stalled, cancelled, and browser-reload recovery states.
- Video status polling now uses one visibility-aware scheduler per active set: approximately 5, 10, 20, then 30 seconds, capped at 30 seconds. It pauses in hidden tabs, checks immediately when focus returns, and stops when no upload needs observation. Bunny webhooks remain the production fast path; the authenticated provider check continues to mirror state during local development.
- Cancelling an upload now aborts the local TUS transfer, removes the Bunny asset through the authenticated backend, and clears the lesson's provider state. A browser reload never claims that an unavailable local `File` object can be resumed.
- Publishing capability is loaded server-side with the editor. Review is the standard instructor path; direct publish is rendered only when the database setting enables it. The admin course queue now receives the same minimum structure/media readiness signal, and its database mutation rejects publication of incomplete courses.
- Automated verification passes: TypeScript, ESLint, 57 Vitest files / 242 tests, production build, and the client-bundle secret scan. The local pgTAP suite is pending because Docker Desktop's Linux engine pipe is unavailable and Supabase cannot start.
- Human review still required: create-course flow, existing-link continuity, minimum/typical/large curriculum behavior, multi-upload navigation across courses, mobile/RTL layout, and role-specific publication actions. Do not sign off Checkpoint 3 until these checks and the pgTAP suite pass.

#### Checkpoint 3 — Instructor workflow

- [ ] A first-time instructor can create, structure, upload, and submit without technical knowledge.
- [ ] A returning instructor can add lessons without reopening all course metadata.
- [ ] Large curricula and concurrent uploads remain understandable.
- [ ] Typecheck, lint, authoring/video tests, build, RTL responsive review, and role review pass.
- [ ] Human review before Sprint 4.

### Sprint 4 — Data-query efficiency and learning polish

#### Task 4.1 — Separate public catalogue data from viewer personalization

**Description:** Make shared published-course data cacheable and stream or fetch enrollment-specific state separately. Avoid forcing every public visit through redundant viewer lookups.

**Acceptance criteria:**

- [ ] Anonymous catalogue and course detail data do not require an auth round trip.
- [ ] Authenticated enrollment state remains correct and does not leak between users.
- [ ] Header/auth status and personalized CTAs retain stable loading states.

**Verification:**

- [ ] Cache-isolation tests cover two users and an anonymous request.
- [ ] Trace comparison shows fewer auth/database calls on public routes.
- [ ] No stale enrollment CTA after enrolling or signing out.

**Dependencies:** Task 0.2  
**Files likely touched:** catalogue queries, viewer/personalization boundary, course pages, tests  
**Estimated scope:** Split into Medium catalogue and course-detail slices

#### Task 4.2 — Query catalogue summaries directly

**Description:** Replace full nested curriculum reads used only to calculate card counts and duration with a database view/RPC or bounded aggregate query. Fetch full curriculum only on the course-detail page.

**Acceptance criteria:**

- [ ] Course cards receive lesson count and duration without transferring lesson rows.
- [ ] Landing featured courses do not load details for every published course.
- [ ] Summary values remain correct when lesson order/status changes.

**Verification:**

- [ ] Database and transformation tests cover empty and populated courses.
- [ ] Query plans and response payloads are recorded before and after.
- [ ] Catalogue visuals and Arabic duration/pluralization remain unchanged.

**Dependencies:** Task 0.2  
**Files likely touched:** migration/view or RPC, catalogue queries/contracts, tests  
**Estimated scope:** Medium (3–5 files)

#### Task 4.3 — Reuse request-scoped authorization context

**Description:** Stop repeating equivalent auth/profile/role reads within one server render or route operation. Use request-scoped memoization that never crosses users or requests.

**Acceptance criteria:**

- [ ] Studio overview, editor, learner dashboard, and course player perform one equivalent auth-context resolution per request.
- [ ] Authorization semantics and RLS remain unchanged.
- [ ] Request-scoped caching cannot share identity across requests.

**Verification:**

- [ ] Auth/authorization tests pass for learner, instructor, admin, and anonymous users.
- [ ] Trace comparison shows reduced duplicate calls.
- [ ] Concurrency test confirms identity isolation.

**Dependencies:** Task 0.2  
**Files likely touched:** auth context helper, instructor access helper, selected pages/services, tests  
**Estimated scope:** Medium slices by route group

#### Task 4.4 — Improve continuity inside learning

**Description:** Resume each enrolled course at its last active incomplete lesson and add clear previous/next lesson controls. Preserve explicit URL lesson selection.

**Acceptance criteria:**

- [ ] Dashboard resume opens the learner's most recent incomplete lesson.
- [ ] Previous/next controls respect curriculum order and course boundaries.
- [ ] Completed-course and first-lesson states have clear outcomes.

**Verification:**

- [ ] Progress/order tests cover partial, complete, empty, and reordered curricula.
- [ ] Manual keyboard and mobile checks cover lesson changes and browser history.
- [ ] Existing progress conflict/retry behavior still passes.

**Dependencies:** None  
**Files likely touched:** learner progress query, dashboard, player, tests  
**Estimated scope:** Medium (3–5 files)

#### Task 4.5 — Add discovery controls only when catalogue size warrants them

**Description:** Introduce search/filter/sort once real catalogue size makes scanning difficult. Do not add empty controls to the current small catalogue merely to look complete.

**Acceptance criteria:**

- [ ] A documented threshold or product decision triggers this task.
- [ ] Filters are URL-backed, keyboard-accessible, and work in Arabic.
- [ ] Empty and no-results states provide a clear reset action.

**Verification:**

- [ ] Query and UI tests cover combined filters, back/forward navigation, and no results.
- [ ] Performance remains acceptable with the target catalogue dataset.
- [ ] Mobile controls do not obscure course results.

**Dependencies:** Task 4.2 and catalogue-growth decision  
**Files likely touched:** catalogue query/route, browser component, filters, tests  
**Estimated scope:** Medium slices after scope is confirmed

#### Checkpoint 4 — Capacity and end-to-end release candidate

- [ ] Re-run scripted 10-, 20-, and 50-concurrent-user scenarios against a production-like environment.
- [ ] Compare p50, p95, error rate, database calls, external dependency time, and resource saturation to the baseline.
- [ ] Test anonymous browse, sign-in/register, free enrollment, paid checkout, learning, course authoring, submission, and admin review.
- [ ] Resolve only evidence-backed query/index/caching bottlenecks.
- [ ] Complete responsive, accessibility, RTL, failure-state, and recovery review.
- [ ] Record remaining risks and go/no-go criteria.

## 5. Load and capacity test plan

### 5.1 Scenarios

Use production-like seed data and realistic think time:

| Mix | Journey |
|---|---|
| 35% | Anonymous landing → catalogue → course detail |
| 20% | Sign-in/register and return to course |
| 20% | Learner dashboard → lesson playback/progress |
| 10% | Free enrollment or paid checkout initiation |
| 10% | Instructor dashboard/editor reads and saves |
| 5% | Video-status checks and admin review reads |

Payment capture and large Bunny uploads should use sandbox/stubbed boundaries during repeatable load tests; separately run a small real integration test for those providers.

### 5.2 Concurrency stages

1. Smoke: 1–2 users, validate correctness and scripts.
2. Expected early traffic: 10 concurrent users for 10 minutes.
3. Moderate traffic: 20 concurrent users for 15 minutes.
4. Stress target: 50 concurrent users for 15 minutes.
5. Short burst: ramp from 5 to 50 users around a course release.

### 5.3 Initial provisional targets

These are acceptance targets to review after the baseline, not claims about current performance:

- Server-rendered/app API p95 below 800 ms for ordinary database-backed reads in the production region.
- Mutation p95 below 1.2 s excluding third-party payment/video work.
- Error rate below 1% under the 50-user target, with zero authorization/data-isolation failures.
- No unbounded rise in database connections, memory, or per-upload polling.
- Core Web Vitals assessed at the 75th percentile, separated by mobile/desktop and route group.
- Payment confirmation remains correct and idempotent when email delivery is slow or unavailable.

If the deployment topology or network region makes these targets unrealistic, revise them from measured evidence before using them as release gates.

## 6. Release test matrix

Each sprint should add automated tests near its own feature. Before release, the following manual paths must also pass:

1. Anonymous learner opens a paid course, registers, verifies email, returns to the same course, pays, and enters the first lesson.
2. Existing learner starts a free course and immediately sees it in the dashboard.
3. Learner resumes an in-progress course and moves through lessons by keyboard and touch.
4. Instructor creates a minimal course, saves an incomplete draft, sees blockers, uploads a video, and submits when it becomes ready.
5. Instructor submits a course with warnings only and is not forced to add optional metadata.
6. Instructor navigates between Studio pages while multiple videos upload/process and can return to each lesson.
7. Instructor attempts to leave with unsaved form changes and receives an accurate warning.
8. Standard instructor never sees a misleading direct-publish action; privileged publisher can publish only a ready course.
9. Admin sees the same readiness information and can review the submission without contradictory status.
10. All paths are checked at narrow mobile, common mobile, tablet, and desktop sizes in Arabic RTL.

## 7. Deferred work and anti-scope

The following should not be mixed into the first sprint:

- a full visual redesign;
- changing the established color/type system;
- adding a complex course-quality scoring system;
- AI-generated course content;
- resumable local file uploads after browser reload, which requires a different browser/storage architecture and explicit privacy decisions;
- search/filter controls before catalogue scale justifies them;
- infrastructure scaling before measurements identify a bottleneck;
- new lesson content types before their product and schema contracts are defined.

## 8. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Readiness grows into an editorial checklist | High | Freeze blockers to learner usability; require explicit product approval for each new blocker |
| UI and submit endpoint disagree | High | One shared evaluator; server rechecks atomically |
| Video processing blocks submission for too long | Medium | Accurate state, webhook-first updates, link to affected lesson, retry/replacement path |
| Receipt decoupling loses email work | High | Durable outbox with idempotent retry, not an untracked fire-and-forget promise |
| Caching leaks personalized state | High | Cache only shared catalogue data; test multi-user isolation |
| Performance work optimizes local noise | Medium | Establish baseline and use production-like environment before architecture changes |
| Large task causes cross-feature regressions | Medium | Keep tasks to 3–5 files where possible and stop at checkpoints |

## 9. Decisions requested before implementation

The plan assumes the following; only corrections are needed:

1. A paid course without a free preview produces a warning, not a blocker.
2. A cover image, course description, instructor biography, and lesson description stay optional.
3. The current video-only model makes a ready video mandatory for every submitted lesson; this rule will evolve if new lesson types are added.
4. Draft creation and saving are never blocked by readiness.
5. Sprint 1 is the recommended starting point after the small Sprint 0 contract/measurement foundation.

## 10. Approval boundary

Approval of this document authorizes planning only. Once the priorities and readiness policy are confirmed, implementation should begin with Tasks 0.1 and 0.2, followed by Checkpoint 0. Task 1.1 then begins the first delivery sprint before submission enforcement and UI are changed.
