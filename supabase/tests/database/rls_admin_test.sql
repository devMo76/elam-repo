begin;

select plan(20);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '90000000-0000-4000-8000-000000000003',
  'first.admin.test@example.invalid',
  '{"full_name":"First Admin Test"}'::jsonb
);

select lives_ok(
  $test$
    update public.profiles
    set role = 'admin'
    where id = '90000000-0000-4000-8000-000000000003'
  $test$,
  'the first administrator can be promoted from a direct database session'
);
select is(
  (
    select role from public.profiles
    where id = '90000000-0000-4000-8000-000000000003'
  ),
  'admin'::public.user_role,
  'the manual first-admin promotion changes exactly the intended profile'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);

select ok((select count(*) from public.profiles) >= 4, 'administrators can read all profiles');
select is((select count(*) from public.platform_settings), 1::bigint, 'administrators can read settings');
select is((select count(*) from public.courses), 4::bigint, 'administrators can read every course state');
select is((select count(*) from public.modules), 4::bigint, 'administrators can read all modules');
select is((select count(*) from public.lessons), 5::bigint, 'administrators can read all lessons');
select is((select count(*) from public.orders), 3::bigint, 'administrators can read all orders');
select is((select count(*) from public.enrollments), 1::bigint, 'administrators can read all enrolments');
select is((select count(*) from public.lesson_progress), 0::bigint, 'administrators do not bypass own-row progress policy');
select is((select count(*) from public.admin_audit_log), 0::bigint, 'the audit log starts empty');

select lives_ok(
  $test$
    update public.platform_settings
    set instructor_direct_publish = true
    where id = 1
  $test$,
  'administrators can change platform settings'
);
select is(
  (select instructor_direct_publish from public.platform_settings where id = 1),
  true,
  'the direct-publishing change takes effect immediately'
);
select is(
  (select updated_by from public.platform_settings where id = 1),
  '30000000-0000-4000-8000-000000000001'::uuid,
  'the settings trigger records the administrator actor'
);
select is(
  (select count(*) from public.admin_audit_log where action = 'settings.update'),
  1::bigint,
  'a settings change creates one audit record'
);

select lives_ok(
  $test$
    select public.admin_change_user_role(
      '10000000-0000-4000-8000-000000000002',
      'instructor'
    )
  $test$,
  'administrators can promote another user through the audited operation'
);
select is(
  (
    select role from public.profiles
    where id = '10000000-0000-4000-8000-000000000002'
  ),
  'instructor'::public.user_role,
  'the audited operation changes the target role'
);
select is(
  (select count(*) from public.admin_audit_log where action = 'role.change'),
  1::bigint,
  'a role change creates one audit record'
);
select throws_ok(
  $test$
    select public.admin_change_user_role(
      '30000000-0000-4000-8000-000000000001',
      'learner'
    )
  $test$,
  '22023',
  'Administrators cannot change their own role',
  'administrators cannot accidentally demote themselves'
);
select throws_ok(
  $test$
    insert into public.enrollments (user_id, course_id)
    values (
      '10000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-000000000002'
    )
  $test$,
  '42501',
  'permission denied for table enrollments',
  'administrator browser sessions cannot grant enrolments'
);

reset role;
select * from finish();
rollback;
