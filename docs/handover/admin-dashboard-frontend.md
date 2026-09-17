# Administration dashboard frontend handover

## Delivered

The administration workspace is available under `/admin` and is protected by
the existing `requireRole(path, "admin")` guard. It uses the current Elam RTL
design tokens and has a fixed desktop navigation rail that becomes a scrollable
navigation row on small screens. The rail now contains the Elam logo and lives
in a persistent admin route layout, so navigation changes only the requested
page content rather than remounting the workspace.

On screens at or below 760px, the navigation rail becomes a compact sticky
header: the logo and signed-in administrator remain visible, and the complete
set of destinations is available through a touch-scrollable, snap-aligned row.
Filters, pagination, settings controls, and dashboard cards reflow to one
column. Operational tables retain their columns and scroll horizontally within
their own container, rather than forcing the whole page to overflow. Loading
and recovery content is rendered inside the persistent workspace without a
second layer of mobile padding.

| Route | What it shows | Backend connection |
| --- | --- | --- |
| `/admin` | Revenue, enrolment, active-course summary and operational links | `getAdminDashboardSummary()` |
| `/admin/statistics` | Revenue by course with optional date interval | `getAdminDashboardSummary()`, `getAdminRevenueByCourse()` |
| `/admin/orders` | Read-only purchase history with search, status/date filters, and pagination | `getAdminPurchaseHistory()` |
| `/admin/courses` | Review queue, status filter, publish/draft/archive controls | `getAdminCourses()`, `PATCH /api/admin/courses/:courseId/status` |
| `/admin/users` | Searchable role directory and confirmed role changes | `getAdminUsers()`, `PATCH /api/admin/users/:userId/role` |
| `/admin/settings` | Direct-publish setting and read-only audit history | `getAdminPlatformSettings()`, `GET /api/admin/audit`, `PATCH /api/admin/settings` |

## Security and data flow

- Pages authenticate and authorize on the server before calling direct
  server-only query adapters. No Supabase client, raw database record, or
  secret crosses into a client component.
- List filters and pagination are URL-owned. Date-only inputs are translated
  to UTC ISO timestamps before the existing Zod API-query contracts are used.
- Course status, user role, and direct-publishing changes require an explicit
  visual confirmation. Their client controls call only the existing protected
  `/api/admin/**` mutation routes, then refresh server-rendered data.
- Orders, audit history, and revenue reports are read-only. The UI intentionally
  has no refund, deletion, enrolment-removal, audit-edit, or administrator
  bootstrap action.
- A route error boundary presents a generic recovery message without exposing
  an internal database or API error.
- Local `supabase/seed.sql` supplies deterministic users, courses, orders,
  enrolment, and audit records for the same database queries that power the
  screens. It is development/test data only and runs during a clean reset.

## Automated verification

Completed on 2026-09-15:

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run test:backend` — passed, 39 files / 156 tests.
- `npm run build` — passed; all six `/admin/**` pages compile as dynamic
  routes.
- `npm run verify:client-bundle` — passed; 52 client bundles contained no
  server-only variables or configured secrets.
- Anonymous requests reached the sign-in return path for all six routes. In
  current Next navigation responses this is represented in the rendered
  redirect metadata rather than a conventional HTTP 302 response.

The focused presentation test covers conversion of `YYYY-MM-DD` form values to
the validated inclusive UTC interval required by the reporting APIs.

## Manual acceptance checklist

Before treating the dashboard as released, create and promote a real local
administrator using [first-admin-promotion.md](../operations/first-admin-promotion.md),
then sign out and in again.

- [ ] Open each of the six routes at 1440px, 768px, and 360px. Confirm the
  active navigation state and keyboard focus are visible. At 360px, confirm
  the header stays compact, its navigation can be swiped horizontally, and a
  wide table scrolls inside its own region without moving the document.
- [ ] As a learner and an instructor, request `/admin`; confirm each is sent
  to its own home page and cannot read an admin table through browser tools.
- [ ] On `/admin/statistics`, submit a start/end date and confirm the summary
  reflects only paid orders in that interval.
- [ ] On `/admin/orders`, verify search, status, date filters, empty state,
  and next/previous pagination links.
- [ ] On `/admin/courses`, cancel one confirmation, then publish, return to
  draft, and archive safe test courses. Confirm the state refreshes and an
  audit entry is created.
- [ ] On `/admin/users`, change another test account’s role, cancel one
  pending change, and confirm changing the current administrator is rejected
  with the API message.
- [ ] Toggle direct publishing, cancel once, then confirm once. Verify the
  saved state and corresponding audit entry after refresh.
- [ ] Tab through forms, tables, confirmation controls, navigation, and
  mobile overflow. Confirm no action can be submitted twice while saving.

## Current limitations

- Local seed identities are intentionally not sign-in-capable. A real,
  verified account must be promoted for the manual acceptance checks.
- Orders and course revenue can correctly show empty states until Moyasar
  sandbox payments exist. The dashboard does not fabricate financial data.
