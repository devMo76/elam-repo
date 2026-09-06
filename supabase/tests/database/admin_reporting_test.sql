begin;

select plan(9);

select is(
  has_function_privilege(
    'authenticated',
    'public.admin_dashboard_summary()',
    'execute'
  ),
  true,
  'authenticated sessions can request the admin dashboard summary'
);
select is(
  has_function_privilege(
    'anon',
    'public.admin_dashboard_summary()',
    'execute'
  ),
  false,
  'anonymous sessions cannot request the admin dashboard summary'
);

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select throws_ok(
  $$select * from public.admin_dashboard_summary()$$,
  '42501',
  'Administrator role required',
  'learners cannot read platform reporting'
);

select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000001',
  true
);
select throws_ok(
  $$select * from public.admin_dashboard_summary()$$,
  '42501',
  'Administrator role required',
  'instructors cannot read platform reporting'
);

select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-4000-8000-000000000001',
  true
);
select is(
  (select total_revenue_halalas from public.admin_dashboard_summary()),
  35000::bigint,
  'revenue includes paid orders only'
);
select is(
  (select enrollment_count from public.admin_dashboard_summary()),
  1::bigint,
  'the summary returns the total enrollment count'
);
select is(
  (select active_course_count from public.admin_dashboard_summary()),
  1::bigint,
  'the summary counts published courses as active'
);

reset role;

select ok(
  to_regclass('public.orders_paid_at_idx') is not null,
  'paid-order reporting has a partial date index'
);
select ok(
  to_regclass('public.admin_audit_log_created_at_idx') is not null,
  'audit history has a stable chronological index'
);

select * from finish();
rollback;
