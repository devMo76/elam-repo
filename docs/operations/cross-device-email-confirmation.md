# Cross-device signup confirmation

Date: 2026-10-28. Status: implemented locally; deployment and hosted acceptance pending.

## Cause and scope

The old callback only accepted a PKCE code. Exchanging that code requires the
verifier cookie from the original registration browser. An email opened in a
phone or separate embedded browser may verify the address at Supabase but fail
the application session exchange, showing the generic confirmation warning.

The callback now additionally accepts token_hash with type=email and verifies it
server-side using auth.verifyOtp. No original PKCE cookie is required. Supabase
continues to enforce authenticity, expiry and single use. The server client writes
session cookies for the browser opening the link. This does not sign in the
original computer remotely: it can sign in with email/password after confirmation.
No database migration, admin key or disabled email-confirmation setting is needed.

Legacy code-based callbacks remain supported, including existing password-reset
links. The new token branch only accepts type=email; it cannot be used to turn
recovery/invite/email-change tokens into signup confirmation. Invalid tokens do
not fall back to a supplied code or produce a success message. Safe same-origin
next destinations and configured public origin remain enforced. Redirects are
no-store and no-referrer; token hashes/codes are not copied into the destination
URL or logged by the handler. Treat complete links as credentials; avoid query
logging in any external proxy/analytics/error tracker.

## Required Supabase configuration after code deployment

Deploy the callback first to staging, then change staging's Confirm signup
template. Repeat for production only after staging acceptance. Changing the
template before deployment will break new links on the old callback.

Supabase project > Authentication > Email Templates > Confirm signup:
replace the confirmation button's href with:

```html
<a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">تأكيد البريد الإلكتروني</a>
```

This is an HTML href value, not a template name. Preserve your surrounding email
design and subject. Both app registration and resend endpoints already supply
RedirectTo as the canonical /auth/callback?next=... URL; the ampersand appends to
that existing query and preserves course intent. Do not use this exact appended
form for manually generated emails without that redirect query. A standalone
fallback for a manually configured signup flow is:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&amp;type=email&amp;next=/account">تأكيد البريد الإلكتروني</a>
```

Use the app-aware first form for website registration/resend so course intent is
not lost. Do not change Reset password, Invite, Magic link or Change email templates
as part of this signup-only change. Keep email confirmation enabled and disable
link tracking for authentication mail.

- Staging project: dnizkyfkltyfibgrftwf; Site URL https://test.elamedu.com.
- Production project: hqwvizdrcoytidvsdrur; Site URL https://elamedu.com.
- Keep the corresponding /auth/callback redirect allowlists configured.
- Save the previous template privately for rollback; no secrets belong in it.
- Request a fresh email after the change. Already-delivered emails keep their
  old PKCE links and cannot acquire cross-device support retroactively.

## Acceptance and rollback

1. Register on desktop with an unused inbox, open the newest confirmation on a
   phone with no Elam cookies. Expect verified account and signed-in phone browser,
   no activation-failed warning, correct public domain, working refresh/session.
2. Sign in on the original desktop. Expect success without opening the email again.
3. Repeat in the same browser, private browser and email embedded browser. Cookie
   storage restrictions may prevent persistence in a restrictive embedded browser;
   opening a normal browser and signing in must work after verified email.
4. Register from a course link; confirm the safe course destination is preserved.
5. Use resend for another pending account and test the newest link across devices.
6. Reuse a consumed link or an expired link. Expect a safe error, never a fabricated
   success or unintended account session. Confirm normal sign-in still works for
   the already-verified account.
7. Test an external next destination and unsupported token types. Expect rejection
   or internal fallback, no token disclosure, no open redirect.
8. Regression: existing PKCE signup/password-reset links still follow their
   intended flow. Do not modify production roles/payments/content for this test.

If rolling back the code, restore Confirm signup to its previous
{{ .ConfirmationURL }} link first, then roll back the callback. Outstanding new
token links require the new handler; keep compatibility during a rollback if
possible, or resend after restoring. Never bypass OTP verification to fix a banner.

Single-use GET token links remain susceptible to email-security prefetching.
This change fixes cross-device PKCE dependency, not scanner consumption. If
observed, use the documented explicit-confirmation-page or entered-OTP flow as
a follow-up. Do not claim scanner protection from token_hash alone.

## Verification record

Focused auth/redirect tests: 29 passed; full backend suite: 348 tests/69 files
passed. Typecheck, lint, production build and 66-file client secret scan passed.
The server-only verification approach and early token guards follow the selected
Next.js best-practices skill; no extra client JavaScript or provider calls are
added for malformed token requests. Docker is not running,
so actual local Supabase/browser verification has not been performed.
Hosted provider/email and cross-device acceptance remains pending, not passed.

References: [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates),
[verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp),
[PKCE limitations](https://supabase.com/docs/guides/auth/sessions/pkce-flow).
