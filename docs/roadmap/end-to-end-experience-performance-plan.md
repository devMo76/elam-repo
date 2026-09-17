# End-to-end experience and performance plan

**Prepared:** 2026-09-17  
**Scope:** visitor entry, authentication, course discovery, purchase, learning,
instructor authoring, perceived performance, and capacity at 10–50 concurrent
users.

## Executive assessment

Elam's critical learner and instructor workflows are connected and coherent.
The product is past the prototype stage: authentication preserves a safe return
path for sign-in, the catalogue is database-backed, free and paid access are
separate, payments are verified server-side, learner progress is persisted,
and instructor authoring uses protected backend contracts.

The current experience is best described as **functional and trustworthy, but
not yet launch-polished at the transitions**. The largest UX gaps are not the
individual screens. They are the handoffs between screens and services:

- purchase intent is preserved through sign-in but is lost if the visitor must
  register and verify a new account;
- the paid-course call to action waits for a third-party payment script before
  the learner has chosen to pay;
- payment confirmation performs external and email work in the user's redirect
  path;
- instructors can submit a course without a visible readiness checklist;
- long-running video work has persistent progress, but not enough context or
  recovery information;
- public and authenticated pages perform more authentication/database work
  than their visible content requires.

### Current ratings

These ratings are based on the current source, backend contracts, automated
handover evidence, and static interface review. They are not substitutes for
moderated usability sessions or production Core Web Vitals.

| Area | Rating | Meaning |
| --- | ---: | --- |
| Learner journey | **7.1/10** | The complete path exists and recovery states are thoughtful; auth-to-purchase continuity and checkout need work. |
| Instructor journey | **6.8/10** | Authoring is capable and increasingly clear; readiness, bulk efficiency, and upload recovery remain weak. |
| Accessibility readiness | **6.5/10** | Good semantic controls and feedback exist, but landmark structure, skip navigation, focus management, and error focus need correction. |
| Performance readiness | **5.5/10** | Server Components and direct-to-Bunny uploads are strong foundations; caching, request deduplication, monitoring, and load evidence are missing. |
| Launch confidence | **6.3/10** | Suitable for controlled testing. Not yet evidence-backed for a public launch or a 50-user concurrency promise. |

## Evidence and limits

### Evidence reviewed

- `backend-integration-report.md` and both frontend/backend roadmaps.
- Learner, instructor, admin, catalogue, and video handover documents.
- Marketing, authentication, catalogue, checkout, dashboard, player, Studio,
  Supabase query, payment, video, and database migration source.
- Current Next.js 16.3.3 caching, streaming, authentication, instrumentation,
  and production guidance from `node_modules/next/dist/docs/`.
- The current Vercel Web Interface Guidelines, including focus, form, loading,
  navigation, content, image, touch, and localization rules.
- The existing production build artifacts: 32 emitted client chunk files total
  1,429,109 bytes uncompressed across the application. This is an application-
  wide build total, not a per-route transfer measurement.

### Measurement limits

- The site and local Supabase stack were not running during this review.
  Docker Desktop was unavailable, so no valid TTFB, LCP, INP, CLS, API latency,
  or concurrency numbers were collected.
- Browser performance tracing was unavailable in this session.
- Every performance concern below is therefore labelled as an architectural
  finding or hypothesis until the measurement phase confirms it.
- “50 users” must be defined as a traffic model. Fifty signed-in people with
  one request every 20 seconds is very different from 50 requests per second.

## Experience principles for the next sprint

1. **Preserve intent across every boundary.** If someone starts from a course,
   authentication, verification, checkout, and payment return must bring them
   back to that course or its next action.
2. **Show the next meaningful action.** Learners should always know whether to
   preview, enrol, pay, resume, or retry. Instructors should always know what is
   missing before review.
3. **Progressive complexity.** Course metadata is complete during creation but
   recedes during routine lesson work. Payment and publishing reveal detail at
   the moment it is needed.
4. **Feedback should name state and recovery.** “Saving,” “processing,” and
   “failed” are insufficient unless the interface also says what is safe, what
   will happen automatically, and what the user can do next.
