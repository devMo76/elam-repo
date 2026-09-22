begin;

select plan(10);

insert into public.courses (
  id,
  slug,
  title,
  price_halalas,
  instructor_id
)
values
  (
    '49000000-0000-4000-8000-000000000001',
    'empty-readiness-course',
    'Empty readiness course',
    0,
    '20000000-0000-4000-8000-000000000001'
  ),
  (
    '49000000-0000-4000-8000-000000000002',
    'processing-readiness-course',
    'Processing readiness course',
    0,
    '20000000-0000-4000-8000-000000000001'
  ),
  (
    '49000000-0000-4000-8000-000000000003',
    'ready-minimum-course',
    'Ready minimum course',
    0,
    '20000000-0000-4000-8000-000000000001'
  ),
  (
    '49000000-0000-4000-8000-000000000004',
    'other-instructor-readiness-course',
    'Other instructor readiness course',
    0,
    '20000000-0000-4000-8000-000000000002'
  );

insert into public.modules (id, course_id, title, position)
values
  (
    '59000000-0000-4000-8000-000000000002',
    '49000000-0000-4000-8000-000000000002',
    'Processing module',
    1
  ),
  (
    '59000000-0000-4000-8000-000000000003',
    '49000000-0000-4000-8000-000000000003',
    'Ready module',
    1
  );

insert into public.lessons (
  id,
  module_id,
  title,
  position,
  media_status,
  video_asset_id
)
values
  (
    '69000000-0000-4000-8000-000000000002',
    '59000000-0000-4000-8000-000000000002',
    'Processing lesson',
    1,
    'processing',
    'processing-asset'
  ),
  (
    '69000000-0000-4000-8000-000000000003',
    '59000000-0000-4000-8000-000000000003',
    'Ready lesson',
    1,
    'ready',
    'ready-asset'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000001',
  true
);

select is(
  (
    select jsonb_array_length(result.blockers)
    from public.submit_course_for_review(
      '49000000-0000-4000-8000-000000000001'
    ) as result
  ),
  2,
  'an empty draft returns its two structural blockers'
);

select is(
  (
    select result.blockers->0->>'code'
    from public.submit_course_for_review(
      '49000000-0000-4000-8000-000000000001'
    ) as result
  ),
  'course_module_required',
  'the empty draft reports the module blocker first'
);

select is(
  (
    select result.blockers->1->>'code'
    from public.submit_course_for_review(
      '49000000-0000-4000-8000-000000000001'
    ) as result
  ),
  'course_lesson_required',
  'the empty draft reports the lesson blocker'
);

select is(
  (
    select status
    from public.courses
    where id = '49000000-0000-4000-8000-000000000001'
  ),
  'draft'::public.course_status,
  'a blocked submission remains a draft'
);

select is(
  (
    select result.blockers->0->>'code'
    from public.submit_course_for_review(
      '49000000-0000-4000-8000-000000000002'
    ) as result
  ),
  'lesson_media_not_ready',
  'a processing lesson blocks submission'
);

select is(
  (
    select result.blockers->0->>'entityId'
    from public.submit_course_for_review(
      '49000000-0000-4000-8000-000000000002'
    ) as result
  ),
  '69000000-0000-4000-8000-000000000002',
  'the media blocker identifies the affected lesson'
);

select is(
  (
    select status
    from public.courses
    where id = '49000000-0000-4000-8000-000000000002'
  ),
  'draft'::public.course_status,
  'a course with processing media remains a draft'
);

select is(
  (
    select result.status
    from public.submit_course_for_review(
      '49000000-0000-4000-8000-000000000003'
    ) as result
  ),
  'in_review'::public.course_status,
  'the minimum playable course enters review'
);

select is(
  (
    select status
    from public.courses
    where id = '49000000-0000-4000-8000-000000000003'
  ),
  'in_review'::public.course_status,
  'the successful transition is persisted'
);

select throws_ok(
  $$select * from public.submit_course_for_review(
    '49000000-0000-4000-8000-000000000004'
  )$$,
  '42501',
  'Only an owned draft course can be submitted for review',
  'an instructor cannot inspect or submit another instructor draft'
);

reset role;
select * from finish();
rollback;
