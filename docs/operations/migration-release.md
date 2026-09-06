# Safe database migration release

## Before applying a migration

1. Check that Git is clean and the reviewed commit is checked out.
2. Run type-checking, linting, application tests, database tests, and the build.
3. Run `npm exec supabase -- migration list --linked` and confirm the target.
4. Create and verify a recent backup.
5. Preview changes with `npm exec supabase -- db push --linked --dry-run`.
6. Read every listed migration before approving it.

## Apply

Run `npm exec supabase -- db push --linked`. Apply to staging first. Production
must receive the same reviewed migrations from the same application commit.

## Failure rule

Do not rewrite or delete a migration that has already been applied. Create a new
forward-fix migration. For destructive or irreversible failures, stop writes,
follow the incident runbook, and restore only after confirming the exact target.

After applying, compare local and remote migration history and run smoke tests.
