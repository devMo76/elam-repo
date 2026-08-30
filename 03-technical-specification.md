# Elam — Technical Specification

| | |
|---|---|
| **Version** | 0.2 |
| **Audience** | Implementing developer |
| **Read with** | `01-elam-prd.md` · `02-developer-brief.md` |

SQL in this document is a specification, not a finished migration. Field names for third-party APIs must be confirmed against current provider documentation before implementation.

---

## 1. Architecture

Single Next.js application on the App Router, server-rendering by default, with Supabase Postgres as the datastore and authority for authorisation. Payments and video are external services reached only from server code.

```
Browser (Arabic, RTL)
   │
   ├─ Server Components ──────── Supabase (user session, RLS enforced)
   ├─ Client Components ──────── Supabase (anon key, RLS enforced)
   └─ Route Handlers ─────────┬─ Supabase (service role, RLS bypassed)
                              ├─ Moyasar API
                              └─ Video provider API
```

Three access contexts exist and must not be confused:

| Context | Credential | RLS | Use |
|---|---|---|---|
| Server Component | User session (`@supabase/ssr`) | Enforced | Reads for rendering |
| Client Component | Anon key | Enforced | Interactive reads, own-row writes |
| Route Handler | Service role | **Bypassed** | Payments, enrolment grants, admin writes |

The service-role client is defined in exactly one module and imported only by route handlers that require it. Confusing these contexts is the most probable serious defect in this codebase.

---

## 2. Environments and configuration

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client | Supabase endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Anon access, RLS-bound |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Privileged writes |
| `NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY` | Client | Payment form |
| `MOYASAR_SECRET_KEY` | **Server only** | Payment verification |
| `MOYASAR_WEBHOOK_SECRET` | **Server only** | Notification authentication |
| `VIDEO_API_KEY` | **Server only** | Upload and token signing |
| `VIDEO_TOKEN_SIGNING_KEY` | **Server only** | Playback credentials |
| `EMAIL_API_KEY` | **Server only** | Transactional email |
| `NEXT_PUBLIC_SITE_URL` | Client | Callback construction |

Any variable without the `NEXT_PUBLIC_` prefix must never appear in a Client Component, in a module imported by one, or in a props payload. Verify with a production bundle inspection before launch.

Environments: `local`, `staging`, `production`. Staging uses Moyasar sandbox and synthetic data only.

---

## 3. Data model

### 3.1 Types

```sql
create type user_role     as enum ('learner', 'instructor', 'admin');
create type course_status as enum ('draft', 'in_review', 'published', 'archived');
create type order_status  as enum ('pending', 'paid', 'failed', 'refunded');
create type media_status  as enum ('absent', 'uploading', 'processing', 'ready', 'failed');
```

### 3.2 Tables

