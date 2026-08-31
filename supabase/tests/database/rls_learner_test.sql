begin;

select plan(17);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select ok(
  exists (
    select 1 from public.profiles
    where id = '10000000-0000-4000-8000-000000000001'
  ),
  'learners can read their own profile'
);
select ok(
  not exists (
    select 1 from public.profiles
    where id = '10000000-0000-4000-8000-000000000002'
  ),
  'learners cannot read another learner profile'
);
select ok(
  exists (
    select 1 from public.profiles
    where id = '20000000-0000-4000-8000-000000000001'
  ),
  'learners can read instructor public profiles'
);
select is(
  (select count(*) from public.platform_settings),
  1::bigint,
  'authenticated learners can read platform settings'
);
select ok(
  exists (
    select 1 from public.courses
    where id = '40000000-0000-4000-8000-000000000001'
  ) and not exists (
    select 1 from public.courses
    where id = '40000000-0000-4000-8000-000000000002'
  ),
  'learners see published courses but not drafts'
);
select ok(
  exists (
    select 1 from public.modules
    where id = '50000000-0000-4000-8000-000000000001'
  ) and not exists (
    select 1 from public.modules
    where id = '50000000-0000-4000-8000-000000000003'
  ),
  'learners see only published-course modules'
);
select ok(
  exists (
    select 1 from public.lessons
    where id = '60000000-0000-4000-8000-000000000001'
  ) and not exists (
    select 1 from public.lessons
    where id = '60000000-0000-4000-8000-000000000004'
  ),
  'learners see only published-course lessons'
);
select ok(
  exists (
    select 1 from public.orders
    where id = '70000000-0000-4000-8000-000000000001'
  ) and not exists (
    select 1 from public.orders
    where id = '70000000-0000-4000-8000-000000000002'
  ),
  'learners see only their own orders'
);
select is(
  (select count(*) from public.enrollments),
  1::bigint,
  'learners see only their own enrolments'
);
select is(
  (select count(*) from public.lesson_progress),
  2::bigint,
  'learners see only their own progress'
);
select is(
  (select count(*) from public.admin_audit_log),
  0::bigint,
  'learners cannot read audit records'
);

with changed as (
  update public.profiles
  set headline = 'Not permitted'
  where id = '10000000-0000-4000-8000-000000000001'
  returning 1
)
select is(
  (select count(*) from changed),
  0::bigint,
  'learners cannot edit profile fields'
);

select throws_ok(
  $test$
    update public.profiles
    set role = 'admin'
    where id = '10000000-0000-4000-8000-000000000001'
  $test$,
  '42501',
  'permission denied for table profiles',
  'learners cannot self-promote'
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
  'learners cannot create orders from a browser client'
);
select throws_ok(
  $test$
    insert into public.enrollments (user_id, course_id)
    values (
      '10000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000002'
    )
  $test$,
  '42501',
  'permission denied for table enrollments',
  'learners cannot grant themselves enrolments'
);
select throws_ok(
  $test$
    select public.admin_change_user_role(
      '10000000-0000-4000-8000-000000000002',
      'instructor'
    )
  $test$,
  '42501',
  'Administrator role required',
  'learners cannot invoke the audited administrator role operation'
);

with changed as (
  update public.platform_settings
  set instructor_direct_publish = true
  where id = 1
  returning 1
)
select is(
  (select count(*) from changed),
  0::bigint,
  'learners cannot change platform settings'
);

reset role;
select * from finish();
rollback;
