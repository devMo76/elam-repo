# Elam Project Structure and Team Workflow

| | |
|---|---|
| Status | Approved working architecture |
| Updated | 2026-08-31 |
| Applies to | Backend, frontend, database, testing, and integration work |

This document translates the product requirements, developer brief, and technical specification into a repository structure and team workflow. The three numbered project documents remain the primary product references. The decisions below are approved scope clarifications for implementation and must be reflected in a future document revision.

## Approved scope decisions

- Next.js is pinned to `16.3.3`, replacing the insecure `16.3.2` patch while remaining on the required 16.3 release line.
- Learners cannot edit their profiles in v1. Required learner data is collected during registration. Instructor public-profile editing remains available for instructor biography and credibility content.
- The first administrator is promoted manually through a documented privileged procedure. No public admin-bootstrap endpoint is permitted.
- Zod `4.5.4` is the runtime validation library.
- Synthetic seed courses are created in backend Phase 2 and reused by database, integration, and frontend catalogue tests.
- Per-learner video watermarking is excluded from v1.
- The application will not initiate refunds in v1. The database retains immutable refund/reversal status fields so external provider events can be recorded without deleting purchase history.

## Architectural boundaries

Elam remains one Next.js App Router application. Separate frontend and backend repositories or a microservice split would add deployment, authentication, type-sharing, and integration complexity without benefiting the v1 scale target.

The codebase follows these boundaries:

1. `app/` defines routes, layouts, loading states, Server Actions, and Route Handlers.
2. `components/` contains presentation components and client-side interaction.
3. `lib/contracts/` contains shared runtime schemas and safe DTOs.
4. Backend domain logic lives under focused `lib/` feature directories.
5. `supabase/` contains migrations, RLS tests, database tests, and synthetic seed data.
6. Paid media never lives in `public/`.
7. The Supabase service-role client is created in exactly one server-only module.
8. Route layouts and UI redirects are conveniences; RLS and server-side authorization remain the security boundaries.

## Target repository structure

```text
app/
├── layout.tsx
├── globals.css
├── not-found.tsx
├── global-error.tsx
├── robots.ts
├── sitemap.ts
├── (marketing)/
│   └── page.tsx
├── (catalogue)/
│   └── courses/
│       ├── page.tsx
│       └── [slug]/
│           ├── page.tsx
│           ├── loading.tsx
│           ├── error.tsx
│           └── not-found.tsx
├── (auth)/auth/
│   ├── sign-in/page.tsx
│   ├── sign-up/page.tsx
│   ├── verify-email/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
├── (learn)/
│   ├── dashboard/page.tsx
│   └── learn/courses/[courseId]/lessons/[lessonId]/page.tsx
├── (studio)/studio/
│   ├── page.tsx
│   └── courses/[courseId]/page.tsx
├── (admin)/admin/
│   ├── page.tsx
│   ├── purchases/page.tsx
│   ├── courses/page.tsx
│   ├── users/page.tsx
│   └── settings/page.tsx
└── api/
    ├── checkout/route.ts
    ├── payments/callback/route.ts
    ├── webhooks/moyasar/route.ts
    ├── webhooks/video/route.ts
    ├── lessons/[id]/playback/route.ts
    ├── lessons/[id]/progress/route.ts
    ├── instructor/lessons/[id]/upload/route.ts
    ├── admin/users/[id]/role/route.ts
    ├── admin/settings/route.ts
    └── admin/courses/[id]/status/route.ts

components/
├── ui/
├── layout/
├── marketing/
├── catalogue/
├── auth/
├── learning/
├── payments/
├── studio/
└── admin/

lib/
├── contracts/
├── actions/
├── supabase/
│   ├── client.ts
│   ├── server.ts
│   ├── admin.ts
│   └── database.types.ts
├── auth/
├── courses/
├── enrollments/
├── progress/
├── payments/
├── video/
├── email/
│   └── templates/
├── users/
├── admin/
├── format/
├── env/
└── http/

supabase/
├── migrations/
├── tests/
│   ├── rls/
│   ├── publication/
│   └── payments/
└── seed.sql

tests/
├── integration/
│   ├── auth/
│   ├── payments/
│   ├── playback/
│   └── publication/
├── e2e/
├── load/
└── fixtures/

public/
├── brand/
└── images/

scripts/
docs/
├── architecture/
│   └── decisions/
├── roadmap/
├── security/
└── operations/

proxy.ts
instrumentation.ts
.env.example
```

Directories are introduced with tracked placeholders. Each placeholder must be removed when real implementation files are added. Empty abstractions must not be created beyond this approved skeleton.

## Ownership

| Area | Primary owner | Review |
|---|---|---|
| `app/api/**` | Backend | Backend/security review |
| `supabase/**` | Backend | Technical lead for RLS and payment changes |
| Backend domain directories under `lib/**` | Backend | Backend review |
| `proxy.ts`, server environment, auth guards | Backend | Security review |
| Non-API routes under `app/**` | Frontend | Frontend review |
| `components/**` | Frontend | Frontend/accessibility review |
| `public/**` | Frontend | Frontend review |
| `lib/contracts/**` | Shared | Both teams required |
| `lib/format/**` | Shared | Both teams required |
| Root package and build configuration | Shared | Both teams required |
| End-to-end tests | Shared | Both teams required |

## Shared contracts

Frontend code must consume safe DTOs rather than raw database rows. `lib/contracts/` owns:

- Zod request and response schemas.
- TypeScript types inferred from those schemas.
- Standard API error responses.
- Public course, enrolment, playback, and administration DTOs.
- Contract fixtures used by frontend development before backend integration.

Contracts must not import server environment variables, the service-role client, or provider secrets. Database-generated types remain backend implementation details unless a field is deliberately exposed through a DTO.

## Backend/frontend workflow

The teams may concentrate separately after contracts are agreed, but integration must happen at each functional phase rather than through one final project-wide merge.

1. Create or update the shared contract first.
2. Both teams review the contract pull request.
3. Backend implements schema, authorization, domain logic, and transport handlers.
4. Frontend develops against typed fixtures matching the approved contract.
5. Backend replaces fixtures with real data without changing the contract unexpectedly.
6. Run backend, frontend, and joint end-to-end tests.
7. Merge only after the phase gate passes.

Recommended branch names:

```text
feat/backend-<feature>
feat/frontend-<feature>
feat/contracts-<feature>
fix/backend-<issue>
fix/frontend-<issue>
```

`main` must remain deployable. No direct pushes to `main` are permitted. Long-lived branches must regularly synchronize with `main` to prevent large final conflicts.

## Seed-data workflow

`supabase/seed.sql` contains deterministic, synthetic local and staging data only. It must cover:

- Learner, instructor, and admin test identities.
- Published, draft, review, and archived courses.
- Modules and ordered lessons.
- Free-preview and paid lessons.
- Enrolled and non-enrolled cases.
- Multiple prices, durations, and media states.

Database tests use the seed to verify constraints, RLS, publication visibility, ordering, and enrolment access. Frontend tests use matching fixtures or the seeded staging environment to verify visual states. Seed data, credentials, and synthetic payment records must never be applied to production.

## Phase integration gate

Before either team starts the next phase:

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
npm audit
```

Once the Phase 0 test runner is selected, its approved test command becomes part of this required sequence. The relevant RLS, integration, accessibility, RTL, responsive, and end-to-end checks must also pass. Security-sensitive changes require technical-lead review.