5. **Shared data should be fast; personal data should be isolated.** Public
   catalogue content should not become fully dynamic merely because the header
   can show an account link.
6. **Measure before claiming capacity.** Use field telemetry for user outcomes
   and repeatable staging load tests for backend limits.

## Learner journey review

### Journey map

| Stage | Current experience | Rating | Main opportunity |
| --- | --- | ---: | --- |
| Landing and orientation | Clear Arabic identity, course-led marketing, real database content, direct catalogue entry. | 7.5 | Separate public content from session-dependent header work and add route-specific metadata. |
| Course discovery | Entire cards are links; price, instructor, duration, and lesson count are visible. | 7.5 | Add search/filter only when the catalogue grows beyond the current small set; improve loading state now. |
| Course evaluation | Syllabus, instructor, preview, price, enrol/continue action, and locked states are visible. | 8.0 | Strengthen purchase reassurance and remove semantic landmark problems. |
| Sign-in | Safe `next` validation, inline errors, password reset, resend verification, pending state. | 7.0 | Preserve intent through registration and email verification; add contextual “continue to…” messaging and password visibility. |
| Registration and verification | Clear success message and resend action. | 5.5 | Registration currently hard-codes verification return to `/`, losing the originating course/purchase path. |
| Paid checkout | Server controls amount/order; Moyasar renders in Arabic; errors are translated. | 5.5 | Load the gateway after intent, retain focus, show an order summary, and avoid disabling the purchase CTA while the script loads. |
| Payment return | Verified payment grants exactly one enrolment and shows success/pending/failure in the dashboard. | 6.5 | Shorten callback latency, automate pending reconciliation, and clear one-time query state after it has been announced. |
| Learner dashboard | Enrolled courses, progress, archived states, empty state, and resume links are clear. | 8.0 | Use Arabic count grammar consistently and make the “last active lesson” the primary resume target. |
| Lesson experience | Clickable curriculum, deep-linked lesson state, free/locked handling, progress bar, resume, conflict handling, and explicit completion. | 7.5 | Add previous/next lesson actions, transcript/resource affordances, and clearer save-failure recovery. |

### What is already strong

- Course browsing uses real backend data rather than landing-page placeholders.
- Course cards are fully clickable and communicate the minimum decision data.
- The course page exposes both purchase/enrolment and free-preview paths.
- The sign-in page validates redirect paths before navigating.
- Free enrolment and paid payment confirmation are enforced by server/database
  logic, not trusted browser values.
- The dashboard represents payment success, pending, failure, and sign-in-
  required states.
- The player keeps the selected lesson in the URL, saves progress, handles
  conflicting sessions, supports locked lessons, and provides retry states.

### Highest-priority learner issues

#### L1 — Purchase intent is lost during new-account registration (P1)

The paid/free course buttons send signed-out users to
`/auth/sign-in?next=/courses/<slug>`. The sign-in form respects this value, but
its “new account” link drops it. Registration then creates an email confirmation
URL whose `next` value is always `/`.

**Impact:** the highest-intent new learner must rediscover the course after
registration and email verification. This is a conversion and trust failure.

**Required outcome:** carry one validated relative `next` value through sign-in,
registration, resend confirmation, email callback, and the final course page.
Show a short contextual message such as “سجّل الدخول لإكمال التسجيل في …”.

#### L2 — Checkout readiness blocks the primary action too early (P1)

`PaidCourseCheckoutButton` loads Moyasar CSS/JS as soon as the course component
mounts and disables the purchase button until the gateway is ready.

**Impact:** a third-party network delay can make the main purchase action appear
unavailable before the learner has even requested checkout. It also adds
third-party work to every paid-course visit.

**Required outcome:** keep the purchase action enabled. On click, create the
order, then lazy-load the provider within a labelled payment region with a
visible loading state, retry action, order summary, and focus transfer.

#### L3 — Payment callback has a long synchronous tail (P1 performance/UX)

The callback verifies Moyasar, queries and mutates order state, and then awaits
receipt preparation and Resend delivery before returning to the dashboard.
The email path can wait up to ten seconds on the provider.

**Impact:** a successfully paying learner can experience a slow or apparently
stalled return. External email latency should not control access confirmation.

