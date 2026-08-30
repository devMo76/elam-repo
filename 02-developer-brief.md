# Elam — Developer Brief

| | |
|---|---|
| **Version** | 0.2 |
| **Audience** | External contract developer |
| **Read with** | `01-elam-prd.md` (what to build) · `03-technical-specification.md` (how to build it) |

---

## 1. Engagement summary

Build a production Arabic-language course platform: public catalogue, paid enrolment via Moyasar, access-controlled video playback, learner progress tracking, an instructor authoring area, and an admin dashboard.

The stack is already selected and partially scaffolded. This is not a greenfield architecture decision — the framework, database, styling system and typography are fixed (§3). Deviating from them requires written approval.

**Language.** The entire interface is Arabic, right-to-left. This is a functional constraint that affects layout, iconography, animation and number formatting. It is not a translation task added at the end. Read `03-technical-specification.md` §8 before writing any component.

---

## 2. What exists today

| Item | Status |
|---|---|
| Next.js application scaffold | Exists, branch `feat/design-system` |
| Logo and brand palette | Provided |
| Supabase project | To be provisioned |
| Moyasar merchant account | Commercial registration secured; activation in progress |
| Video hosting account | Not selected — see §7 |
| Course content | In production by instructors |

---

## 3. Fixed technical stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js, App Router, Server Components by default | 16.3.2 |
| UI runtime | React / React DOM | 19.2.8 |
| Language | TypeScript, `strict: true` | 5.9.3 |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss` | 4.3.3 |
| Animation | `motion` | 13.1.1 |
| Icons | `@phosphor-icons/react` | 2.1.10 |
| Typography | IBM Plex Sans Arabic + IBM Plex Mono, self-hosted via `next/font` | — |
| Linting | ESLint 9 flat config + `eslint-config-next` | 9.39.5 |
| Runtime | Node | 22.17.1 |
| Database, auth, storage | Supabase (Postgres) | — |
| Payments | Moyasar | — |
| Video | To be selected | — |

Versions are pinned. Do not upgrade without approval.

Additional dependencies require justification before introduction. In particular: no additional CSS framework, no UI component library that ships its own design tokens, no state management library before a demonstrated need, and no ORM layer above the Supabase client.

---

## 4. Deliverables

1. Source code in the project repository, on feature branches, merged by pull request.
2. Database migrations as versioned SQL files, applied through Supabase migrations.
3. Row-level security policies covering every table, with a written verification note per policy.
4. Environment variable documentation, values excluded.
5. Deployment configuration for staging and production.
6. A README covering local setup, migrations, seeding and deployment.
7. Handover session covering architecture, deployment and known limitations.

Design assets are provided; the developer implements them. Where a design is absent, the developer proposes an implementation consistent with `03-technical-specification.md` §9 before building.

---

## 5. Milestones and acceptance

Payment is milestone-based. A milestone is complete when its exit criteria pass on the staging environment and the pull request is merged.

### M1 — Foundations

- Database schema and enums deployed via migration
- RLS enabled and policied on every table
- Authentication: registration, verification, sign-in, password reset
- Role model with admin promotion path
- Design tokens, typography and RTL document setup
- Base layout, navigation, footer

**Exit:** A user registers, verifies, signs in, and receives the `learner` role. An admin promotes them to `instructor`. RLS blocks direct table access from a browser client for every table, demonstrated.

### M2 — Catalogue

- Landing page: hero, about, catalogue, instructor section, FAQ
- Course detail page with syllabus tree
- Responsive to 360px; RTL correct throughout

**Exit:** Landing and course pages render seeded content, pass an RTL review, and meet NFR1 on a throttled 4G profile.

### M3 — Player and progress

- Video provider integrated
- Server-side playback authorisation with expiring credentials
- Player with resume, lesson navigation, completion marking
- Learner dashboard with per-course progress

**Exit:** An enrolled learner plays a lesson; a non-enrolled learner receives 403 from the playback endpoint. A playback credential captured from one session fails after expiry.

### M4 — Commerce

- Moyasar sandbox integration
- Order lifecycle with server-side verification
- Idempotent enrolment grant
- Receipt email

**Exit:** A sandbox purchase grants access end to end. Replaying the provider notification twice produces exactly one enrolment. A tampered client-side amount is rejected.

### M5 — Studio and administration

- Instructor course, module and lesson CRUD with ordering
- Video upload with processing status
- Submit-for-review and conditional direct publish
- Instructor enrolment counts
- Admin dashboard: revenue, enrolments, purchase history, course and user management, settings toggle

**Exit:** An instructor authors and submits a course without engineering assistance. An admin publishes it, toggles the direct-publish setting, and the change takes effect without deployment. An instructor cannot read any revenue data through the API.

### M6 — Hardening and launch

- Moyasar production activation
- Accessibility pass to WCAG 2.1 AA
- Full RTL audit
- Load verification at NFR7
- Production deployment and handover

**Exit:** All exit criteria above hold in production; handover complete.

---

## 6. Definition of done

Applies to every pull request.

- TypeScript compiles with no errors and no new `any`
- ESLint passes with no warnings
- No physical direction utilities (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`)
- Renders correctly at 360px, 768px and 1440px
- Interactive elements are keyboard reachable with a visible focus state
- Animations respect `prefers-reduced-motion`
- Any new table has RLS enabled and policies written
- No secret reaches the client bundle
- Loading and error states exist for every asynchronous view
- Arabic copy reviewed by the team before merge

