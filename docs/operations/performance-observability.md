# Performance Observability Runbook

**Status:** Task 0.2 foundation  
**Updated:** 2026-09-17

## Purpose

This instrumentation establishes comparable evidence before performance changes. It records route-grouped Core Web Vitals and structured server/dependency durations without recording URLs, query strings, emails, names, course titles, lesson titles, payment identifiers, or video identifiers.

It is intentionally vendor-neutral. In local development, staging, and a basic container deployment, events are emitted as one-line JSON logs. A production log platform can parse the same fields without changing application behavior.

## Configuration

```dotenv
PERFORMANCE_TELEMETRY_ENABLED=true
NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE=0.1
NEXT_PUBLIC_APP_RELEASE=<commit-or-release-id>
```

- `PERFORMANCE_TELEMETRY_ENABLED=false` disables server event output. Timing code remains functionally transparent.
- `NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE` accepts a number from `0` to `1`. Development defaults to `1`; production defaults to `0.1`.
- `NEXT_PUBLIC_APP_RELEASE` should identify the deployed commit or release. Vercel's public Git commit SHA is used as a fallback when available.
- Changing a `NEXT_PUBLIC_` value requires a rebuild because Next.js embeds it in the client bundle.

Do not place secrets, user identifiers, or free-form content in telemetry fields.

## Event catalogue

| Event | Source | Important fields |
|---|---|---|
| `performance.instrumentation_ready` | Next.js server startup | timestamp, runtime |
| `performance.server_request` | selected API boundary | requestId, stable name, method, durationMs, statusCode, dependency totals |
| `performance.server_operation` | Supabase/provider operation | requestId when available, stable name, category, durationMs, status |
| `performance.server_error` | Next.js request error hook | route template, route type, error type, digest |
| `performance.web_vital` | sampled real browser visit | LCP/INP/CLS, rating, route category, device category, navigation type, release, sample rate |

The dependency categories are `internal`, `supabase`, `moyasar`, `bunny`, and `resend`. Correlated API responses also include:

- `X-Request-Id`, which matches the server log entry;
- `Server-Timing`, which exposes total application duration and measured dependency totals to browser developer tools.

## Low-cardinality route categories

Dynamic slugs and UUIDs are removed in the browser before reporting:

- `marketing`
- `catalogue`
- `course-detail`
- `auth`
- `learner-dashboard`
- `course-player`
- `studio-overview`
- `studio-courses`
- `studio-course-new`
- `studio-course-editor`
- `studio-profile`
- `admin`
- `account`
- `other`

The collector uses a strict schema and rejects additional fields, including raw paths.

## Local verification

1. Set `PERFORMANCE_TELEMETRY_ENABLED=true` and `NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE=1` in `.env.local`.
2. Start the application with `npm run dev`.
3. Open browser developer tools and keep the Network and Console panels visible.
4. Complete one journey from each relevant group:
   - landing → catalogue → course detail;
   - sign-in → learner dashboard → course player;
   - Studio overview → course editor;
   - payment callback fixture or sandbox payment;
   - instructor video-status poll.
5. Filter the server terminal for `performance.` and save the JSON lines with the test date, release, device, and environment.
6. Inspect sign-in, callback, and video-status responses for `Server-Timing` and `X-Request-Id`.
7. Confirm `/api/telemetry/web-vitals` returns `204`. LCP may arrive after page load, CLS when the page becomes hidden, and INP only after an interaction.

These browser events are first-party RUM only after deployment to real users. Local results remain single-session lab observations.

## Staging baseline procedure

For landing, catalogue, course detail, sign-in, learner dashboard, course player, Studio overview, and course editor:

1. Record the exact release, deployment region, database region, browser version, viewport, network/CPU profile, authentication state, and cold/warm cache state.
2. Run at least three equivalent navigations per route and report the median and range.
3. Keep mobile and desktop results separate.
4. Aggregate LCP, INP, and CLS at p75; also retain sample count and good/needs-improvement/poor percentages.
5. Aggregate server request/operation duration at p50 and p95 by stable name and status.
6. For payment and video journeys, compare total request time with Moyasar, Resend, or Bunny contribution using the same request ID.
7. Mark unavailable field data as unavailable—not passing.

## Suggested dashboard views

Once the hosting/logging provider is selected, create these views from the existing fields:

1. Core Web Vitals p75 by route, device, release, and navigation type.
2. Server duration p50/p95 and error rate by request/operation name.
3. Dependency p50/p95 separated into Supabase, Moyasar, Bunny, and Resend.
4. Slow correlated requests where a provider consumes most of total duration.
5. Release comparison with sample count and sampling rate displayed.

Do not use averages as the Core Web Vitals pass/fail signal. Do not compare cohorts collected with different sampling rates without weighting or normalization.

## Current limits

- JSON logs are not yet a retained analytics database or visual dashboard.
- Client metrics use delivery sampling and may be blocked by browser/network policy.
- The current instrumentation measures named application operations, not every individual SQL statement.
- Direct-to-Bunny upload bytes occur between the browser and Bunny; the server observes creation/status calls, while client upload duration remains in the upload manager.
- Capacity claims still require the separate 10/20/50-user load baseline in the next measurement task.