**Required outcome:** complete the verified order/enrolment transaction, redirect
immediately, and move receipt delivery to a durable outbox/background worker.
Payment access remains authoritative and idempotent.

#### L4 — Accessibility structure needs a sitewide correction (P1)

`PublicShell` creates a `<main>` landmark while catalogue, dashboard, and player
pages render another `<main>` inside it. The application also lacks a skip link.
Dynamic payment UI does not explicitly move focus or announce that the form has
replaced the button, and form validation does not focus the first invalid field.

**Impact:** screen-reader landmark navigation becomes ambiguous and keyboard
users can lose context during high-stakes transitions.

**Required outcome:** exactly one main landmark per page, a visible-on-focus skip
link, correct focus restoration/transfer, and deterministic first-error focus.

#### L5 — Discovery will not scale with the catalogue (P2)

The current unfiltered grid is appropriate for six courses. At 20–50 courses it
will become slow to scan and the current database shape will transfer nested
lesson data merely to calculate card totals.

**Required outcome:** introduce search and department filters when the catalogue
passes the agreed threshold, keep filter state in the URL, paginate results,
and return aggregate card fields from the database rather than nested lessons.

#### L6 — The learning loop needs stronger continuation (P2)

The player has a good curriculum and progress model, but no explicit previous/
next lesson controls and the dashboard resumes the course rather than the last
active lesson.

**Required outcome:** store/read the last active lesson, make “continue” open it,
and add previous/next actions that preserve progress and keyboard focus.

## Instructor journey review

### Journey map

| Stage | Current experience | Rating | Main opportunity |
| --- | --- | ---: | --- |
| Studio entry | Persistent shell, clear role boundary, summary counts, recent course list. | 7.5 | Replace general description text with course-specific next actions. |
| Course creation | All course fields are visible, grouped, optional fields are clear, draft creation is explicit. | 7.0 | Generate technical values, support actual image upload, and protect unsaved changes. |
| Curriculum building | One progressive workspace; accessible up/down ordering; inline CRUD and confirmations. | 7.0 | Reduce dense repeated controls and add bulk/duplicate actions for real course sizes. |
| Video upload | Direct-to-Bunny, persistent panel across Studio routes, retries, progress, processing state. | 7.0 | Link each upload to its lesson, back off polling, clarify reload/close behavior, and improve failure recovery. |
| Course readiness | Counts for modules and ready videos are visible. | 5.5 | Add a backend-authoritative readiness checklist and prevent empty/incomplete review submissions. |
| Review and publication | Submit/direct-publish actions and status messages exist. | 5.5 | Show whether direct publish is available before the click and explain review status/history. |
| Public profile | Real public profile fields are editable and connected. | 6.5 | Replace avatar URL entry with managed upload and show a public preview. |

### What is already strong

- Studio pages are protected on the server and ownership is checked again in
  the authoring services.
- The persistent layout makes route transitions feel like one workspace.
- Existing courses are content-first; course metadata stays one action away.
- Curriculum ordering has explicit touch and keyboard controls instead of
  relying on drag-and-drop.
- Destructive actions use inline confirmation and failed optimistic ordering
  restores the prior state.
- Video bytes upload directly to Bunny and do not pass through the Next server.
- Upload state remains visible across client-side Studio navigation.
- Server responses remain authoritative for publish and review transitions.

### Highest-priority instructor issues

#### I1 — There is no real readiness gate or checklist (P1)

The current `submit_course_for_review` database function changes an owned draft
to `in_review` but does not validate curriculum completeness or ready media.
The Studio UI shows counts but does not state what is required.

**Impact:** instructors can submit an empty or unwatchable course, and only an
administrator or learner may discover the problem later.

**Required outcome:** define readiness rules once in the backend and expose a
read-only readiness result to both Studio and admin review. At minimum decide
requirements for title/description, module count, lesson count, ready videos,
preview lesson, price, instructor profile, and cover. The submit mutation must
enforce the same rules atomically.

#### I2 — Technical fields create unnecessary work (P2)

Instructors manually enter an English slug and image URLs. These are platform
implementation details, not teaching work.

