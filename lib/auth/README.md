# Authentication backend contract

The frontend calls these same-origin JSON endpoints. It must not call Supabase
Auth directly for the covered email/password flows because the backend owns
validation, redirect construction, and consistent error responses.

| Method | Endpoint | Request fields | Success |
|---|---|---|---|
| `POST` | `/api/auth/register` | `email`, `password`, `fullName` | `202`; verification email requested |
| `POST` | `/api/auth/sign-in` | `email`, `password` | `200`; session cookie set |
| `POST` | `/api/auth/sign-out` | none | `204`; local session ended |
| `POST` | `/api/auth/password-reset` | `email` | `202`; generic anti-enumeration response |
| `PATCH` | `/api/auth/password` | `password` | `200`; requires a verified session or recovery session |

Errors use the shared contract:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "One or more request fields are invalid.",
    "fieldErrors": {
      "email": ["Invalid email address"]
    }
  }
}
```

## Frontend routes expected

- `/auth/reset-password`: form that submits the new password to
  `PATCH /api/auth/password`.
- A landing-page message for `?auth=verified`.
- A safe error message for `?auth_error=confirmation_failed`.

The PKCE callback is implemented at `/auth/callback`. The frontend must not
handle or store access tokens directly.
