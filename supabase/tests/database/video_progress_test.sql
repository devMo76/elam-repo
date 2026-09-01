begin;

select plan(12);

select has_index(
  'public',
  'lessons',
  'lessons_video_asset_id_key',
  'video asset IDs are unique'
);

select ok(
  has_column_privilege('authenticated', 'public.lessons', 'title', 'UPDATE'),
  'authenticated authors may update lesson metadata'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.lessons',
    'video_asset_id',
    'UPDATE'
  ),
  'browser clients cannot update provider video IDs'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.lessons',
    'media_status',
    'UPDATE'
  ),
  'browser clients cannot forge video readiness'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.lesson_progress',
    'last_position_seconds',
    'UPDATE'
  ),
  'browser clients cannot bypass the progress function'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select is(
  (
    select revision
    from public.record_lesson_progress(
      '60000000-0000-4000-8000-000000000002',
      300,
      0,
      false
    )
  ),
  1::bigint,
  'a valid progress update increments the revision'
);

select is(
  (
    select revision
    from public.record_lesson_progress(
      '60000000-0000-4000-8000-000000000002',
      300,
      0,
      false
    )
  ),
  1::bigint,
  'an identical retry is idempotent'
);

select throws_ok(
  $test$
    select * from public.record_lesson_progress(
      '60000000-0000-4000-8000-000000000002',
      310,
      0,
      false
    )
  $test$,
  '40001',
  'Progress revision conflict',
  'a delayed write cannot overwrite newer progress'
);

select throws_ok(
  $test$
    select * from public.record_lesson_progress(
      '60000000-0000-4000-8000-000000000002',
      1086,
      1,
      false
    )
  $test$,
  '22023',
  'Position exceeds lesson duration',
  'progress beyond the provider duration is rejected'
);

select ok(
  (
    select completed_at is not null
    from public.record_lesson_progress(
      '60000000-0000-4000-8000-000000000002',
      972,
      1,
      false
    )
  ),
  'watching ninety percent completes a lesson'
);

select is(
  (
    select completed_lesson_count
    from public.get_learner_course_progress()
    where course_id = '40000000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'the learner dashboard aggregates completed lessons'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select throws_ok(
  $test$
    select * from public.record_lesson_progress(
      '60000000-0000-4000-8000-000000000002',
      10,
      0,
      false
    )
  $test$,
  '42501',
  'Lesson access denied',
  'a non-enrolled learner cannot write paid-lesson progress'
);

reset role;
select * from finish();
rollback;