**Required outcome:** generate a unique slug from course title/code with an
advanced edit option, and replace cover/avatar URL fields with managed uploads
plus preview, validation, replacement, and removal.

#### I3 — Unsaved work is not protected (P1)

Course details and profile forms are controlled client state with explicit save
buttons, but they do not show a dirty state or warn before leaving.

**Impact:** a route change during editing can silently discard meaningful work.

**Required outcome:** display “تغييرات غير محفوظة”, disable save when unchanged,
and warn on page exit/navigation when dirty. Keep explicit save; do not introduce
background autosave until conflict and recovery behavior are defined.

#### I4 — Long curricula become control-heavy (P2)

Every lesson exposes title editing, preview state, upload state, two ordering
buttons, and deletion. This is usable for a small course but visually expensive
for 30–100 lessons.

**Required outcome:** collapsed modules by default except the active one,
single-row lesson summaries, contextual edit expansion, duplicate lesson/module,
and optional bulk lesson creation. Preserve explicit keyboard ordering.

#### I5 — Upload persistence needs a precise promise (P1)

The upload manager persists across Studio client navigation and stores status
metadata in local storage. The browser file transfer itself still depends on
the active tab/runtime; a full reload or closed tab cannot reconstruct the File
object automatically.

The status panel also polls every active non-client upload every five seconds,
including on every visibility change, and each status request performs ownership
checks plus a Bunny API request while processing.

**Required outcome:** explain the boundary in the UI: Studio route navigation is
safe; closing/reloading during browser upload is not guaranteed. Make panel rows
link back to course/lesson, record “last checked,” pause while hidden, refresh on
becoming visible, and use 5→10→20→30 second backoff with the webhook as the normal
completion path.

#### I6 — Publication options are discovered by failure (P2)

The direct-publish button is always shown for eligible statuses; instructors
learn that the platform disabled it only after requesting it.

**Required outcome:** read the platform capability before rendering actions,
show exactly one recommended next action, and place direct publish behind the
capability state. Add review submission time/status and admin feedback when that
backend capability exists.

## Cross-cutting usability and accessibility findings

### P1 before public launch

- Use one `<main>` landmark per page and add a skip-to-content link.
- Focus the first invalid form field and preserve entered values after all
  recoverable errors.
- Transfer focus into the dynamically mounted payment form and return it to a
  useful control on failure/cancel.
- Add unsaved-change protection to instructor forms.
- Ensure status changes that do not move focus use `aria-live="polite"`; urgent
  failures use `role="alert"` without duplicating announcements.
- Verify sticky headers do not cover focused anchor targets; add
  `scroll-margin-block-start` to editor and syllabus sections.
- Add captions/transcripts or a defined content policy for instructional video.

### P2 polish and scale

- Add route-specific titles/descriptions and social metadata for course pages.
- Remove the legacy duplicate `AuthForm` implementation after confirming no
  imports remain; `AuthPanel` is the current implementation.
- Add password reveal controls and Caps Lock feedback.
- Use correct Arabic pluralization for all course, lesson, module, enrolment,
  and upload counts—not only catalogue cards.
- Add loading UI for public catalogue and other database-blocked public routes.
- Test short, typical, and very long Arabic titles, instructor names, module
  names, and error messages at 360, 768, and 1440 pixels.

## Performance and capacity assessment

### Architecture strengths

- Next.js Server Components keep most data and rendering logic off the browser.
- Client components are limited to interaction-heavy forms, player state, and
  upload management.
- Video uploads go directly from browser to Bunny; the application server does
  not carry video bytes.
- Payment writes and free enrolment are implemented with database functions and
  uniqueness constraints, reducing duplicate-access risk.
- Progress writes use revision conflict detection.
- Course/module/lesson/enrolment tables already have important ownership and
  relation indexes.
- Static fonts use `next/font`, avoiding an external font request and reducing
  layout shift.

### Main architectural performance risks

#### P1 — Public pages are coupled to authentication and personalization

The global proxy verifies a Supabase user for every non-static request. The
public header then resolves the viewer again, and catalogue queries perform
another auth lookup to add `isEnrolled`. The landing page requests detailed
modules and lessons for every published course.

**Hypothesis:** public TTFB and backend request volume will grow faster than the
visible page complexity, particularly when the course count grows.

