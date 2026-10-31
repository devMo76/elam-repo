# Cross-device password reset

Date: 2026-10-31. Scope: staged authentication follow-up; production unpromoted.

Owner reports a successful sandbox course purchase and a password-reset link
showing the activation-failed banner when opened on another device. Read-only
staging reconciliation confirms one paid order, one linked enrolment and one
receipt marked sent. Inbox delivery/provider webhook matrix is not inferred.

## Cause

The earlier token_hash callback deliberately supported only signup type=email.
Password-reset requests still supplied a PKCE recovery callback requiring the
original browser's verifier. All errors used the signup activation banner.
Password recovery is a separate Supabase email template and OTP type, so changing
Confirm signup alone cannot fix reset emails.

## Changes

- Allow only email and recovery token types at the server callback. Other types
  remain rejected; token failure never falls back to a supplied PKCE code.
- Verified recovery always redirects to /auth/reset-password, ignoring next.
  Signup verification retains its safe same-origin next destination.
- No signup-success query/banner on recovery. Failed recovery routes to
  /auth/password-reset?auth_error=recovery_failed and a reset-specific Arabic
  error with the existing email-request form. Error text is fixed, not reflected
  from query parameters. Existing validation and auth API protections remain.
- Preserve existing PKCE recovery links and public-origin/no-store/no-referrer
  behavior. Existing clients can still change their own password through the
  authenticated PATCH endpoint; no service-role bypass or confirmation disabling.
- React/Next best-practices skill used to keep token verification on the server
  and reuse the existing form, without additional browser token processing.

## Required template after code is deployed

In STAGING Supabase dnizkyfkltyfibgrftwf > Authentication > Email Templates >
Reset password, preserve the subject/design but replace the old ConfirmationURL
anchor with this button:

```html
<h2>إعادة تعيين كلمة المرور لمنصة إلام</h2>
<p>انقر على الرابط التالي لتعيين كلمة مرور جديدة.</p>
<p>
  <a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=recovery">
    إعادة تعيين كلمة المرور
  </a>
</p>
```

The app supplies RedirectTo as /auth/callback?next=%2Fauth%2Freset-password, so
the extra parameters are appended with ampersands. This is template HTML, not
a template name or a real token URL. Request a fresh reset email afterward.
Old delivered links retain PKCE behavior. Do not modify Confirm signup again,
nor production's Reset password template before production code promotion.
Keep SMTP link tracking disabled. Single-use GET links can still be consumed by
email scanners; token_hash alone does not provide scanner resistance.

## Verification and acceptance

- Focused route/header tests: 30 passed before complete release verification.
- Cover cookie-free recovery, forced reset destination despite malicious next,
  expired/replayed failure without PKCE fallback, legacy recovery-code success
  and failure, reset request's public callback URL, plus signup regression.
- Full local/CI/build results and staging release IDs recorded after execution.
- Hosted test should create only a marked disposable staging identity, generate
  a recovery token without email delivery, open it in an empty browser context,
  set a new password, verify new/old password behavior, replay failure, and
  remove only that QA identity/profile. Never reset an owner's password.
- Owner acceptance: request reset on desktop; open the newest email on phone;
  see the password form, submit new matching password, sign in on desktop with
  new password, confirm old password fails. Reused/expired link must show reset
  instructions rather than activation failure. Do not paste real tokens/links.

## Rollout and rollback

Deploy code to staging before changing Reset password template. Require hosted
and owner email/device acceptance before deliberate production promotion.
If code is rolled back to email-only tokens, restore Reset password template's
previous ConfirmationURL anchor first; fresh emails are then needed for old code.
Preserve legacy callback support and never bypass failed recovery verification.

References: [Supabase verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp),
[email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
