# Production launch plan

**Status:** In progress, 2026-10-02. Sprint 0 scope approval and Sprint 1 hosted acceptance remain open; see [execution record](sprints-0-2-execution.md). Hosting decision amended to Railway; prior Vercel previews do not count as Railway staging acceptance.

**Execution checklist:** [todo.md](todo.md)

**Goal:** Launch the existing Arabic course platform on the owned domain with reliable registration, free and paid enrolment, entitled learning, instructor authoring, administration, support, and recovery.

## Starting point

The current app connects catalogue, auth, learner, Studio, Admin, Bunny, and Moyasar code. PR #11 passed quality, database, and preview checks at commit `78739a4`. That establishes a code baseline, not acceptance of live payment, final media, production configuration, legal copy, accessibility, or capacity. The current footer has placeholder legal/contact links; checkout offers cards but no Apple Pay; PDFs and previous/next lesson controls are planned but unimplemented. Existing work is specified in [experience-improvement-sprint-plan.md](../docs/roadmap/experience-improvement-sprint-plan.md) and [roles-revenue-learning-expansion-plan.md](../docs/roadmap/roles-revenue-learning-expansion-plan.md).

## Release profile and decisions

Approved v1 scope (product-owner confirmation, 2026-10-02): a **controlled paid launch** with a few complete courses, current learner/instructor/admin roles, admin-reviewed publication, card payment first (no launch-day Apple Pay), private video and PDF resources with PDFs optional per lesson, and human support. Keep synthetic seed accounts, courses, orders, audit entries, and media IDs out of production. The final course list, policy/merchant details, and responsible owners still require separate approval.

The product owner confirmed the recommended technical scope above. The following decision record remains for the outstanding commercial and operational details:

1. Paid launch or free-only beta? A free beta must disable paid purchase actions. A paid launch must pass every commerce/legal gate below.
2. Apple Pay on day one? Current checkout config supports `creditcard` only. If selected, add and verify Apple Pay on the final domain.
3. Confirm PDF **support** at launch and whether a PDF is optional per lesson (recommended) or required on every lesson.
4. Are owner/supervisor ranks, instructor applications, revenue visibility, draft reviewer access, and the add-content dialog needed on day one? Recommended: defer the rank/revenue migration unless multiple departments and scoped administrators must operate immediately. Manual instructor promotion can serve v1.
5. Approve refund/access terms, merchant identity, instructor agreements, revenue share, and tax-invoice treatment with qualified Saudi advisers.

Changing one of these decisions updates this plan before dependent implementation. The previous request that PDF attachment is required is interpreted as required **capability**, with optional attachment on each lesson pending confirmation.

## Delivery dependency

```text
scope + merchant decisions
  -> isolated staging + provider accounts
  -> real end-to-end journeys + learner fixes
  -> legal/security/operations
  -> device + load verification
  -> production migration/domain -> soft launch -> public launch
```

Provider setup and independent feature work can overlap. Live payment activation waits for the legal, production, and sandbox gates. Each task is a vertical slice with its own verification; larger items are broken into sub-tasks in [todo.md](todo.md).

## Sprint 0 — Scope and baseline

**0.1 Decide release scope.** Record the five decisions, launch course list, responsible owners, excluded work, and evidence location. Acceptance: a reviewer can trace every promised user journey to a task; no open decision is silently treated as approved. Verification: product-owner review of this plan and checklist. Depends on none. Likely files: `tasks/plan.md`, `tasks/todo.md`. Size: Small.

**0.2 Audit deployment boundaries.** Inventory staging/production projects, variable names and owners without copying values, migration order, seed exclusion, canonical domain, callbacks, backups, and monitoring. Acceptance: a redacted environment matrix and deployment sequence exist. Verification: compare with `.env.example`, provider dashboards, and clean migration history. Depends on 0.1. Likely files: `docs/operations/staging-environment.md`, production runbook. Size: Medium.

**Checkpoint:** Scope approved; current CI green; no live charging enabled.

## Sprint 1 — Production-like staging and content

**1.1 Hosted staging.** Provision separate Railway and Supabase staging projects, apply versioned migrations, configure auth redirects/TLS, and exclude production credentials. Acceptance: staging smoke tests work against staging data only. Verification: migrate, register, verify, sign in, inspect secret boundaries. Depends on 0.2 and owner account access. Likely files: staging/deployment runbooks. Size: Medium plus external setup.

**1.2 Auth email.** Configure custom SMTP and authenticated sender DNS; test confirmation, reset, resend, and expired links with a non-team mailbox. Acceptance: external users receive and can use messages; errors recover cleanly. Verification: real inbox and DNS checks. Depends on 1.1. Likely files: auth templates/configuration notes, auth code only for observed defects. Size: Medium.