**Direction:** split shared public catalogue data from per-user enrolment state.
Cache shared summaries/details with explicit invalidation on publication/content
change, and stream a small account/enrolment boundary separately. Do not cache
private enrolment or role data globally.

#### P1 — Instructor reads repeat auth/profile work

The Studio layout uses `getViewer`, while course/statistics services independently
call `requireInstructorAuthoringContext`. The overview starts course and statistics
reads in parallel, but each establishes its own auth and profile context.

**Hypothesis:** Studio latency is dominated by upstream round trips rather than
React work. An approximate overview request can fan out to the proxy auth check,
viewer auth/profile, course-service auth/profile/query, and statistics-service
auth/profile/RPC. This count is architectural, not measured.

**Direction:** establish one request-scoped authenticated context and pass/reuse
it across server data functions. Keep authorization at each mutation boundary,
but avoid re-fetching the same user/profile within one render.

#### P1 — Catalogue data shapes over-fetch nested content

Course summary cards derive duration and lesson count by selecting all nested
lesson durations. The landing page selects full details for every published
course even though only one featured course needs a syllabus preview.

**Hypothesis:** response size, database aggregation, serialization, and RSC
payload grow linearly with total lessons rather than visible cards.

**Direction:** create a database-backed catalogue summary view/RPC containing
lesson count and duration sum. Fetch one featured detail separately. Paginate
the catalogue before it exceeds the small initial data set.

#### P1 — Video processing polling has provider amplification

One processing lesson produces one application request every five seconds.
Each request performs authenticated ownership lookup work and then calls Bunny.
Fifty simultaneous processing uploads could create roughly ten status requests
per second before retries or navigation focus events.

**Direction:** webhook-first state, visibility-aware exponential polling,
jitter, optional batch status reads, and provider timeouts/circuit breaking.

#### P1 — Payment confirmation includes non-critical email delivery

Receipt delivery adds multiple database/auth-admin reads plus a Resend request
to the payment callback's user-facing critical path.

**Direction:** use a durable receipt outbox/worker with idempotent retries. The
payment callback should finish once verified access is committed.

#### P2 — Caching and observability are not explicitly configured

`next.config.ts` does not enable Cache Components, and the project contains no
explicit cached public data layer, instrumentation entry point, RUM collector,
or documented latency/error SLO.

**Direction:** measure the current production rendering model first. Then choose
either narrowly scoped caching under the current model or a deliberate Cache
Components migration. Do not mix cache semantics casually, and never cache
personalized auth/enrolment results as shared data.

### What 10, 20, and 50 users probably mean today

| Concurrent active users | Current confidence | Expected behavior before optimization |
| ---: | --- | --- |
| 10 | **Moderate** | Likely acceptable for ordinary browse/learn traffic on hosted Supabase and a production Next instance. External provider latency may still dominate checkout/video. |
| 20 | **Low–moderate** | Probably functional, but duplicate auth/query work becomes visible in p95 latency. Several instructors processing video can create continuous status traffic. |
| 50 | **Unknown / at risk** | Fifty human users is not intrinsically high, but the current request fan-out and lack of measurements make a promise irresponsible. Bursty sign-ins, cold SSR, payment callbacks, or status polling need evidence. |

This is not a capacity result. It is a risk classification. The system may pass
50 users comfortably, but that must be demonstrated against the actual hosting
plan, Supabase tier/region, connection limits, and representative data.

## Measurement and load-test design

### Production-like environment

- Deploy Next and Supabase in geographically close regions.
- Use production builds (`next build` + `next start` or the real hosting
  platform), not `next dev`.
- Seed realistic volumes: 50 published courses, 10 instructor-owned courses,
  20 modules per large course, 100–200 lessons per large course, 1,000 learners,
  enrolments, orders, and progress history.
- Use synthetic test accounts and sandbox providers. Never load-test production
  payment creation or send real email.
- Exclude Bunny video bytes from application-server throughput tests; test the
  signed playback endpoint and provider separately.

### Observability foundation

Add before load testing:

- request ID propagated through Next routes, Supabase calls where practical,
  payment confirmation, video status, and logs;
