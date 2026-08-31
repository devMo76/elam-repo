begin;

select plan(14);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '20000000-0000-4000-8000-000000000002',
  'second.instructor@example.invalid',
  '{"full_name":"Second Instructor"}'::jsonb
);
update public.profiles
set role = 'instructor'
where id = '20000000-0000-4000-8000-000000000002';
insert into public.courses (id, slug, title, price_halalas, instructor_id)
values (
  '40000000-0000-4000-8000-000000000005',
  'second-instructor-private-course',
  'Second Instructor Private Course',
  10000,
  '20000000-0000-4000-8000-000000000002'
);
insert into public.modules (id, course_id, title, position)
values (
  '50000000-0000-4000-8000-000000000005',
  '40000000-0000-4000-8000-000000000005',
  'Private Module',
  1
);
insert into public.lessons (id, module_id, title, position)
values (
  '60000000-0000-4000-8000-000000000006',
  '50000000-0000-4000-8000-000000000005',
  'Private Lesson',
  1
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);

select ok(
  exists (
    select 1 from public.profiles
    where id = '20000000-0000-4000-8000-000000000002'
  ) and not exists (
    select 1 from public.profiles
    where id = '10000000-0000-4000-8000-000000000001'
  ),
  'instructors see instructor profiles but not learner identities'
);
select is((select count(*) from public.platform_settings), 1::bigint, 'instructors can read settings');
select ok(
  exists (
    select 1 from public.courses
    where id = '40000000-0000-4000-8000-000000000002'
  ),
  'instructors can read their private courses'
);
select ok(
  not exists (
    select 1 from public.courses
    where id = '40000000-0000-4000-8000-000000000005'
  ),
  'instructors cannot read another instructor private course'
);
select ok(
  not exists (
    select 1 from public.modules
    where id = '50000000-0000-4000-8000-000000000005'
  ),
  'instructors cannot read another instructor private modules'
);
select ok(
  not exists (
    select 1 from public.lessons
    where id = '60000000-0000-4000-8000-000000000006'
  ),
  'instructors cannot read another instructor private lessons'
);

with changed as (
  update public.courses
  set subtitle = 'Owned update'
  where id = '40000000-0000-4000-8000-000000000002'
  returning 1
)
select is((select count(*) from changed), 1::bigint, 'instructors can update an owned course');

with changed as (
  update public.courses
  set subtitle = 'Forbidden update'
  where id = '40000000-0000-4000-8000-000000000005'
  returning 1
)
select is((select count(*) from changed), 0::bigint, 'instructors cannot update another instructor course');

with changed as (
  update public.profiles
  set headline = 'Updated instructor headline'
  where id = '20000000-0000-4000-8000-000000000001'
  returning 1
)
select is((select count(*) from changed), 1::bigint, 'instructors can maintain approved public profile fields');

select is((select count(*) from public.orders), 0::bigint, 'instructors cannot read learner orders or revenue');
select is((select count(*) from public.enrollments), 0::bigint, 'instructors cannot read learner enrolment identities');
select is((select count(*) from public.lesson_progress), 0::bigint, 'instructors cannot read learner progress');
select is((select count(*) from public.admin_audit_log), 0::bigint, 'instructors cannot read audit records');

with changed as (
  update public.platform_settings
  set instructor_direct_publish = true
  where id = 1
  returning 1
)
select is((select count(*) from changed), 0::bigint, 'instructors cannot enable direct publishing');

reset role;
select * from finish();
rollback;
