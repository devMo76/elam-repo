# Production launch tracker

Use [plan.md](plan.md) for each task's acceptance, verification, dependencies, likely files, and scope. Record evidence links when checking items. Green CI alone does not close provider, legal, device, or operational work.

The current hosted-staging sequence and sign-off evidence are tracked in [staging-deployment-execution.md](staging-deployment-execution.md). Sprint checkboxes below remain open until that evidence is reviewed.

Sprints 0–2 repository work and outstanding acceptance checks are recorded in [sprints-0-2-execution.md](sprints-0-2-execution.md). Items remain open until owner/staging verification, even where code is implemented.

## Sprint 0 — Scope and baseline

- [ ] 0.1 Decide launch mode, methods, PDF rule, role/revenue scope, policies, owners, and course inventory.
- [ ] 0.2 Audit environment, migration/seed, domains, provider keys, backup, and monitoring boundaries.
- [ ] Checkpoint 0: scope approved and current CI green.

## Sprint 1 — Production-like staging

- [ ] 1.1 Provision separate Railway/Supabase staging and apply migrations.
- [ ] 1.2 Configure custom SMTP/auth recovery and test with an external mailbox.
- [ ] 1.3 Verify approved catalogue and real Bunny media/access.
- [ ] Checkpoint 1: auth and video journeys pass on staging.

## Sprint 2 — Learner readiness

- [ ] 2.1a Add previous/next lesson navigation and resume choice.
- [ ] 2.1b Harden `ended` completion and progress concurrency with real video.
- [ ] 2.2a Add private PDF metadata, Storage policy, and signed access.
- [ ] 2.2b Add instructor PDF upload/replace/remove.
- [ ] 2.2c Add learner PDF open/download and expired-link refresh.
- [ ] 2.3 Resolve archived purchased-course entitlement.
- [ ] Checkpoint 2: free and previously purchased/archived learning, navigation, progress, and PDFs work on staging.

## Sprint 3 — Commerce

- [ ] 3.1 Complete real Moyasar sandbox success/failure/duplicate/delay/refund matrix.
- [ ] 3.2 Configure receipt sender and retry scheduler; rehearse payment support recovery.
- [ ] 3.3 Add purchase/receipt discovery and pending-payment recovery.
- [ ] 3.4 Prepare live methods/Apple Pay if selected; controlled live transaction occurs in Sprint 6.
- [ ] Checkpoint 3: sandbox order, entitlement, and receipt records reconcile.

## Sprint 4 — Trust and recovery

- [ ] 4.1 Publish approved legal/contact/support/refund/invoice disclosures.
- [ ] 4.2a Add and test CSP/security headers with provider domains.
- [ ] 4.2b Add abuse controls and review MFA, preview protection, RLS, and secrets.
- [ ] 4.3a Connect retained errors/uptime/payment/video/cost alerts.
- [ ] 4.3b Rehearse staging backup restore and rollback; assign incident owner.
- [ ] Checkpoint 4: policy, support, security, monitoring, and recovery demonstrated.

## Sprint 5 — Release candidate

- [ ] 5.1 Automate critical browser journeys and role isolation.
- [ ] 5.2 Complete iOS/Android/desktop, RTL, keyboard, screen-reader, and failure-state matrix.
- [ ] 5.3 Measure 10/20/50-user traffic, Web Vitals, provider latency, and costs; repair measured bottlenecks.
- [ ] Checkpoint 5: release-candidate quality, device, and load gates signed.

## Sprint 6 — Production and launch

- [ ] 6.1 Configure isolated production, domain/TLS, redirects, webhooks, email, metadata, migrations, and approved content without synthetic seed.
- [ ] 6.2 Complete controlled live purchase/refund and invited-cohort soft launch; reconcile every payment.
- [ ] 6.3 Record owner go/no-go and accepted defects against every hard gate in the plan.

## Evidence register

| Sprint | Evidence link/path | Reviewer | Date |
| --- | --- | --- | --- |
| 0 | [Repository audit](sprints-0-2-execution.md) (scope approval pending) | Product owner | 2026-10-02 |
| 1 | [Staging/content checklist](sprints-0-2-execution.md) (external setup pending) | Product owner | 2026-10-02 |
| 2 | [Implementation and acceptance script](sprints-0-2-execution.md) (database/staging tests pending) | Product owner | 2026-10-02 |
| 3 | [Implementation and open provider gates](sprints-3-5-execution.md) | Product owner | 2026-10-02 |
| 4 | [Security work and open operational gates](sprints-3-5-execution.md) | Product owner | 2026-10-02 |
| 5 | [Release-candidate checks, not yet signed](../docs/operations/release-candidate-checks.md) | Product owner | 2026-10-02 |
| 6 | Pending | Pending | — |