- server spans/timers for auth, profile, catalogue, progress, checkout, payment
  verification, Bunny status, and email;
- route p50/p95/p99 latency, throughput, 4xx/5xx rates, and cold-start marker;
- database query latency, connection count, slow-query log, lock waits, RPC
  errors, and row counts;
- first-party RUM for LCP, INP, CLS, route, device class, connection type, and
  authenticated/public category without storing sensitive content;
- external provider latency/error metrics separated from internal latency.

### Core Web Vitals and page budgets

Initial targets, to be validated against the audience and Saudi mobile network
mix:

| Signal | Target |
| --- | ---: |
| LCP p75 | ≤ 2.5 s |
| INP p75 | ≤ 200 ms |
| CLS p75 | ≤ 0.10 |
| Public page TTFB p75 | ≤ 800 ms |
| Authenticated page TTFB p75 | ≤ 1.2 s |
| Internal mutation API p95 | ≤ 1.0 s |
| Provider-dependent API p95 | ≤ 2.5 s, with explicit timeout/recovery |
| Total initial page transfer | < 1.5 MB |
| Compressed route JavaScript | < 300 KB |
| Unhandled request error rate | < 1% |

Run at least three cold mobile navigations per representative route and report
median plus range. Do not compare one local trace directly with production
field p75.

### Load scenarios

#### Scenario A — Public browsing

- 40% landing page
- 30% catalogue page
- 30% course detail page
- Mix anonymous and signed-in learners
- Think time: 3–8 seconds

This scenario validates cacheability, catalogue payload size, auth/header cost,
and database read amplification.

#### Scenario B — Learner session

- Sign in once per virtual user
- Open dashboard
- Open an enrolled course
- Request playback credentials
- Save progress every 15–30 seconds
- Mark one lesson complete

Do not stream the Bunny media file through the load tool. Validate the app's
credential/progress path and test media delivery independently.

#### Scenario C — Purchase flow

- Prepare sandbox checkout orders at a controlled rate
- Replay signed provider fixtures or use an isolated sandbox callback budget
- Test duplicate callback/webhook ordering and pending states
- Stub email delivery for throughput testing; test Resend separately

Financial correctness tests remain separate from volume tests. Every order must
remain idempotent and every paid order must create at most one enrolment.

#### Scenario D — Instructor authoring

- Open Studio overview/library/course editor
- Create modules and lessons
- Rename/reorder content
- Simulate active processing status without uploading large video files
- Compare 1, 5, 10, and 20 concurrent instructors

This scenario should specifically measure auth/profile duplication and polling
amplification.

### Ramp profile and pass criteria

For each scenario:

1. Warm-up: 2 users for 2 minutes.
2. 10 concurrent users for 5 minutes.
3. 20 concurrent users for 5 minutes.
4. 50 concurrent users for 10 minutes.
5. Spike from 10 to 50 for 60 seconds.
6. Soak at 20 users for 30 minutes to catch leaks and polling accumulation.

Pass only if:

- route/API p95 stays within the defined target;
- unexpected error rate remains below 1%;
- no database connection exhaustion, lock queue, memory growth, or runaway
  provider traffic appears;
- payment and enrolment idempotency assertions remain true;
- progress conflict behavior remains recoverable;
- latency returns to baseline after the spike.

## Ordered implementation plan

The existing `tasks/plan.md` and `tasks/todo.md` contain unfinished admin and
instructor work. This roadmap intentionally does not overwrite them. When this
plan is approved, its tasks should be added as a separate checklist or merged
into the existing task tracker deliberately.

### Phase 0 — Establish truth

#### Task 0.1 — Add performance instrumentation

**Acceptance criteria:**

- Every critical route reports duration, status, request ID, and external-
  provider contribution without logging secrets or personal content.
- RUM records LCP, INP, and CLS by route/device category.
- A dashboard separates internal, Supabase, Moyasar, Bunny, and Resend latency.

**Verification:** one public browse, one learner playback, one checkout fixture,
and one instructor status poll produce correlated traces.

#### Task 0.2 — Create repeatable UX and load baselines

**Acceptance criteria:**

