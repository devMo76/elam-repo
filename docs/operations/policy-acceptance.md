# Policy acceptance: registration and existing accounts

## Plan

1. Give the published policy an explicit version, tied to the supplied PDF. Require an unchecked checkbox and a policy link when registering. Validate the affirmative choice and version at the registration API before Supabase signup.
2. Add an immutable, per-user/per-version acceptance record with a server timestamp. Record new signups atomically through an Auth insert trigger; never infer acceptance for existing users, trust later editable user metadata, or backfill their agreement.
3. Give existing signed-in users a focused policy dialog. Require an explicit checkbox before saving; allow reading the policy in another tab and signing out. Preserve the safe original destination and their content. Save acceptance before resuming; failure must keep the dialog available for retry.
4. Enforce acceptance for authenticated application pages and account APIs on the server. Exempt policy/auth/recovery and provider callbacks, webhooks and jobs so a consent prompt cannot interrupt payment settlement or account recovery.
5. Test API rejection, immutable storage/RLS, registration capture, existing-account acceptance, redirect/cookie preservation, retry and mobile/keyboard interaction. Apply and test only in the local database; no production changes without a deployment request.

## Decisions

- Apply the existing-account prompt to learners and instructors, including the production instructor. Admins are exempt, as requested on 2026-11-16; no one is automatically marked as agreeing.
- One unified policy, one checkbox. No marketing/email subscription consent is bundled with it.
- Store only user ID, policy version, server timestamp and acceptance source. Do not collect IP addresses or user-agent data for this feature.
- Policy content edits that require renewed agreement must receive a new version in both application and database constants; keep old acceptance records.
- Browsing the public policy and signing out remain possible without accepting. Existing profiles, roles, courses and purchases are not edited.

## Implemented

- `lib/policy-version.ts`: current version **2026-11-13.1**, policy-dialog URL and gate exemptions. The version refers to the wave 6 PDF transcription; its full source hash is recorded in the file and footer-policy documentation.
- `lib/auth/schemas.ts`, registration API and both forms in `AuthForm.tsx`: an affirmative boolean and exact current version are mandatory. Missing/false/string-valued acceptance and outdated versions are rejected with 422 before signup. The checkbox starts unchecked, the creation button stays disabled until checked, and the linked policy opens in another tab without losing form values.
- `PolicyAgreement`: shared accessible checkbox/label/link with RTL-aware layout, reused by registration and existing-account dialog.
- Migration `202611130001_policy_acceptance.sql`: new `policy_acceptances` table, `(user_id, policy_version)` primary key, server `accepted_at`, and `source` (`registration` or `existing_account`). Signup acceptance is recorded atomically by an Auth insert trigger. No existing identity, profile, course, order or enrollment is rewritten.
- Existing users use `/auth/policy` and `POST /api/auth/policy`. The native modal keeps keyboard focus inside, prevents Escape dismissal, provides explicit acceptance and sign-out, preserves the safe destination and keeps errors retryable. Success is reported only after the database RPC saves the agreement.
- RLS exposes only the current user's history. Browser roles cannot directly insert, update or delete records. The acceptance RPC derives identity from `auth.uid()` and accepts no user ID, source or client timestamp. Repeated requests are idempotent and retain the original timestamp. Editing user metadata later cannot create an acceptance record.
- `lib/supabase/proxy.ts`: authenticated learner/instructor website requests without current acceptance redirect to the dialog; account/API requests receive 403. Database-check errors block APIs with 503. Refreshed session cookies are preserved in redirects and rejections. Anonymous public browsing is unaffected. Admins bypass the policy gate using their role from `profiles`, not editable Auth metadata or the URL. Direct visits to `/auth/policy` also redirect admins onward without showing the dialog. This exemption does not grant any other authorization or insert an acceptance record.
- `/policies`, auth/recovery/sign-out/acceptance paths, provider callbacks/webhooks, scheduled jobs and telemetry remain available. Normal role and resource authorization still runs separately; policy acceptance does not grant any role or content entitlement.
- Regenerated database types from the local database.

## Boundaries

Application signup requires acceptance. Creating an identity directly through Supabase or an administrative tool without affirmative current-version metadata does not grant application access: the user must accept in the dialog. Do not change profile roles or mark legacy accounts as accepted to bypass this flow. The gate applies to application HTTP routes; existing database authoring/access policies were not rewritten to introduce a second entitlement system.

