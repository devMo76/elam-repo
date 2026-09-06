# Database backup and restore

## Purpose

A backup is useful only after it has been restored successfully. Never test a
restore against staging or production. Use a new, empty recovery project.

## Create a backup

1. Confirm the CLI is linked to the intended Supabase project:
   `npm exec supabase -- migration list --linked`.
2. Create a dated folder outside the Git repository.
3. Export the database structure:
   `npm exec supabase -- db dump --linked --file <backup-folder>/schema.sql`.
4. Export the data:
   `npm exec supabase -- db dump --linked --data-only --use-copy --file <backup-folder>/data.sql`.
5. Export database roles:
   `npm exec supabase -- db dump --linked --role-only --file <backup-folder>/roles.sql`.
6. Store the files in encrypted storage. Do not commit them.

Record the project name, UTC time, application commit, migration list, operator,
and file checksums beside the encrypted backup.

## Prove that restoration works

1. Create an empty temporary Supabase recovery project.
2. Copy its direct database connection string from its dashboard.
3. Confirm the hostname and project reference are not staging or production.
4. Restore roles, schema, then data with `psql`:
   `psql "<recovery-database-url>" -v ON_ERROR_STOP=1 -f roles.sql`
   `psql "<recovery-database-url>" -v ON_ERROR_STOP=1 -f schema.sql`
   `psql "<recovery-database-url>" -v ON_ERROR_STOP=1 -f data.sql`
5. Run row counts and important payment, enrollment, course, and webhook checks.
6. Run the application smoke tests against the recovery project.
7. Record the duration and result, then delete the temporary recovery project.

Stop immediately if the target identity is unclear. Never use `db reset` on a
linked hosted project.