- Mobile and desktop lab results are recorded for landing, catalogue, detail,
  sign-in, dashboard, player, Studio overview, and course editor.
- Load scripts implement Scenarios A–D and the 10/20/50 ramp.
- The baseline report distinguishes measured data from hypotheses.

**Dependencies:** Task 0.1.

### Phase 1 — Remove launch-blocking journey breaks

#### Task 1.1 — Preserve learner intent through registration

**Acceptance criteria:**

- A learner entering from a course returns to the same course after sign-in or
  new-account verification.
- All `next` values use the existing safe-relative-path validation.
- Sign-in/register/resend pages explain the destination without exposing raw
  query strings.

#### Task 1.2 — Rebuild checkout as an intentional progressive step

**Acceptance criteria:**

- The purchase CTA is immediately usable and payment assets load only after
  learner intent.
- Amount, course, supported payment methods, loading, failure, retry, and safe
  cancellation are understandable before card entry.
- Focus and announcements remain correct when the payment form mounts.

#### Task 1.3 — Shorten payment confirmation and harden pending recovery

**Acceptance criteria:**

- Verified enrolment is committed before redirect.
- Receipt email is queued independently and retried idempotently.
- Pending dashboard state reconciles automatically with bounded backoff and a
  manual retry; success never creates duplicate enrolment.

#### Task 1.4 — Correct global accessibility structure

**Acceptance criteria:**

- One main landmark per page, working skip link, visible focus, anchor offset,
  first-error focus, and no focus loss in dynamic checkout/upload states.
- Keyboard-only completion of sign-in, purchase preparation, lesson selection,
  course creation, curriculum editing, and publication.
- Automated accessibility scan has no serious/critical violations; manual
  screen-reader pass covers the critical paths.

### Checkpoint A

- Moderated test: five target learners complete browse → auth → free enrolment
  and browse → auth → sandbox purchase without facilitator recovery.
- Median task success ≥ 90%; no participant loses the originating course.
- Lint, typecheck, backend tests, database tests, production build, and client-
  secret scan pass.

### Phase 2 — Make instructor authoring confidently self-service

#### Task 2.1 — Define and enforce course readiness

**Acceptance criteria:**

- A backend readiness function returns structured missing requirements.
- Studio shows the same checklist before submission; admin sees the same result.
- Submission rejects incomplete courses atomically with actionable field/item
  errors.

#### Task 2.2 — Protect work and remove technical input burden

**Acceptance criteria:**

- Generated unique slug with optional advanced override.
- Dirty/saved/error states and navigation warning for metadata/profile forms.
- Managed cover/avatar upload with preview and recovery replaces raw URL as the
  primary path.

#### Task 2.3 — Improve curriculum efficiency for large courses

**Acceptance criteria:**

- Typical editing exposes one active module without losing scan context.
- Duplicate module/lesson and multi-line bulk lesson creation are available.
- Existing keyboard/touch ordering remains fully functional.

#### Task 2.4 — Harden long-running uploads

**Acceptance criteria:**

- Global upload rows link to their course/lesson and show stage, progress, last
  check, retry, and safe-navigation guidance.
- Polling pauses while hidden, uses bounded exponential backoff and jitter, and
  stops on terminal state.
- Webhook completion is the normal production path; provider failures do not
  create request storms.

### Checkpoint B

- Three instructors create a 3-module/15-lesson course, upload two videos,
  leave and return through Studio routes, resolve one failure, and submit for
  review without developer assistance.
- The system prevents incomplete submission and clearly names every missing
  requirement.

### Phase 3 — Reduce request amplification

#### Task 3.1 — Split shared catalogue data from personalization

**Acceptance criteria:**

- Shared published summaries/details have an explicit cache and invalidation
  policy.
- Account and enrolment state stream or load separately without blocking the
  public shell.
- No cache entry can leak role or enrolment state between users.

#### Task 3.2 — Add aggregate catalogue queries and pagination

**Acceptance criteria:**

- Summary cards read aggregate lesson count/duration without receiving lesson
  rows.
- Landing loads summaries plus only the selected featured detail.
- Catalogue query time and payload remain bounded at 50+ courses.

#### Task 3.3 — Reuse request-scoped authentication context

