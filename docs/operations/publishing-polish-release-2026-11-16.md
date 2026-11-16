# Publishing polish and policy acceptance release — 2026-11-16

## Scope

Production-based release assembled on `d1ac7d7a16028eed5c5c792afb7270ec5a50b5e9`, retaining deployed instructor-wide edit permission, video playback/preview, admin review and authentication fixes. Includes all six pending polish waves, hero image, dark mode, bilingual title, Arabic branding/copy, latest-course description, general-engineering grouping, FAQs/teaching invitation, one HTML policy page and real support contacts.

Policy acceptance is required for registration and existing learner/instructor accounts, with an admin exemption based on the database role. Header/hero course labels read **الدورات**, teaching links read **اشرح مع إلام**, and **معايير القبول** is removed from the footer.

Only migration `202611130001_policy_acceptance.sql` is new. It is additive and does not backfill acceptance, change roles, or modify existing course content. Apply it before deploying the code. Do not seed/reset a hosted database. Previous deployment for rollback: `eb483656-09c2-47e3-92a7-637e79d42900`.

## Candidate checks

- Production-based backend suite: 432 tests across 80 files passed. Its count differs from the older development checkout; preserve production-specific tests and behavior.
- All 41 browser checks passed against the release candidate, covering mobile/desktop, light/dark, policies, consent, and existing player/editor flows.
- TypeScript and lint passed.
- Production migration dry run confirms exactly one new migration, no seeds or roles.
- Corrected a preexisting unscoped `button:disabled` CSS-module selector to its local button classes for Webpack compatibility.
- Updated Next.js and its lint config from 16.4.2 to 16.4.6 after the dependency audit identified GHSA-mfr8-8qww-v76h. The candidate lockfile has no high/critical advisories; seven moderate development-tool dependency advisories remain outside this runtime patch.

CI, deployment IDs, database verification and live smoke results will be recorded after rollout. The source worktree and prior launch-task documents are preserved.
