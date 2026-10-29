# Sprints 0–2 execution record

**Date:** 2026-10-02
**Status:** Repository work in progress; none of the three sprint checkpoints is accepted yet.

## Sprint 0 — scope and baseline

The product owner confirmed the recommended v1 technical scope on 2026-10-02: controlled paid launch, cards first (no launch-day Apple Pay), PDF support with optional attachment per lesson, existing three roles, and manual instructor promotion. Final launch courses, merchant/legal decisions, support and operations owners, domain, and evidence location still need separate approval. Do not activate live charging before those gates.

### Redacted deployment boundary audit

| Boundary | Local finding | Staging/production action |
| --- | --- | --- |
| Application | Next.js 16.3.3, Node 22.17.1, `npm run build`; local app uses port 3001 | Separate Vercel staging and production projects; pin Node; configure HTTPS domain and preview protection |
| Database | Versioned SQL in `supabase/migrations`; local synthetic seed in `supabase/seed.sql` | Separate Supabase staging and production projects; apply migrations in filename order; never run seed in production |
| Supabase variables | Local public URL/anon key and service-role key are present | Set each environment's own keys in encrypted host settings; never expose service role to browser |
| Auth URL/email | Local `supabase/config.toml` points to localhost:3001 with confirmation enabled; no linked hosted project found | Set hosted Site URL and exact redirect allowlist to staging/final domain; configure custom SMTP, sender SPF/DKIM/DMARC, then test external inbox |
| Bunny | Local library/API/read-only/token variables present | Confirm distinct intended library and final assets/rights; test signed playback for preview and enrolled users and denial for others |
| Payments | Local publishable key present; local Moyasar secret/webhook variables absent | Sandbox only in staging; no live checkout until Sprint 3 and launch gates |
| Receipt email | Local `EMAIL_API_KEY`/`EMAIL_FROM_ADDRESS` absent | Configure verified sender and later the retry scheduler per `docs/operations/payment-receipts.md` |
| Site URL | Local `NEXT_PUBLIC_SITE_URL` present | Set canonical HTTPS origin separately per deployment; verify email, payment, and callback links |
| Backup/monitoring | Versioned migrations and performance event instrumentation exist; no hosted alert/restore evidence | Assign owners, retention, alerts, and backup/restore drill in Sprint 4 |

This is an inventory of **names/presence only**; no secret values are recorded. GitHub CI runs quality and database checks and uses synthetic build variables. PR preview success is not hosted staging acceptance. No `.vercel/project.json` or `supabase/.temp/project-ref` linkage was found locally.

### Safe promotion sequence

1. Product owner approves scope/course list and supplies account owners.
2. Start Docker locally, apply new migrations in a disposable local database, regenerate types, run pgTAP and DB lint. Do not reset a database containing important work.
3. Create isolated staging Supabase/Vercel; set environment variables, URL redirects, SMTP and Bunny; apply versioned migrations only, then synthetic staging fixtures.
4. Run real sign-up/verify/reset, free enrolment, Bunny, PDF, archived entitlement, and denied-access journeys; retain dated evidence with synthetic accounts.
5. Later, promote a reviewed commit and migrations to isolated production; do not seed synthetic data there. Configure production domain, secrets, auth, mail, payment, backups, and monitoring separately.

## Sprint 1 — hosted staging and content

Repository preparation exists in `docs/operations/staging-environment.md`, but provisioning and acceptance are **blocked on external account access and approved content**. There is no evidence yet of a linked hosted staging Supabase/Vercel pair, custom SMTP, external mailbox verification, final course inventory, or final Bunny assets. The local Bunny variables alone do not prove a finished course or hosted playback. The production `supabase/config.toml` is a local configuration, not proof of hosted Auth settings.

Owner verification checklist:

- [ ] Record staging project IDs/regions and responsible owner (never secrets in this file).
- [ ] Migrations applied to staging without production seed; auth Site URL and redirect allowlist checked.
- [ ] Sign up, confirmation, resend, reset, expired-link recovery verified from a non-team mailbox.
- [ ] Final free course and each advertised paid course approved for title, instructor, rights, price, lesson order, and Bunny readiness.
- [ ] Preview/enrolled video playback succeeds; non-entitled access fails; upload processing and retry observed.

## Sprint 2 — learner implementation

Repository changes in this sprint:

- Previous/next controls follow the accessible lesson order; locked lessons are not traversed. Opening a course without `?lesson=` resumes the most recently updated lesson when present.
- Bunny `ended` completion is queued behind an in-flight progress save, avoiding the prior dropped completion event. A newer playback position is no longer overwritten by an older save response. UI uses “تمت المشاهدة”.
- Validly enrolled learners can read archived course/module/lesson rows and continue from the dashboard. Anonymous and non-enrolled visitors remain excluded. Catalogue filtering remains published-only.
- A private `lesson-pdfs` bucket and one optional PDF metadata record per lesson are added. Studio gets a single-use path and signed upload token, sends up to 20 MB directly to Supabase Storage, then asks the server to validate and attach it; replacement and removal are available for draft-course lessons. This direct upload avoids Vercel's [4.5 MB Function request-body limit](https://vercel.com/docs/functions/limitations). The server checks MIME/size/signature and owner/admin/draft access; learners get a fresh 60-second signed URL on each open after lesson entitlement is checked. No public Storage read policy is granted. Abandoned uploads may leave private orphan objects; cleanup/retention must be defined before production.
- A new pgTAP test covers private bucket, PDF metadata visibility, authoring denial, and archived course/PDF RLS. Unit tests cover PDF validation and access-route denial/signing behavior.

**Verification, 2026-10-02:** typecheck, lint, 248 unit tests, production build, database lint, and the focused PDF/archive + anonymous-RLS pgTAP set (24 tests) pass. Three local migrations were applied without reset/reseed; database types were regenerated and match the new schema. The full database suite ran twice; the final run executed 358 subtests and failed in nine legacy fixture-dependent files because this long-lived local database no longer matches its exact synthetic seed assumptions (extra courses/users/enrolments, changed settings/status, and audit entries). The new policy permission defect surfaced by the first run was fixed in migration `202610020003`, and the focused tests pass afterward. A clean, disposable database run is still needed for full-suite acceptance; **do not reset the current database without explicit approval**. Real Bunny `ended`, mobile/keyboard, expired signed URLs, and two-session conflict behavior still require staging/browser acceptance.

### Human acceptance script

1. On staging, enrol a learner in the free course and finish the first video. Confirm status becomes “تمت المشاهدة”, progress increases, dashboard reflects it, and reopening without a lesson query resumes a sensible lesson.
2. Pause/seek/end while progress requests are slow; verify the final completed state persists after refresh. Repeat in two sessions and confirm a conflict reload does not falsely mark incomplete.
3. Use previous/next on desktop, 360px mobile, and keyboard. Confirm order is curriculum order and preview users cannot jump into locked lessons.
4. In a draft course, upload a valid PDF in Studio, replace it, and remove it. Try a renamed non-PDF and an over-20 MB file; both must fail. Published/review course editing and other instructors must be denied.
5. As an eligible learner, open the PDF twice more than a minute apart; each click should work. As a non-enrolled user, try both metadata and open URLs and confirm denial. Check private object URLs are not publicly accessible.
6. Archive an enrolled course; the dashboard must retain its link and the player, progress, and PDF must work. Anonymous and non-enrolled accounts must not see its curriculum.

No sprint checkpoint should be checked off until the staging and human acceptance steps above pass.