---

## 7. Decisions required from the client

The developer should not proceed past the dependent milestone without these.

| # | Decision | Blocks |
|---|---|---|
| 1 | Video hosting provider | M3 |
| 2 | Refund policy terms | M4, payment activation |
| 3 | Application hosting | M1 |
| 4 | Transactional email provider | M4 |
| 5 | Hero media: final direction | M2 |
| 6 | Final Arabic copy for landing and FAQ | M2 |
| 7 | Seed courses for staging | M2 |

---

## 8. Access and credentials

The developer receives: repository write access, a Supabase project (staging), Moyasar sandbox keys, video provider keys once selected, and hosting access for staging.

Production credentials are held by the client. Production deployment is performed jointly. No production secret is shared over chat or email; use the agreed secret store.

The developer must not use production data in development. Staging is seeded with synthetic records.

---

## 9. Working practices

**Branching.** `main` is deployable at all times. Work happens on `feat/*` or `fix/*` branches and merges by pull request. No direct pushes to `main`.

**Commits.** Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`). Migrations commit separately from application code.

**Review.** Every pull request is reviewed before merge. Payment, authorisation and RLS changes require review by the client's technical lead specifically.

**Communication.** Weekly written progress note covering completed work, in-progress work, and blockers. Blockers are raised as they arise, not at the weekly note.

**Estimates.** Any change materially altering scope or schedule is raised before implementation, not after.

---

## 10. Constraints and cautions

**Payment code is high-risk.** Access is granted only by server-side code that has verified the payment against the Moyasar API. Browser redirects are navigation, never proof. This constraint is not negotiable and will be reviewed line by line.

**Row-level security is the security boundary.** Hiding a control in the interface is not access control. Every table is treated as though a browser client will query it directly, because one can.

**The service-role key bypasses all security.** It lives in exactly one server module, imported only where privileged work is genuinely required. Any new import is a review event.

**Media must not be publicly addressable.** No permanent URLs, no public buckets, no unsigned playback. A leaked link must expire.

**Purchase records are append-only.** Never delete an order or an enrolment. Refunds and removals are status transitions.

**RTL is not a stylesheet flip.** Logical properties, mirrored icons, direction-aware animation and correct numeral formatting are all required. See `03-technical-specification.md` §8.

---

## 11. Out of scope

Content production, Arabic copywriting, brand identity design, video recording or editing, Moyasar merchant onboarding, ongoing maintenance beyond the warranty period, quizzes, certificates, forums, native apps, subscriptions, automated payouts.

---

## 12. Warranty

Defects in delivered functionality reported within 30 days of milestone acceptance are remediated at no additional cost. New requirements are handled as change requests.
