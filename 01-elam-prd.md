# Elam — Product Requirements Document

| | |
|---|---|
| **Version** | 0.2 |
| **Status** | Draft |
| **Owner** | _TBD_ |
| **Last updated** | 2026-08-26 |
| **Audience** | Product team, stakeholders |

Related documents:
- `02-developer-brief.md` — engagement scope and delivery terms
- `03-technical-specification.md` — implementation detail

---

## 1. Product overview

Elam is a paid, Arabic-language course platform for university engineering students. High-performing students record structured explanations of specific university courses; other students purchase per-course access.

The platform is student-run and not officially affiliated with the university. Launch scope is Electrical Engineering; the data model supports additional departments without schema change.

**Differentiator.** Instructors have taken the exact course being explained, at the same university, under the same faculty. Course content is tied to real course codes, not generic subject areas.

**Design reference.** [Edraak](https://www.edraak.org/) for layout restraint and course presentation clarity.

---

## 2. Objectives

| ID | Objective | Measure |
|---|---|---|
| O1 | Self-service purchase and access | Zero manual enrollment grants post-launch |
| O2 | Instructor content authoring without engineering support | Courses published via UI ÷ total published |
| O3 | Paid content is not trivially redistributable | No permanent public media URLs in any environment |
| O4 | Admin financial visibility without engineering support | Revenue figure obtainable from dashboard alone |
| O5 | Distinct visual identity, not a template | Design review sign-off |

---

## 3. Scope

### 3.1 In scope (v1)

Public catalogue, authentication, course purchase via Moyasar, video playback with access control, learner progress tracking, instructor authoring studio, admin dashboard.

### 3.2 Out of scope (v1)

Live sessions, certificates, quizzes and graded assessment, discussion forums, native mobile apps, subscriptions or bundles, multi-language UI, instructor self-registration, automated instructor payouts.

### 3.3 Deferred (v1.1)

Discount codes, lesson file attachments, catalogue search and filtering, instructor payout tracking.

---

## 4. Users and roles

### 4.1 Definitions

| Role | Definition |
|---|---|
| **Learner** | Default role on registration. Purchases and consumes courses. |
| **Instructor** | A learner promoted by an admin. Authors and manages own courses only. |
| **Admin** | Operating team. Full platform read access and administrative control. |

Roles are a single field on one account record. An instructor is a learner who additionally authors; the same account purchases other instructors' courses.

### 4.2 Permission matrix

| Capability | Learner | Instructor | Admin |
|---|:---:|:---:|:---:|
| Browse published courses | ✅ | ✅ | ✅ |
| Watch free preview lessons | ✅ | ✅ | ✅ |
| Purchase a course | ✅ | ✅ | ✅ |
| Watch a purchased course | ✅ | ✅ | ✅ |
| View own progress and purchase history | ✅ | ✅ | ✅ |
| Create and edit own courses | — | ✅ | ✅ |
| Upload video to own courses | — | ✅ | ✅ |
| Submit own course for review | — | ✅ | ✅ |
| Publish own course directly | — | Conditional¹ | ✅ |
| View enrolment counts for own courses | — | ✅ | ✅ |
| View revenue figures | — | — | ✅ |
| View any purchase record | — | — | ✅ |
| Publish, unpublish, archive any course | — | — | ✅ |
| Promote or demote users | — | — | ✅ |
| Change platform settings | — | — | ✅ |

¹ Governed by the `instructor_direct_publish` platform setting (§7).

### 4.3 Instructor visibility constraint

Instructors see **enrolment counts only**. Revenue, prices paid, purchase records, and learner identities are not exposed to instructors in v1. Payouts are handled manually outside the system.

---

## 5. Functional requirements

### 5.1 Accounts and authentication — FR-A

| ID | Requirement | Priority |
|---|---|---|
| FR-A1 | Users register with email and password | Must |
| FR-A2 | Email verification is required before purchase | Must |
| FR-A3 | Password reset via emailed link | Must |
| FR-A4 | New accounts receive the `learner` role automatically | Must |
| FR-A5 | Users edit display name and avatar | Must |
| FR-A6 | Role changes are performed by admins only | Must |

### 5.2 Catalogue — FR-C

| ID | Requirement | Priority |
|---|---|---|
| FR-C1 | Landing page presents hero, about, course catalogue, instructor credibility, FAQ | Must |
| FR-C2 | Catalogue displays published courses with title, course code, instructor, price, duration | Must |
| FR-C3 | Course detail page shows description, module/lesson syllabus, instructor bio, price | Must |
| FR-C4 | Course detail page indicates free preview lessons | Must |
| FR-C5 | Unpublished courses are unreachable by direct URL for non-owners | Must |
| FR-C6 | Purchased courses show an enrolled state instead of a purchase action | Must |
| FR-C7 | Prices display in SAR using Western numerals | Must |

### 5.3 Purchase — FR-P

| ID | Requirement | Priority |
|---|---|---|
| FR-P1 | Checkout supports Mada, Visa, Mastercard and Apple Pay via Moyasar | Must |
| FR-P2 | Course price is read server-side at checkout; client-supplied amounts are rejected | Must |
| FR-P3 | Access is granted only after server-side verification against the Moyasar API | Must |
| FR-P4 | Payment confirmation is idempotent; duplicate notifications create one enrolment | Must |
| FR-P5 | Purchasing an already-owned course is blocked | Must |
| FR-P6 | A receipt is emailed on successful payment | Must |
| FR-P7 | Purchase records are immutable; refunds are recorded as a status change | Must |
| FR-P8 | Access granted is lifetime and does not expire | Must |
| FR-P9 | Failed and abandoned payments are recorded and visible to admins | Should |

### 5.4 Learning — FR-L

| ID | Requirement | Priority |
|---|---|---|
| FR-L1 | Learner dashboard lists enrolled courses with completion percentage | Must |
| FR-L2 | Course player streams video with adaptive bitrate | Must |
| FR-L3 | Playback authorisation is verified per request against enrolment | Must |
| FR-L4 | Playback resumes at the last recorded position | Must |
| FR-L5 | Lessons can be marked complete, manually or on threshold watch | Must |
| FR-L6 | Free preview lessons play without purchase | Must |
| FR-L7 | Playback displays a per-learner identifying watermark | Should |
| FR-L8 | Profile shows purchase history and aggregate learning statistics | Should |

### 5.5 Instructor studio — FR-I

| ID | Requirement | Priority |
|---|---|---|
| FR-I1 | Instructors create and edit courses in draft state | Must |
| FR-I2 | Instructors manage modules and lessons, including ordering | Must |
| FR-I3 | Instructors upload lesson video and see processing status | Must |
| FR-I4 | Instructors designate lessons as free previews | Must |
| FR-I5 | Instructors submit a course for review | Must |
| FR-I6 | Instructors publish directly when the platform setting permits | Must |
| FR-I7 | Instructors view enrolment counts per own course | Must |
| FR-I8 | Instructors cannot access other instructors' courses in any state | Must |
| FR-I9 | Instructors cannot access revenue or purchase data | Must |

### 5.6 Administration — FR-D

| ID | Requirement | Priority |
|---|---|---|
| FR-D1 | Dashboard shows total revenue, enrolments, and active courses | Must |
| FR-D2 | Purchase history is listable, searchable and filterable by status and date | Must |
| FR-D3 | Admins publish, unpublish and archive any course | Must |
| FR-D4 | Course removal is archival; enrolments continue to resolve | Must |
| FR-D5 | Admins list users and change roles | Must |
| FR-D6 | Admins review and action courses submitted for review | Must |
| FR-D7 | Admins toggle the instructor direct-publish setting | Must |
| FR-D8 | Admins record a refund against a purchase | Should |
| FR-D9 | Revenue is reportable by course and by date range | Should |

---

## 6. Primary flows

### 6.1 Purchase

1. Learner initiates purchase on a course detail page.
2. Unauthenticated users authenticate and return to the same course.
3. Server validates eligibility, reads the authoritative price, and creates a pending order.
4. Learner completes payment and 3-D Secure with the payment provider.
5. Server receives provider notification, retrieves the payment record from the provider API, and validates status, amount and currency.
6. On success the order is marked paid and an enrolment is created, idempotently.
7. Learner is redirected into the course player and receives a receipt by email.

Browser redirects are treated as navigation only and never as proof of payment.

### 6.2 Playback authorisation

1. Learner opens a lesson.
2. Server evaluates: free preview, or an active enrolment for the parent course, or ownership/admin.
3. On authorisation, a short-lived signed playback credential is issued.
4. Player streams using that credential; it expires independently of the session.

Media asset identifiers are never sufficient to obtain playback.

### 6.3 Course publication

```
draft ──submit──> in_review ──approve──> published ──> archived
  │                                          ▲
  └────── direct publish (when enabled) ─────┘
```

When `instructor_direct_publish` is disabled, `draft → published` is available to admins only. When enabled, instructors may perform it on their own courses. Archiving is admin-only in both cases.

---

## 7. Platform settings

Runtime configuration held in the database and editable by admins without deployment.

| Setting | Type | Default | Effect |
|---|---|---|---|
| `instructor_direct_publish` | boolean | `false` | When true, instructors publish own courses without review |

Setting changes take effect immediately and are enforced at the data layer, not in the interface. Changes are recorded with actor and timestamp.

---

## 8. Design requirements

| ID | Requirement |
|---|---|
| DR1 | Interface language is Arabic; document direction is RTL throughout |
| DR2 | Palette derives from the Elam logo: primary `#0B0B66`, secondary `#4942A8` |
| DR3 | Typography is IBM Plex Sans Arabic, with IBM Plex Mono for codes, prices and durations |
| DR4 | Layout uses CSS logical properties exclusively; physical direction utilities are prohibited |
| DR5 | Directional iconography mirrors correctly under RTL |
| DR6 | Prices use Western numerals with SAR currency formatting |
| DR7 | Copy is specific: real course codes, real instructors, real scope. Generic marketing claims are rejected at review |
| DR8 | The design must not read as a generic template; see `03-technical-specification.md` §9 |

---

## 9. Non-functional requirements

| ID | Area | Requirement |
|---|---|---|
| NFR1 | Performance | LCP under 2.5s on 4G mobile for landing and catalogue |
| NFR2 | Accessibility | WCAG 2.1 AA; visible keyboard focus; reduced-motion respected |
| NFR3 | Security | Row-level security on every table; privileged credentials confined to server routes |
| NFR4 | Payment integrity | Access granted only on server-verified payment |
| NFR5 | Privacy | Purchase history and progress readable only by owner and admins |
| NFR6 | Durability | Daily database backup; purchase records append-only |
| NFR7 | Scale | Design target 500 concurrent learners |
| NFR8 | Compatibility | Current and prior versions of Chrome, Safari, Edge, Firefox; iOS Safari is the primary mobile target |
| NFR9 | Availability | Best-effort; no formal SLA in v1 |

---

## 10. Decision log

| ID | Decision | Resolution |
|---|---|---|
| D1 | Instructor publishing rights | Admin-controlled platform setting; default off |
| D2 | Course access duration | Lifetime; no expiry |
| D3 | Instructor revenue visibility | Enrolment counts only; no financial data |
| D4 | Instructor payouts | Manual, outside the system |
| D5 | Course deletion | Archival only; hard deletion prohibited |
| D6 | Video hosting | **Open** — Bunny Stream recommended |
| D7 | Refund policy terms | **Open** — required before payment activation |
| D8 | Hero background video | **Open** — see `03-technical-specification.md` §9.4 |
| D9 | Quizzes and assessment | Deferred beyond v1 |
| D10 | Free preview quantity | One to two lessons, at instructor discretion |
| D11 | Application hosting | **Open** — Vercel recommended |
| D12 | Transactional email | **Open** — Resend recommended |
| D13 | Revenue share with instructors | **Open** — commercial matter, resolve before launch |

---

## 11. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Content redistribution within a small cohort | Revenue loss | Expiring signed playback credentials; per-learner watermark; no permanent media URLs |
| Payment provider activation delays launch | Schedule slip | Begin activation in parallel with development; build against sandbox |
| Revenue-share dispute among founders | Team dissolution | Written agreement before launch (D13) |
| Incomplete course catalogue at launch | Weak launch | Launch with fewer complete courses rather than many partial ones |
| Volunteer availability during examination periods | Schedule slip | Plan around the academic calendar |
| University objection to an unaffiliated paid platform | Enforced shutdown | No university marks or branding; no implied endorsement |

---

## 12. Milestones

| # | Milestone | Exit criteria |
|---|---|---|
| M1 | Foundations | Schema, RLS, auth, roles, design system deployed to staging |
| M2 | Catalogue | Landing and course detail pages complete and responsive |
| M3 | Player | Video integration, access control, progress tracking |
| M4 | Commerce | Sandbox payments granting access end to end |
| M5 | Studio and administration | Instructor authoring and admin dashboards complete |
| M6 | Hardening and launch | Live payments, accessibility pass, RTL audit, load verification |

Dates to be fixed against the academic calendar.
