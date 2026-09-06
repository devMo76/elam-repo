begin;
select plan(8);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.admin_change_course_status('40000000-0000-4000-8000-000000000003', 'published')$$,
  '42501', 'Administrator role required', 'instructors cannot perform admin publication'
);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.admin_change_course_status('40000000-0000-4000-8000-000000000003', 'published')$$,
  'an admin can publish a reviewed course'
);
select is((select status from public.courses where id = '40000000-0000-4000-8000-000000000003'), 'published'::public.course_status, 'course is published');
select ok((select published_at is not null from public.courses where id = '40000000-0000-4000-8000-000000000003'), 'publication time is recorded');
select is((select count(*) from public.admin_audit_log where action = 'course.status.change' and subject = '40000000-0000-4000-8000-000000000003'), 1::bigint, 'status change is audited once');
select lives_ok(
  $$select public.admin_change_course_status('40000000-0000-4000-8000-000000000001', 'archived')$$,
  'an admin can archive a published course'
);
select is((select count(*) from public.enrollments where course_id = '40000000-0000-4000-8000-000000000001'), 1::bigint, 'archiving preserves enrollment access');
select throws_ok(
  $$select public.admin_change_course_status('40000000-0000-4000-8000-000000000004', 'published')$$,
  '22023', 'Course status transition not permitted', 'archived courses cannot be restored'
);

reset role;
select * from finish();
rollback;