```sql
-- Identity ------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  avatar_url  text,
  role        user_role not null default 'learner',
  headline    text,                       -- instructor: "طالب هندسة كهربائية"
  bio         text,                       -- instructor: public biography
  created_at  timestamptz not null default now()
);

-- Runtime configuration -----------------------------------------------------
create table platform_settings (
  id                        int primary key default 1 check (id = 1),
  instructor_direct_publish boolean not null default false,
  updated_at                timestamptz not null default now(),
  updated_by                uuid references profiles(id)
);
insert into platform_settings (id) values (1);

-- Catalogue -----------------------------------------------------------------
create table courses (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  department     text not null default 'EE',
  course_code    text,                    -- 'EE301'
  title          text not null,
  subtitle       text,
  description    text,
  price_halalas  integer not null check (price_halalas >= 0),
  currency       char(3) not null default 'SAR',
  status         course_status not null default 'draft',
  cover_url      text,
  instructor_id  uuid not null references profiles(id),
  created_at     timestamptz not null default now(),
  published_at   timestamptz
);
create index on courses (status) where status = 'published';
create index on courses (instructor_id);

create table modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references courses(id) on delete cascade,
  title      text not null,
  position   integer not null,
  unique (course_id, position) deferrable initially deferred
);

create table lessons (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references modules(id) on delete cascade,
  title            text not null,
  position         integer not null,
  video_asset_id   text,                  -- provider identifier, never a URL
  duration_seconds integer,
  is_free_preview  boolean not null default false,
  media_status     media_status not null default 'absent',
  created_at       timestamptz not null default now(),
  unique (module_id, position) deferrable initially deferred
);

-- Commerce ------------------------------------------------------------------
create table orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles(id),
  course_id          uuid not null references courses(id),
  amount_halalas     integer not null check (amount_halalas >= 0),
  currency           char(3) not null default 'SAR',
  status             order_status not null default 'pending',
  moyasar_payment_id text unique,         -- idempotency key
  failure_reason     text,
  raw_payload        jsonb,               -- full provider response
  created_at         timestamptz not null default now(),
  paid_at            timestamptz,
  refunded_at        timestamptz
);
create index on orders (user_id);
create index on orders (status, created_at desc);

create table enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id),
  course_id   uuid not null references courses(id),
  order_id    uuid references orders(id),
  granted_at  timestamptz not null default now(),
  expires_at  timestamptz,                -- always NULL in v1: lifetime access
  unique (user_id, course_id)
);
create index on enrollments (course_id);

-- Learning ------------------------------------------------------------------
create table lesson_progress (
  user_id               uuid not null references profiles(id) on delete cascade,
  lesson_id             uuid not null references lessons(id) on delete cascade,
  last_position_seconds integer not null default 0,
  completed_at          timestamptz,
  updated_at            timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Audit ---------------------------------------------------------------------
create table admin_audit_log (
  id         bigserial primary key,
  actor_id   uuid references profiles(id),
  action     text not null,               -- 'role.change', 'course.archive', 'settings.update'
  subject    text,                        -- affected record identifier
  detail     jsonb,
  created_at timestamptz not null default now()
);
```

### 3.3 Design notes

**Money is integer halalas.** No floating-point type touches a monetary value anywhere in the stack, including TypeScript. 350.00 SAR is `35000`.

**`expires_at` is nullable and always NULL in v1.** Access is lifetime. The column exists so a future time-limited model is a data change rather than a migration under pressure.

**Courses are never hard-deleted.** Admin removal sets `status = 'archived'`. Enrolments must continue to resolve for anyone who paid. Archived courses disappear from the catalogue but remain playable for existing enrolees.

**`raw_payload` retains the full gateway response.** Required for dispute resolution and cannot be reconstructed retrospectively.

**`media_status` distinguishes failure from absence.** Without it, a failed transcode is indistinguishable from a lesson nobody has recorded, and the instructor has no signal.

**Position uniqueness is deferrable.** Reordering swaps positions within a transaction; a non-deferrable constraint fails mid-update.

---

## 4. Security model

### 4.1 Role resolution

Role is resolved by a `SECURITY DEFINER` function. This is deliberate: such functions bypass RLS, which prevents the infinite recursion that occurs when a policy on `profiles` queries `profiles`.

```sql
create or replace function public.app_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.app_role() = 'admin', false)
$$;

create or replace function public.is_enrolled(target_course uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where user_id = auth.uid()
      and course_id = target_course
      and (expires_at is null or expires_at > now())
  )
$$;
```

Optionally mirror `role` into a JWT custom claim via a Supabase access-token hook to avoid a per-row subquery. If implemented, `app_role()` remains the fallback and the single source of truth.

### 4.2 Policies

Enable RLS on every table without exception, including `platform_settings` and `admin_audit_log`.

```sql
alter table profiles          enable row level security;
alter table platform_settings enable row level security;
alter table courses           enable row level security;
alter table modules           enable row level security;
alter table lessons           enable row level security;
alter table orders            enable row level security;
alter table enrollments       enable row level security;
alter table lesson_progress   enable row level security;
alter table admin_audit_log   enable row level security;
```