**Acceptance criteria:**

- One server render does not repeat equivalent auth/profile queries across
  layout, page, and data services.
- API mutations still authenticate and authorize independently.
- Trace evidence shows reduced Supabase/Auth spans without weakening RLS or
  ownership tests.

#### Task 3.4 — Review indexes using measured query plans

Candidate indexes to validate with `EXPLAIN (ANALYZE, BUFFERS)` rather than add
blindly:

- published catalogue ordering/filtering on course status and publication time;
- large admin order search/filter combinations;
- any instructor/course ordering query not already covered by unique
  constraints;
- receipt retry scans and video status transitions.

### Checkpoint C

- Re-run equivalent lab and load scenarios.
- Publish before/after p50/p95/p99, request count per journey, DB query count,
  external-provider share, error rate, and Core Web Vitals.
- Fifty-user tests meet thresholds or produce a documented hosting/tier change
  backed by evidence.

### Phase 4 — Discovery and learning polish

#### Task 4.1 — Scale course discovery

Add URL-owned search, department filtering, result count, pagination, and clear
empty/reset states when catalogue size justifies them.

#### Task 4.2 — Strengthen the learning loop

Resume the last active lesson, add previous/next actions, define transcript and
downloadable-resource patterns, and ensure completion feedback updates both the
player and dashboard consistently.

#### Task 4.3 — Add product analytics and funnel review

Track privacy-safe events for course view, preview start, auth start/complete,
checkout start, payment result, first lesson, completion, draft creation, first
lesson creation, first upload, and review submission. Review drop-off by device
and route; never collect lesson content, card data, or secrets.

## Test matrix

### Learner usability

- Signed-out learner chooses a free course, registers, verifies, and reaches
  the originating course with one obvious next action.
- Signed-out learner chooses a paid course, signs in, reviews the exact order,
  completes sandbox payment, and sees it in the library.
- Gateway script fails, callback is pending, email fails, and duplicate callback
  arrives; each state remains understandable and financially correct.
- Learner resumes from the dashboard, switches lessons, refreshes, completes a
  lesson, and sees updated progress.
- Keyboard and screen-reader users complete the same tasks.

### Instructor usability

- New instructor creates a course without understanding slugs or image URLs.
- Instructor adds 15 lessons quickly, reorders them, marks a preview, uploads
  video, navigates elsewhere, and returns to the right lesson.
- Reload/close behavior is accurately communicated during active upload.
- Incomplete submission names missing work; complete submission succeeds once.
- Unsaved metadata cannot be lost silently.

### Responsive and content stress

- 360, 390, 768, 1024, and 1440 pixel layouts.
- 200% text zoom and browser zoom.
- Long Arabic titles/names/descriptions, missing optional data, 0/1/2/3/10/11+
  counts, slow network, offline transition, and provider timeout.
- 100-lesson course and 50-course catalogue.

### Automated quality gates

- ESLint and TypeScript.
- Existing backend/unit/database test suites.
- Playwright end-to-end critical journeys.
- Accessibility scan plus manual keyboard/screen-reader checks.
- Production build and client-secret scan.
- Repeatable Core Web Vitals lab run and 10/20/50-user load suite.

## Decisions needed before implementation

1. Define the launch hosting target and Supabase plan/region; capacity depends
   on those limits.
2. Define the exact course readiness policy, especially whether every lesson
   requires a ready video and whether every paid course requires a preview.
3. Choose managed image storage and transformation policy for covers/avatars.
4. Decide whether receipt delivery will use a database outbox with a scheduled
   worker, hosting queue, or another durable job runner.
5. Confirm the catalogue size at launch and six-month target so search and
   pagination arrive at the right time.
6. Define the privacy-safe analytics/observability provider and retention rules.

## Recommended next sprint

Start with **Phase 0 and Phase 1**. They produce objective performance evidence
and repair the learner funnel before broader visual polish. In parallel only
after the readiness policy is agreed, implement **Task 2.1**, because it changes
both backend publication rules and the Studio/admin experience.

Do not begin by adding general animation, new dashboard charts, or speculative
infrastructure. The next measurable product gain comes from continuity,
feedback, readiness, and reducing duplicated work.