**1.3 Course/video inventory.** Verify actual titles, codes, prices, instructors, rights, curriculum, and final Bunny assets. Acceptance: at least one complete free path and every advertised paid course has playable entitled lessons; no synthetic data or media remains in production inventory. Verification: owner content review; signed playback for preview/enrolled users, denial for others; upload/processing/retry checks. Depends on 1.1 and final content. Likely files: content inventory and video handover. Size: small course batches.

**Checkpoint:** Staging auth and real Bunny playback work with representative approved content.

## Sprint 2 — Learner experience and private resources

**2.1 Lesson continuity.** Add previous/next controls and sensible dashboard resume; harden Bunny `ended` completion and concurrent progress saves. Acceptance: navigation follows curriculum/access rules, completion is recorded once, progress does not regress, manual retry works. Verification: focused player/progress tests and real video on mobile/keyboard/two sessions. Depends on 1.3. Likely files: `CoursePlayer.tsx`, progress queries, dashboard, focused tests. Size: split navigation and completion into Medium slices.

**2.2 Private PDFs.** Add validated private Storage metadata/access, Studio upload/replace/remove, and learner signed open/download. Acceptance: only entitled learners and eligible preview viewers receive resource metadata/URLs; instructor ownership controls edits; PDFs remain optional per lesson unless 0.1 changes this. Verification: RLS/route/file-validation tests plus staging upload and mobile viewing. Depends on 0.1 and 1.1; follow Phase C of the expansion plan. Likely files: migration/Storage policies, API/contracts, Studio and learner components. Size: split backend, Studio, and learner UI into Medium slices.

**2.3 Archived entitlement.** Make archived purchased courses available according to approved access terms. Acceptance: an enrolled learner can open the course curriculum while anonymous/ineligible visitors cannot. Verification: archived/enrolled versus anonymous policy and player tests. Depends on 0.1 and 1.1. Likely files: course read policy/query, player, focused tests. Size: Medium.

**Checkpoint:** Free and previously purchased/archived learning, progress, navigation, and PDFs work on staging with real video. New paid purchase and recovery are signed in Sprint 3.

## Sprint 3 — Commerce and transactional email

**3.1 Moyasar sandbox.** Test card success, decline, 3-D Secure, abandonment, late/duplicate callback/webhook, mismatched amount, already-owned, and refund/reversal. Acceptance: one verified paid transition creates one enrolment; browser redirect alone grants none; provider and database records reconcile. Verification: actual sandbox payments and regression tests. Depends on 1.1, 0.1, sandbox account/webhook. Likely files: checkout/callback/webhook code and tests only for observed defects. Size: Medium acceptance matrix.

**3.2 Receipts and recovery.** Configure sender and authenticated retry schedule for `/api/jobs/payment-receipts`; define support procedure for missing access/receipts. Acceptance: email failure never blocks enrolment, retries persist, duplicate events do not duplicate receipts. Verification: sandbox receipt, outage/retry simulation, worker authorization, queue inspection. Depends on 1.2 and 3.1. Likely files: receipt runbook, scheduler config, targeted tests. Size: Medium.

**3.3 Learner purchase recovery.** Give learners a way to find their purchase/receipt status and retry a pending or paid-without-access check without creating another charge. Acceptance: pending-to-paid, already-owned, and support states are clear and authorized. Verification: sandbox provider scenarios and support walkthrough. Depends on 3.1 and 3.2. Likely files: dashboard/account, payment status/recovery route and focused tests. Size: Medium.

**3.4 Prepare live methods.** Activate approved merchant account/methods and prepare the production callback/webhook settings; implement Apple Pay only if selected. Acceptance: live credentials are available to the deployment owner and required domain verification is complete; no live charge is attempted before cutover. Verification: redacted provider configuration review and Apple Pay test if selected. Depends on 3.1 and 0.1. Likely files: production runbook and Apple Pay code/tests if selected. Size: Medium plus external activation.

**Checkpoint:** Sandbox money-to-learning path passes. Keep live charging disabled until the legal/security/production gates pass.

## Sprint 4 — Trust, security, and operations

**4.1 Legal and support.** Publish owner-approved Arabic terms, privacy, refund/cancellation, merchant/contact details, access promise, and non-affiliation statement before purchase; agree invoice/tax handling with an accountant. Acceptance: real footer links, clear purchase disclosures, working support and refund paths. Verification: adviser/owner sign-off and mobile link review. Depends on 0.1. Likely files: policy pages, `SiteFooter.tsx`, checkout disclosure. Size: separate Small pages/content tasks.

**4.2 Security boundaries.** Add tested CSP/security headers compatible with Bunny/Moyasar; add abuse controls to auth/checkout/high-cost routes; review RLS, service key isolation, webhook auth, provider/team MFA, and preview protection. Acceptance: permitted media/payment still work; unauthorized and abusive requests fail safely. Verification: header, rate-limit, role, and secret-scan tests plus Supabase Security Advisor. Depends on provider domains in 1.3/3.1. Likely files: `next.config.ts`/request boundary, selected API routes, tests/runbook. Size: split headers and abuse controls.