| Table | Operation | Policy |
|---|---|---|
| `profiles` | select | `id = auth.uid()` OR `role = 'instructor'` OR `is_admin()` |
| `profiles` | update | `id = auth.uid()` and `role` unchanged; admins unrestricted |
| `platform_settings` | select | authenticated |
| `platform_settings` | update | `is_admin()` |
| `courses` | select | `status = 'published'` OR `instructor_id = auth.uid()` OR `is_admin()` |
| `courses` | insert | `app_role() in ('instructor','admin')` and `instructor_id = auth.uid()` |
| `courses` | update | `instructor_id = auth.uid()` OR `is_admin()` — status transitions further constrained by trigger (§4.3) |
| `courses` | delete | **no policy** — deletion is prohibited |
| `modules`, `lessons` | select | parent course published OR owner OR `is_admin()` |
| `modules`, `lessons` | write | parent course owner OR `is_admin()` |
| `orders` | select | `user_id = auth.uid()` OR `is_admin()` |
| `orders` | insert/update | **no policy** — service role only |
| `enrollments` | select | `user_id = auth.uid()` OR `is_admin()` |
| `enrollments` | insert/update | **no policy** — service role only |
| `lesson_progress` | all | `user_id = auth.uid()` |
| `admin_audit_log` | select | `is_admin()`; insert service role only |

`orders` and `enrollments` deliberately have no client-facing write policy. With RLS enabled and no permissive policy, all writes from anon and authenticated roles are denied. Only the service-role client can grant access, and it does so only after payment verification.

Note that `lessons.select` intentionally does not gate on enrolment: the syllabus is public on a published course. **Enrolment is enforced at playback (§7), not at row read.** Ensure no query ever returns a usable media URL — only `video_asset_id`, which is inert without a signed credential.

### 4.3 Publication gate

The `instructor_direct_publish` setting must be enforced in the database. A UI check is insufficient because the same transition is reachable through the REST API.

```sql
create or replace function public.enforce_course_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor  user_role := public.app_role();
  direct boolean;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if actor = 'admin' then
    return new;
  end if;

  if actor = 'instructor' and old.instructor_id = auth.uid() then
    select instructor_direct_publish into direct
      from platform_settings where id = 1;

    if new.status = 'archived' then
      raise exception 'Archiving is restricted to administrators';
    end if;

    if new.status = 'published' and not direct then
      raise exception 'Publishing requires administrative review';
    end if;

    if old.status = 'published' and new.status = 'draft' and not direct then
      raise exception 'Unpublishing requires administrative review';
    end if;

    return new;
  end if;

  raise exception 'Status change not permitted';
end;
$$;

create trigger course_status_transition
  before update of status on courses
  for each row execute function public.enforce_course_status_transition();
```

Set `published_at` on the first transition into `published`, and leave it unchanged thereafter.

### 4.4 Instructor statistics without financial exposure

Instructors must not read `orders`. Because RLS denies them `enrollments` rows they do not own, a plain view would return zero counts. Use a `SECURITY DEFINER` function returning counts only.

```sql
create or replace function public.instructor_course_stats()
returns table (
  course_id        uuid,
  title            text,
  status           course_status,
  enrollment_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.title, c.status, count(e.id)::integer
  from courses c
  left join enrollments e on e.course_id = c.id
  where c.instructor_id = auth.uid()
     or public.is_admin()
  group by c.id, c.title, c.status
$$;

revoke all on function public.instructor_course_stats() from public;
grant execute on function public.instructor_course_stats() to authenticated;
```

This function returns no monetary field. Do not add one without revisiting the role model.

---

## 5. API surface

Route handlers under `app/api/`. All accept and return JSON. All validate input with a schema before use.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/checkout` | Learner | Create pending order, return payment parameters |
| `POST` | `/api/webhooks/moyasar` | Signature | Payment notification |
| `GET` | `/api/payments/callback` | Session | Post-payment return, fallback verification |
| `GET` | `/api/lessons/[id]/playback` | Learner | Issue signed playback credential |
| `POST` | `/api/lessons/[id]/progress` | Learner | Record position and completion |
| `POST` | `/api/instructor/lessons/[id]/upload` | Instructor | Issue direct upload credential |
| `POST` | `/api/webhooks/video` | Signature | Transcode status |
| `PATCH` | `/api/admin/users/[id]/role` | Admin | Change role |
| `PATCH` | `/api/admin/settings` | Admin | Update platform settings |
| `PATCH` | `/api/admin/courses/[id]/status` | Admin | Publish, unpublish, archive |
| `POST` | `/api/admin/orders/[id]/refund` | Admin | Record a refund |

Standard error shape:

```json
{ "error": { "code": "already_enrolled", "message": "..." } }
```

Every mutating route re-derives the caller's identity server-side from the session. No route accepts a user identifier from the request body.

---

## 6. Payments

### 6.1 Flow

```
POST /api/checkout
  1. Authenticate; require verified email.
  2. Load course. Reject unless status = 'published'.
  3. Reject if an enrolment already exists (409).
  4. Read price_halalas from the database. Ignore any client amount.
  5. Insert orders row: status = 'pending'.
  6. Return payment parameters, carrying order id as provider metadata.

