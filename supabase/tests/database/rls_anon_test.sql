begin;

select plan(11);

set local role anon;

select ok(
  exists (
    select 1 from public.profiles
    where id = '20000000-0000-4000-8000-000000000001'
  ),
  'anonymous users can read instructor public profiles'
);
select ok(
  not exists (
    select 1 from public.profiles
    where id = '10000000-0000-4000-8000-000000000001'
  ),
  'anonymous users cannot read learner profiles'
);
select throws_ok(
  $test$select * from public.platform_settings$test$,
  '42501',
  'permission denied for table platform_settings',
  'anonymous users cannot read platform settings'
);
select ok(
  exists (
    select 1 from public.courses
    where id = '40000000-0000-4000-8000-000000000001'
  ) and not exists (
    select 1 from public.courses
    where id = '40000000-0000-4000-8000-000000000002'
  ),
  'anonymous users see published courses but not drafts'
);
select ok(
  exists (
    select 1 from public.modules
    where id = '50000000-0000-4000-8000-000000000001'
  ) and not exists (
    select 1 from public.modules
    where id = '50000000-0000-4000-8000-000000000003'
  ),
  'anonymous users see only published-course modules'
);
select ok(
  exists (
    select 1 from public.lessons
    where id = '60000000-0000-4000-8000-000000000001'
  ) and not exists (
    select 1 from public.lessons
    where id = '60000000-0000-4000-8000-000000000004'
  ),
  'anonymous users see only published-course lessons'
);
select throws_ok(
  $test$select * from public.orders$test$,
  '42501',
  'permission denied for table orders',
  'anonymous users cannot read orders'
);
select throws_ok(
  $test$select * from public.enrollments$test$,
  '42501',
  'permission denied for table enrollments',
  'anonymous users cannot read enrolments'
);
select throws_ok(
  $test$select * from public.lesson_progress$test$,
  '42501',
  'permission denied for table lesson_progress',
  'anonymous users cannot read progress'
);
select throws_ok(
  $test$select * from public.admin_audit_log$test$,
  '42501',
  'permission denied for table admin_audit_log',
  'anonymous users cannot read audit records'
);
select throws_ok(
  $test$
    insert into public.orders (user_id, course_id, amount_halalas)
    values (
      '10000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',
      1
    )
  $test$,
  '42501',
  'permission denied for table orders',
  'anonymous users cannot create orders'
);

reset role;
select * from finish();
rollback;
