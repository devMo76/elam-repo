# First administrator promotion

The first administrator is created manually because no administrator exists to
authorize the normal audited role-change operation. There is deliberately no
public bootstrap endpoint.

## Procedure

1. Ask the intended administrator to register and verify their email normally.
2. Open the Supabase SQL Editor for the correct environment.
3. Replace the example email below and run the statement once:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where lower(email) = lower('administrator@example.com')
)
and role = 'learner'
returning id, full_name, role;
```

4. Confirm that exactly one row is returned and that its role is `admin`.
5. Sign out and sign in again before using administrator operations.

If no row is returned, stop and verify the email and current role. Do not insert
a profile manually and do not expose this statement through an application
route. Every later promotion or demotion must use the audited administrator API.
