# Production release checklist

- [ ] Reviewed commit is clean and identical in staging and production.
- [ ] Type-check, lint, application tests, database tests, and build pass.
- [ ] Client bundle secret scan passes.
- [ ] Dependency audit has no high-severity finding.
- [ ] Migration dry run lists only reviewed migrations.
- [ ] Recent encrypted backup exists and a recovery restore was proven.
- [ ] Production uses production Supabase, Moyasar, Bunny, Resend, and Vercel values.
- [ ] No production secret is shared with local or staging.
- [ ] Security headers and rate protection are active.
- [ ] Logs contain request IDs and redact sensitive fields.
- [ ] Webhook failure monitoring is accessible to administrators.
- [ ] Authentication, catalogue, playback, progress, checkout, receipt, instructor,
      and administrator smoke tests pass.
- [ ] Rollback owner and incident contact are available during release.