Client completes the Moyasar form and 3-D Secure.

Confirmation — reached by webhook and by browser callback, both idempotent:
  1. Extract the provider payment id.
  2. GET the payment from the Moyasar API using the secret key.
     Trust only this response. Never the request body alone.
  3. Assert: status is paid, amount equals orders.amount_halalas,
     currency is SAR, metadata order id matches.
  4. In one transaction:
       update orders set status='paid', moyasar_payment_id=..., paid_at=now(),
                         raw_payload=<full response>
       insert into enrollments (...) on conflict (user_id, course_id) do nothing
  5. Send receipt. Email failure must not fail the transaction.
```

### 6.2 Requirements

- **Verification is server-side and mandatory.** The browser redirect is navigation, not evidence. A user who edits the return URL must gain nothing.
- **Idempotency** rests on `orders.moyasar_payment_id UNIQUE` and `enrollments (user_id, course_id) UNIQUE`. Both confirmation paths may run, in either order, more than once. The outcome must be identical.
- **Amount is re-derived server-side** at order creation and re-checked at verification. A client-supplied amount is never trusted at any point.
- **Webhook authenticity** is verified using the shared secret before any processing.
- **Failures are recorded**, with `status = 'failed'` and `failure_reason`, not discarded.
- **Refunds** set `status = 'refunded'` and `refunded_at`. Whether a refund revokes the enrolment is a policy decision pending D7; implement revocation behind a single function so the answer can change.

### 6.3 Operational notes

Confirm field names, status vocabulary and webhook signature scheme against current Moyasar documentation before implementation. Amounts are submitted in halalas. Settlement is roughly 1–3 business days for Mada and 7–14 for credit cards, which affects payout timing but not the implementation.

---

## 7. Video

Provider pending (D6); Bunny Stream recommended. Requirements are provider-independent.

### 7.1 Constraints

1. `lessons.video_asset_id` stores a provider identifier, never a playable URL.
2. Playback requires a server-issued signed credential with a lifetime of roughly two hours.
3. The credential is issued only after evaluating: free preview, or active enrolment, or ownership, or admin.
4. No public bucket, no unsigned URL, no permanent link exists in any environment.
5. Streaming is adaptive-bitrate HLS. A single progressive MP4 is not acceptable.
6. Playback overlays a per-learner identifying watermark.
7. Confirm the player's RTL behaviour before committing to a provider; many are LTR-locked and require control overrides.

### 7.2 Authorisation endpoint

```
GET /api/lessons/[id]/playback

  1. Resolve lesson → module → course.
  2. Allow if: lesson.is_free_preview and course.status = 'published'
            or is_enrolled(course.id)
            or course.instructor_id = auth.uid()
            or is_admin()
     Otherwise 403.
  3. Reject unless lesson.media_status = 'ready'.
  4. Mint a signed credential bound to video_asset_id, short TTL.
  5. Return { playbackUrl, expiresAt, watermark }.
