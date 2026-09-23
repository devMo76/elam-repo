# Temporary learner dashboard polish checklist — 2026-09-14

This checklist is deliberately separate from `tasks/plan.md`, which tracks the
administration dashboard currently in progress.

## 1. Course library and enrolment

- [x] Add a secure, authenticated free-course claim path. It grants an
  enrolment only for a published zero-price course and must be idempotent.
- [x] Make the free-course “ابدأ التعلّم” action claim the course before opening
  the player, so it appears in `/dashboard`.
- [x] Preserve the existing paid-payment invariant: the verified payment
  callback grants the enrolment; the browser never grants paid access itself.

## 2. Catalogue cards (`/courses`)

- [x] Use the port-3000 landing/catalogue tile hierarchy: whole-card link,
  compact tinted course-code band, title/instructor, rule-separated metadata,
  and price.
- [x] Render the numeric part of an `EE` course code only in the card identity.
- [x] Render Arabic lesson counts correctly: `درسين` for two; the correct
  singular/few/many forms for other counts.
- [x] Render Arabic course durations with correct count forms and stable RTL
  ordering, with the numeral rendered before the unit (for example,
  `10 دقائق` and `12 دقيقة`) across catalogue, featured-course, and landing
  tiles.
- [x] Remove the duplicate non-interactive course path from the player header;
  retain the functioning clickable breadcrumb navigation above it.
- [x] Reuse the same full Arabic-duration renderer in port 3000 and the lesson
  player, replacing the legacy abbreviated and unconditional minute labels.
- [x] Replace the synthetic instructor seed with the instructor/course mapping
  already used by port 3000, so the database-backed public course panel shows
  the intended profile rather than `Instructor Example`.

## 3. Course detail (`/courses/[slug]`)

- [x] Match the port-3000 editorial course-detail hierarchy and scale while
  retaining database DTO content and RTL behavior.
- [x] Make available lessons open the selected lesson in the player; locked
  lessons direct the learner to the preview/enrolment action. The current
  backend schema has no lesson-description column, so no description is
  fabricated.
- [x] Present the paid enrolment and free-preview paths together where a paid
  course has a preview; present free enrolment clearly for zero-price courses.

## 4. Learning player (`/learn/courses/[courseId]`)

- [x] Reduce oversized course title treatment.
- [x] Make breadcrumb navigation actionable and RTL-correct.
- [x] Align and center the lesson-count circle across desktop and mobile.
- [x] Prevent completion-control visual flicker and show authoritative course
  progress after progress writes.

## 5. Checkout result and catalogue alignment (2026-09-15)

- [x] Initialize the Arabic Moyasar card form from the response of
  `POST /api/checkout`; only the course ID is sent from the browser.
- [x] Preserve server-side payment verification before enrolment, then return
  the learner to `/dashboard?payment=success|pending|failed`.
- [x] Give the dashboard an accessible payment-result notice and redirect a
  missing callback session to sign-in with a return URL.
- [x] Make `/courses` match the port-3000 catalogue hierarchy: smaller heading,
  wider grid, compact tinted identity band, full-card link, and quiet footer
  metadata.

## Verification

- [x] Focused unit tests cover the free-enrolment authorization and idempotency
  contract, Arabic lesson-count formatting, and completion-state logic.
- [x] Typecheck, lint, backend tests, and build pass.
- [ ] Manual review: unauthenticated, learner, free course, paid checkout,
  course library, 360px, 768px, 1440px, keyboard, and RTL.

## Evidence and remaining dependency

- `npm run test:backend` passes: 39 files / 154 tests.
- The new focused database test passes: free enrolment is learner-only,
  idempotent, and rejects paid/unavailable courses.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- The complete `npm run test:db` invocation still reports pre-existing stale
  expectations tied to the expanded Arabic seed catalogue and a manually
  created local profile. The new free-enrolment database test itself passes.
- The paid checkout initializes Moyasar's embedded Arabic card form only after
  the server has authenticated the learner and created a pending order. The
  payment callback still verifies the provider's amount, currency, metadata,
  and status before it grants access; the browser never creates an enrolment.
- The local routes `/courses` and `/courses/signals-and-systems-ee301` both
  returned HTTP 200 after the catalogue redesign. Full browser/payment QA still
  needs a real sandbox card, provider callback reachability, and a browser
  session; those are listed in the handover checklist.