The modal is a dedicated auth route rather than an overlay on a live editor, so protected account content/actions do not render underneath it. A browser refresh, direct account link or another device cannot dismiss the requirement. Existing signed-in users are gated on their next application request after rollout, not only after a fresh sign-in. Policy text and sign-out stay accessible; no course is deleted or unpublished.

Acceptance is an explicit recorded action, not evidence that a person read every sentence. No extra scroll-to-bottom requirement or marketing consent is imposed. The page provides a no-JavaScript message; saving through the web dialog requires JavaScript, like the existing account forms.

## Verification

- **439 backend tests across 78 files passed**, including registration API validation and server-gate tests for instructor, checkout, learning and admin paths; provider exemptions, failure handling, cookie preservation and anonymous browsing.
- **459 SQL checks across 30 files passed** on a clean, disposable database, including 23 acceptance-specific checks for signup capture, authenticated RPC, outdated versions, metadata tampering, ownership/RLS, immutable timestamps and retries.
- The first full SQL run against the existing development database found seed-count and modified-settings mismatches. Preserved that database and its content. Created a separate local schema-only verification database, loaded synthetic seeds plus migration-created settings/PDF-bucket defaults, reran the suite successfully, then removed only the disposable database. The new migration remains applied locally. No staging or production database was modified.
- **41 browser checks passed**, including unchecked registration, version payload, 320px/390px/1440px consent dialogs, native modal focus containment, Escape behavior, policy links, save failure/retry, preserved instructor destination and sign-out without agreement.
- TypeScript, repository-wide lint, public-schema SQL lint, patch-format checks and the production build passed. The build includes `/auth/policy` and `/api/auth/policy`.
- Visually reviewed the phone/dark and desktop/light dialog screenshots.
- Client bundle scan passed across 69 files with no server-only variables or configured secrets detected.

## Deployment order

1. Assemble the release from the current production code, preserving deployed fixes and migrations. Include this feature and the actual `/policies` page in the same release.
2. Apply the additive migration to staging first. Do not run seeds or reset hosted databases. Confirm application and database version constants match.
3. Deploy the code, then run the acceptance tests below with new and existing staging accounts. Existing users should have no fabricated/backfilled acceptance.
4. After approval, apply the additive production migration and deploy the same reviewed code. The existing instructor then sees the dialog and can return to their course after accepting.
5. For a future material policy revision, retain the previous policy text/version in source control and old database records; publish the revised text with a new application constant and version-function migration together. Do not delete old records to force a prompt.

The migration does not itself enable the UI in old application versions. Conversely, deploying the new code without the migration causes policy checks to fail closed. Apply the migration first, and keep the policy page available during rollout. Do not expose an acceptance checkbox linked to an unrelated policy version.

## Personal acceptance checklist

### Admin exemption — 2026-11-16

Admins are exempt from the application policy requirement, including page redirects, API rejections and directly opening the dialog route. The exemption is determined from the authenticated account's database profile. A failed role lookup or user-supplied `role: admin` metadata cannot grant it. Public registration still creates learners and requires agreement; there is no admin self-registration path.

Regression coverage includes admins on admin/API/public/studio URLs, preserved refresh cookies, forged metadata, failed role lookup, direct consent-page access, and continued learner/instructor prompting. All **448 backend tests across 79 files**, TypeScript and repository-wide lint passed after this change. No database migration or acceptance-history rewrite is needed for the exemption. It remains local and is not deployed.

During manual review, sign in as an admin without a policy acceptance record and confirm normal access. Open `/auth/policy?next=/admin` directly: it should return to `/admin`. Repeat as an unaccepted instructor/learner: the agreement dialog must still appear.

1. On registration, confirm the checkbox is empty and creation is disabled. Open the policy link and return: form values must remain.
2. Check the box, register and verify email. The new account should continue normally without being asked for the same policy again.
3. Sign in with an existing instructor account. Confirm the dialog appears and the policy link opens. Escape and refresh must not bypass it.
4. Agree and continue. Confirm the instructor returns to the intended course/dashboard with all prior course content intact.
5. Sign out and back in, then try another device: the same version should not prompt again.
6. With another existing account, choose sign-out without checking the box. Confirm it signs out and does not create an acceptance record.
7. Simulate a failed acceptance save on staging. Confirm the error allows retry and does not grant account access before success.
8. Verify normal account recovery and payment webhook delivery remain functional.

Implemented locally. **Not deployed.** Production users will not see this until the migration and reviewed release are deployed.