```

### 7.3 Upload

Instructors upload directly to the provider using a server-issued, single-use credential. Video does not transit the application server. On upload the lesson moves to `processing`; the provider webhook advances it to `ready` or `failed` and records duration.

---

## 8. RTL implementation

The document is `<html lang="ar" dir="rtl">`. Beyond that, the following are enforced rules, not preferences.

### 8.1 Logical properties only

| Prohibited | Required |
|---|---|
| `ml-*`, `mr-*` | `ms-*`, `me-*` |
| `pl-*`, `pr-*` | `ps-*`, `pe-*` |
| `left-*`, `right-*` | `start-*`, `end-*` |
| `text-left`, `text-right` | `text-start`, `text-end` |
| `border-l-*`, `border-r-*` | `border-s-*`, `border-e-*` |
| `rounded-l-*`, `rounded-r-*` | `rounded-s-*`, `rounded-e-*` |

Enforce with `eslint-plugin-tailwindcss` or a `no-restricted-syntax` rule matching these class patterns in `className` literals. This must fail CI. A physical utility renders correctly in a left-to-right review environment and incorrectly in production, which makes review an unreliable control.

### 8.2 Iconography

Phosphor icons do not mirror automatically. Directional glyphs — arrows, chevrons, carets — point the wrong way under RTL. A "next lesson" chevron pointing right is pointing backwards in Arabic.

Wrap directional icons in a component applying `scale-x-[-1]`, or select the mirrored glyph. Non-directional icons must not be flipped: a mirrored clock or search glass is a defect.

### 8.3 Motion

`motion` x-axis values are physical. `initial={{ x: -40 }}` enters from the wrong edge under RTL. Derive the sign from document direction, centrally:

```ts
const dir = -1; // RTL
<motion.div initial={{ x: 40 * dir, opacity: 0 }} animate={{ x: 0, opacity: 1 }} />
```

All animation respects `prefers-reduced-motion`.

### 8.4 Numerals and formatting

Prices and course codes use Western digits. `Intl.NumberFormat('ar-SA')` defaults to Arabic-Indic numerals, which is incorrect for this context; force the numbering system:

```ts
new Intl.NumberFormat('ar-SA-u-nu-latn', {
  style: 'currency',
  currency: 'SAR',
  minimumFractionDigits: 0,
}).format(priceHalalas / 100);
```

Durations, percentages and dates follow the same rule. Never concatenate a formatted number with a currency symbol manually.

### 8.5 Mixed-direction content

Latin course codes and technical terms appear inside Arabic prose. Wrap them so bidirectional resolution does not reorder surrounding punctuation:

```tsx
<span dir="ltr" className="font-mono">EE301</span>
```

### 8.6 Verification

Every screen is reviewed at 360px in RTL before merge. Confirm: text alignment, icon direction, animation entry edge, form field alignment, dropdown and modal anchoring, progress-bar fill direction, and video player control order.

---

## 9. Design system

### 9.1 Tokens

Derived from the logo. Contrast ratios are against `#FFFFFF` unless noted.

| Token | Hex | Contrast | Use |
|---|---|---|---|
| `indigo-900` | `#08084A` | 18.4:1 | Deepest surfaces, hero overlay |
| `indigo-800` | `#0B0B66` | 16.8:1 | **Primary.** Headings, primary actions, footer |
| `indigo-400` | `#3D3DEB` | 6.9:1 | Links, focus rings |
| `violet-500` | `#4942A8` | 9.4:1 | **Secondary.** Active states, progress fill |
| `violet-100` | `#E3E2F3` | — | Tinted surfaces, badges |
| `violet-50` | `#F3F2FA` | — | Section backgrounds |
| `ink-900` | `#191925` | 15.8:1 | Body text — near-black with indigo cast, not pure black |
| `paper` | `#FBFBFD` | — | Page background — not pure white |

Both brand colours exceed WCAG AAA against white, so the interface can be built on brand colour without accessibility compromise. Reserve a single warm accent for one purpose only — price, or the enrolled marker. One warm mark on an indigo page is memorable; three accent colours is a template.

Define as Tailwind v4 theme variables in CSS. No hex literal appears in a component.

### 9.2 Typography

IBM Plex Sans Arabic throughout. Personality comes from weight contrast within one superfamily rather than a second face: Light and Regular for body, SemiBold 600 for display at large sizes. This produces the restraint the brief calls for.

IBM Plex Mono, always `dir="ltr"`, for course codes, prices and durations. These are data, not prose; setting them as data makes the catalogue scannable and signals an engineering context without literal illustration.

