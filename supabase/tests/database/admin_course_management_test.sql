begin;
select plan(9);

-- Keep one reviewed fixture publishable while preserving another incomplete
-- course for the publication-readiness guard.
update public.lessons
set media_status = 'ready', video_asset_id = 'admin-review-ready-fixture'
where id = '60000000-0000-4000-8000-000000000005';

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.admin_change_course_status('40000000-0000-4000-8000-000000000003', 'published')$$,
  '42501', 'Administrator role required', 'instructors cannot perform admin publication'
);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.admin_change_course_status('40000000-0000-4000-8000-000000000002', 'published')$$,
  '23514', 'Course is not ready for publication', 'an admin cannot publish an incomplete course'
);
select lives_ok(
  $$select public.admin_change_course_status('40000000-0000-4000-8000-000000000003', 'published')$$,
  'an admin can publish a reviewed course'
);
select is((select status from public.courses where id = '40000000-0000-4000-8000-000000000003'), 'published'::public.course_status, 'course is published');
select ok((select published_at is not null from public.courses where id = '40000000-0000-4000-8000-000000000003'), 'publication time is recorded');
select is((select count(*) from public.admin_audit_log where action = 'course.status.change' and subject = '40000000-0000-4000-8000-000000000003'), 2::bigint, 'status change adds exactly one audit entry');
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
