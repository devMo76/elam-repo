begin;

select plan(13);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select * from public.admin_purchase_history()$$,
  '42501', 'Administrator role required',
  'learners cannot read purchase history'
);
select throws_ok(
  $$select * from public.admin_revenue_by_course()$$,
  '42501', 'Administrator role required',
  'learners cannot read revenue reports'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select * from public.admin_purchase_history()$$,
  '42501', 'Administrator role required',
  'instructors cannot read purchase history'
);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.admin_purchase_history()), 3::bigint, 'admins see all seeded orders');
select is((select count(*) from public.admin_purchase_history(filter_status => 'paid')), 1::bigint, 'status filtering works');
select is((select count(*) from public.admin_purchase_history(search_query => 'Learner One')), 1::bigint, 'learner-name search works');
select is((select count(*) from public.admin_purchase_history(search_query => 'Signals')), 2::bigint, 'course-title search works');
select is((select count(*) from public.admin_purchase_history(page_size => 1)), 1::bigint, 'page size limits returned rows');
select is((select total_count from public.admin_purchase_history(page_size => 1)), 3::bigint, 'pagination returns the full matching count');
select throws_ok(
  $$select * from public.admin_purchase_history(page_size => 101)$$,
  '22023', 'Invalid pagination', 'oversized pages are rejected'
);
select throws_ok(
  $$select * from public.admin_purchase_history(created_from => '2026-02-01', created_before => '2026-01-01')$$,
  '22023', 'Invalid date range', 'invalid purchase date ranges are rejected'
);
select is((select revenue_halalas from public.admin_revenue_by_course()), 35000::bigint, 'revenue includes paid orders only');
select is((select paid_order_count from public.admin_revenue_by_course()), 1::bigint, 'paid order count excludes unsuccessful orders');

reset role;
select * from finish();
rollback;