Type scale: define a fixed scale in theme variables. Arabic requires more line height than Latin at equivalent size — set body leading no tighter than 1.75.

### 9.3 Component conventions

- Server Components by default. `'use client'` only where interactivity or browser API access requires it, at the smallest possible boundary.
- Data fetching happens in Server Components. Client Components receive data as props.
- Every asynchronous view has explicit loading and error states.
- Focus states are visible and use `indigo-400`. Never remove an outline without replacing it.
- Touch targets are at least 44×44px.

### 9.4 Hero direction — open (D8)

A full-bleed background video is the most common template signal on the web and works against the stated identity goal. It is also a mobile LCP risk: several megabytes before first paint, on phones, on mobile data.

It is defensible only if the footage is unambiguously the client's own — a real instructor at a real whiteboard in an identifiable campus room. Stock footage undermines the entire proposition.

If retained: poster image renders first; video loads only on desktop over a fast connection; muted; no controls; `prefers-reduced-motion` respected; total payload under 3MB.

Alternative for consideration: make the hero the product itself — one real course card with a real title, instructor, price and scope line. Nothing demonstrates a working platform faster than showing one.

### 9.5 Copy standard

Copy names actual course codes, actual instructors, and actual coverage. Generic marketing claims are rejected at review. The specificity is the product's only defensible claim; abstraction discards it.

---

## 10. Project conventions

```
app/
  (marketing)/          landing, about, FAQ
  (catalogue)/courses/  catalogue, course detail
  (learn)/              dashboard, player          — auth required
  (studio)/             instructor authoring       — instructor required
  (admin)/              administration             — admin required
  api/                  route handlers
components/
  ui/                   primitives
  <feature>/            feature components
lib/
  supabase/
    server.ts           session-bound server client
    client.ts           browser client
    admin.ts            SERVICE ROLE — server only, restricted import
  payments/
  video/
  format/               currency, duration, date — RTL-aware
supabase/migrations/
```

**Conventions.** TypeScript `strict`, no new `any`. Database types generated from the schema, never hand-written. Route groups enforce authorisation in layout, and every route handler re-checks independently — layout protection is a convenience, not a control. Migrations are forward-only and committed separately from application code.

---

## 11. Verification checklist

Complete before launch.

**Authorisation**
- [ ] Every table has RLS enabled
- [ ] Direct browser-client query of each table returns only permitted rows
- [ ] A non-enrolled user receives 403 from the playback endpoint
- [ ] An instructor cannot read `orders` through any path, including the REST API
- [ ] `instructor_course_stats()` exposes no monetary field
- [ ] An instructor cannot modify another instructor's course
- [ ] A learner cannot self-promote by updating `profiles.role`

**Payments**
- [ ] A tampered client amount is rejected
- [ ] Replaying the webhook produces exactly one enrolment
- [ ] Webhook and callback arriving in either order produce identical state
- [ ] Forging the callback URL without a real payment grants nothing
- [ ] An unsigned webhook is rejected
- [ ] Failed payments are recorded with a reason

**Publication gate**
- [ ] With the setting off, an instructor cannot publish via the REST API
- [ ] With it on, they can
- [ ] The change takes effect without deployment
- [ ] An instructor cannot archive in either state

**Media**
- [ ] No permanent or public media URL exists in any environment
- [ ] An expired credential fails
- [ ] A credential issued to one learner is not usable by another

**RTL and accessibility**
- [ ] No physical direction utility remains; the lint rule fails on introduction
- [ ] Directional icons mirror; non-directional icons do not
- [ ] Animations enter from the correct edge
- [ ] Prices render in Western numerals with SAR formatting
- [ ] Every interactive element is keyboard reachable with visible focus
- [ ] `prefers-reduced-motion` is respected
- [ ] Every screen verified at 360px in RTL

**Data integrity**
- [ ] Archiving a course preserves playback for existing enrolees
- [ ] No code path deletes an order or an enrolment
- [ ] Backups are configured and a restore has been tested

**Secrets**
- [ ] Production bundle contains no server-only variable
- [ ] Service-role key is imported only by intended modules