**4.3 Monitoring and recovery.** Connect retained errors/logs, uptime, payment/receipt/video and cost alerts; define incident owner, deploy rollback, backup policy, and rehearse restore. Acceptance: a test alert reaches an owner and a staging backup is restored. Verification: recorded alert/restore/rollback drill without personal data in logs. Depends on 1.1 and 3.2. Likely files: operations runbooks, provider configuration. Size: several Small tasks.

**Checkpoint:** Policies and support work; security and recovery controls are demonstrated.

## Sprint 5 — Release candidate validation

**5.1 Browser journeys.** Automate registration/verification return, free enrolment, paid sandbox purchase, progress, Studio submission, and Admin review. Acceptance: repeatable tests detect access and role regressions. Verification: CI/staging run with failure artifacts. Depends on Sprints 1–4. Likely files: browser test config/specs and CI. Size: several Medium journey slices.

**5.2 Human device/accessibility pass.** Review 360px/mobile/tablet/desktop, iOS Safari, Android Chrome, keyboard, screen reader, RTL, reduced motion, loading/error, and payment states. Acceptance: no critical issue remains; issues have retest evidence. Verification: signed device matrix. Depends on Sprints 1–4. Likely files: QA record and targeted component fixes. Size: audit plus small fixes.

**5.3 Capacity baseline.** Measure 10/20/50 concurrent users against production-like content and region; capture p50/p95, errors, DB calls, provider timing, Web Vitals, and costs. Acceptance: agreed thresholds from evidence; no access leak, duplicate enrolment, or unbounded polling. Verification: repeatable load scripts and before/after traces for any fix. Depends on 1.1, 1.3, 4.3. Likely files: load scripts/results and measured query fixes. Size: split by observed bottleneck.

**Checkpoint:** Critical journeys, CI, device matrix, and agreed traffic threshold pass.

## Sprint 6 — Production cutover and launch

**6.1 Production environment.** Apply approved migrations to dedicated production Supabase, connect isolated Railway production service and domain/TLS, set real secrets/redirects/webhooks/email, publish approved content and support/legal pages. Add canonical metadata, robots, sitemap, and per-course sharing metadata. Acceptance: no synthetic seed or test key; production smoke test passes. Verification: redacted config, migration, DNS/TLS, secret-scan, and route checks. Depends on Sprint 5 and 4.1. Likely files: production runbook, metadata/robots/sitemap routes. Size: several Small tasks plus external setup.

**6.2 Soft launch.** Invite a small cohort; complete free and controlled live paid journeys, receipt, refund, and support; reconcile every payment daily. Acceptance: one low-value live purchase/refund reconciles across Moyasar, order, enrolment, and receipt; defects are fixed/retested and alert owners observe actual operation. Verification: owner-supervised transaction ledger and incident log. Depends on 6.1 and 3.4. Likely files: launch evidence/runbook. Size: operational checkpoint.

**6.3 Public go/no-go.** Product owner signs every hard gate and accepts remaining noncritical defects and on-call responsibility. Verification: review current CI, cohort feedback, reconciliations, alerts, backups, and rollback rehearsal. Depends on 6.2. Likely files: `tasks/todo.md`, release record. Size: Small.

## Hard go/no-go gates

1. Owned HTTPS domain, separate production credentials/data, migrations, auth email/redirects, and final content verified.
2. Real signed Bunny playback works for entitled users and denies unauthorized access.
3. Free enrolment and every selected live payment method work; verified payment yields one entitlement and a recoverable receipt/refund path.
4. Required PDF capability and lesson continuity pass under the Sprint 0 scope decision.
5. Approved terms, privacy, refund, merchant/contact, and applicable invoice process are published.
6. Security review, database/quality CI, device/accessibility matrix, and measured load target pass.
7. Alerts, backup restore, support ownership, and rollback are demonstrated.

If a gate fails, stay in staging or run an explicitly approved free-only beta with checkout disabled.

## Deferred unless Sprint 0 promotes them

Owner/supervisor migration; instructor application flow; in-app revenue split visibility/payout ledger; reviewer draft preview; add-content modal; catalogue filters; optional profile/social polish. The [expansion plan](../docs/roadmap/roles-revenue-learning-expansion-plan.md) remains the feature specification. Written instructor compensation terms are still required before any paid sales even if software reporting is deferred.

## Operating method and risks

Finish one vertical slice at a time; run focused tests then relevant CI/build/database checks; review Arabic/mobile/role states; document evidence; stop at each sprint checkpoint for owner review. Main external risks are merchant activation, final content availability, email/domain setup, and legal/invoice decisions. Keep separate staging/production credentials and a daily payment reconciliation until the live path has a stable track record.
