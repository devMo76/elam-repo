# Elam Frontend Roadmap

| | |
|---|---|
| Owner | Frontend team |
| Status | Approved working roadmap |
| Updated | 2026-08-31 |

The frontend team owns product presentation, Arabic RTL behavior, accessibility, responsive design, interactive states, and integration with approved shared contracts. Backend security rules must never be duplicated as frontend-only controls.

## Frontend rules

- Use Server Components by default.
- Add `'use client'` only at the smallest interactive boundary.
- Consume DTOs and Zod contracts from `lib/contracts/`; do not depend on raw database rows.
- Never import the Supabase service-role client or server-only environment modules.
- Use CSS logical properties and approved Tailwind logical utilities exclusively.
- Every asynchronous screen must provide loading, error, empty, and success states.
- Verify every screen at 360px, 768px, and 1440px.
- The learner interface does not include profile editing in v1.
- The player does not include a per-learner watermark in v1.
- The admin interface does not include a platform refund action in v1.

## Frontend Phase 0 — Contracts and UI development baseline

### Deliverables

- Agree with backend on API errors, DTOs, and fixture shapes.
- Select frontend testing tools with team approval.
- Establish component, accessibility, and end-to-end test commands.
- Add contract fixtures for initial UI work.
- Confirm ownership rules and pull-request checks.

### Tests

- A clean checkout installs and builds.
- Contract fixtures validate against their Zod schemas.
- CI runs type-checking, linting, frontend tests, and the production build.

### Exit gate

Both teams approve the first shared contract and fixture set.

## Frontend Phase 1 — Design system and RTL application shell

### Deliverables

- Complete design tokens and typography.
- Implement reusable buttons, inputs, form controls, dialogs, badges, tables, skeletons, and status indicators.
- Implement public navigation and footer.
- Implement the directional-icon wrapper.
- Implement standard loading, error, empty, and unauthorized states.
- Enforce prohibited physical-direction utilities through ESLint.
- Add centralized currency, duration, percentage, and date formatting.

### Tests

- Keyboard navigation and visible focus states pass.
- Touch targets meet the 44-by-44-pixel minimum.
- Directional icons mirror correctly; nondirectional icons do not.
- Reduced-motion mode is respected.
- Western numerals and SAR formatting are correct.
- Introducing `ml-*`, `right-*`, or another prohibited utility fails linting.
- Components render correctly at all required widths.

### Exit gate

The reusable application shell passes RTL, accessibility, and responsive review.

## Frontend Phase 2 — Authentication interfaces

### Backend dependency

Authentication contracts, Supabase session handling, and validation schemas must be available.

### Deliverables

- Registration with required display name, email, and password.
- Email-verification status and resend flow.
- Sign-in interface.
- Forgot-password and reset-password interfaces.
- Safe post-authentication redirects.
- Role-aware navigation.
- No learner profile-edit screen.

### Tests

- Client validation matches shared Zod schemas.
- Server errors map to specific Arabic messages.
- Pending submissions prevent accidental duplicate actions.
- Authentication flows are keyboard and screen-reader accessible.
- Redirect query parameters cannot redirect to an external site.

### Exit gate

Registration, verification, sign-in, and password reset pass jointly against the staging backend.

## Frontend Phase 3 — Landing page and public catalogue

### Backend dependency

Seed courses, catalogue DTOs, published-course queries, and staging data must be ready.

### Deliverables

- Landing hero, about, catalogue preview, instructor credibility, and FAQ sections.
- Public course catalogue.
- Course-detail and syllabus screens.
- Published, enrolled, free-preview, empty, loading, and error states.
- Specific Arabic copy using real-shaped synthetic course data.
- Course metadata and sharing previews.

### Tests

- UI fixtures and staging responses both validate against the same contracts.
- Draft, review, and archived courses do not appear publicly.
- Published seed courses display the correct title, code, instructor, duration, and price.
- Course codes preserve LTR ordering inside Arabic content.
- Prices use Western numerals and SAR formatting.
- Landing and catalogue LCP remain under 2.5 seconds on throttled 4G.
- Accessibility, RTL, and responsive checks pass.

### Exit gate

The seeded catalogue passes UI, performance, accessibility, and RTL review on staging.

## Frontend Phase 4 — Learner dashboard and video player

### Backend dependency

Playback authorization, signed credentials, progress endpoints, and seeded enrolments must be ready.

### Deliverables

- Learner dashboard with progress percentages.
- Course player layout and lesson navigation.
- Free-preview, enrolled, processing, failed-media, and forbidden states.
- Resume position and completion controls.
- RTL-correct player controls.
- No per-learner watermark.

### Tests

- Enrolled and non-enrolled fixtures display different states correctly.
- A playback `403` cannot be mistaken for a loading failure.
- Resume and completion states update without unnecessary rerenders.
- Player controls work using keyboard and touch.
- Directional navigation is correct under RTL.
- Expired-credential recovery requests a fresh credential safely.

### Exit gate

The learner experience passes joint playback, progress, accessibility, and RTL tests on staging.

## Frontend Phase 5 — Checkout and purchase states

### Backend dependency

Moyasar sandbox checkout, confirmation, enrolment, and receipt behavior must be available.

### Deliverables

- Purchase action and authentication return flow.
- Moyasar checkout integration UI.
- Pending, processing, paid, failed, abandoned, already-owned, and enrolled states.
- Clear navigation after payment without treating browser redirects as proof.
- Purchase-history display without refund controls.

### Tests

- UI never submits an authoritative amount.
- Duplicate clicks do not create duplicate visible checkout actions.
- Callback screens wait for server verification.
- Failed and abandoned payments display recoverable states.
- An already-enrolled course cannot be purchased again through the UI.
- Payment interfaces pass keyboard and mobile Safari checks.

### Exit gate

A sandbox purchase flows from course page to verified enrolment and player access on staging.

## Frontend Phase 6 — Instructor studio

### Backend dependency

Instructor authoring contracts, ownership authorization, publication rules, and upload credentials must be available.

### Deliverables

- Instructor course list and creation interface.
- Course details, modules, lessons, and ordering controls.
- Video upload and processing feedback.
- Free-preview selection.
- Review submission and conditional direct-publish states.
- Instructor public-profile editing where needed for biography content.
- Enrolment counts without financial or learner-identity fields.

### Tests

- Drag, keyboard, and touch ordering remain accessible.
- Failed saves restore a consistent visible order.
- Publication controls reflect the database-backed setting.
- No instructor screen renders revenue, paid amount, purchase records, or learner identities.
- Upload processing and failure states remain recoverable.

### Exit gate

An instructor can author and submit a complete seeded course without engineering assistance.

## Frontend Phase 7 — Administration

### Backend dependency

Admin authorization, dashboard DTOs, course status actions, user-role actions, settings, and audit behavior must be ready.

### Deliverables

- Revenue, enrolment, and active-course dashboard.
- Purchase list with status and date filtering.
- Course review, publishing, unpublishing, and archival controls.
- User-role management.
- Direct-publishing settings control.
- No application-initiated refund action.

### Tests

- Destructive state transitions require clear confirmation.
- Loading, empty, partial-data, and error states are represented.
- Filters remain usable on mobile and with a keyboard.
- Revenue and status formatting match backend contracts.
- Unauthorized responses do not leak administrative content.

### Exit gate

All administration screens pass joint authorization, RTL, accessibility, and staging-data tests.

## Frontend Phase 8 — Hardening and production readiness

### Deliverables

- Complete browser and device review, prioritizing iOS Safari.
- Accessibility remediation to WCAG 2.1 AA.
- Performance and bundle optimization based on measurements.
- Full reduced-motion and RTL audit.
- Production error and observability integration once selected.
- End-to-end coverage for primary user journeys.

### Tests

- All frontend and joint end-to-end tests pass.
- Landing and catalogue performance budgets pass.
- No server-only module or secret appears in the client bundle.
- Every interactive element is keyboard reachable with visible focus.
- Every screen passes required responsive widths and RTL review.

### Exit gate

The staging release candidate passes the documented frontend evidence pack and production smoke-test plan.
