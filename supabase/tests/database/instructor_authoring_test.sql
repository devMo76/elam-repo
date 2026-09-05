begin;

select plan(29);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '20000000-0000-4000-8000-000000000009',
  'authoring.second@example.invalid',
  '{"full_name":"Second Authoring Instructor"}'::jsonb
);
update public.profiles
set role = 'instructor'
where id = '20000000-0000-4000-8000-000000000009';

insert into public.courses (id, slug, title, price_halalas, instructor_id)
values (
  '40000000-0000-4000-8000-000000000009',
  'second-authoring-draft',
  'Second Authoring Draft',
  10000,
  '20000000-0000-4000-8000-000000000009'
);

select is(
  has_function_privilege('authenticated', 'public.append_course_module(uuid,text)', 'execute'),
  true,
  'authenticated sessions can call the module append transaction'
);
select is(
  has_function_privilege('anon', 'public.append_course_module(uuid,text)', 'execute'),
  false,
  'anonymous sessions cannot call authoring transactions'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);

select is(
  (public.append_course_module(
    '40000000-0000-4000-8000-000000000002',
    '  Advanced Circuits  '
  )).position,
  2,
  'a new module is appended after the existing module'
);
select is(
  (
    select title from public.modules
    where course_id = '40000000-0000-4000-8000-000000000002' and position = 2
  ),
  'Advanced Circuits',
  'module titles are normalized before storage'
);
select is(
  (public.append_course_module(
    '40000000-0000-4000-8000-000000000002',
    'Circuit Applications'
  )).position,
  3,
  'later module appends receive the next position'
);

select lives_ok(
  format(
    'select public.reorder_course_modules(%L, array[%L::uuid,%L::uuid,%L::uuid])',
    '40000000-0000-4000-8000-000000000002',
    (select id from public.modules where course_id = '40000000-0000-4000-8000-000000000002' and title = 'Circuit Applications'),
    '50000000-0000-4000-8000-000000000003',
    (select id from public.modules where course_id = '40000000-0000-4000-8000-000000000002' and title = 'Advanced Circuits')
  ),
  'all course modules can be reordered atomically'
);
select is(
  (select title from public.modules where course_id = '40000000-0000-4000-8000-000000000002' and position = 1),
  'Circuit Applications',
  'module reorder stores the requested first module'
);
select throws_ok(
  $$select public.reorder_course_modules(
    '40000000-0000-4000-8000-000000000002',
    array['50000000-0000-4000-8000-000000000003'::uuid]
  )$$,
  '22023',
  'Module order must contain every course module exactly once',
  'incomplete module orders are rejected'
);
select throws_ok(
  $$select public.reorder_course_modules(
    '40000000-0000-4000-8000-000000000002',
    array[
      '50000000-0000-4000-8000-000000000003'::uuid,
      '50000000-0000-4000-8000-000000000003'::uuid,
      '50000000-0000-4000-8000-000000000003'::uuid
    ]
  )$$,
  '22023',
  'Module order must contain every course module exactly once',
  'duplicate module IDs are rejected'
);
select throws_ok(
  $$select public.append_course_module(
    '40000000-0000-4000-8000-000000000009',
    'Forbidden module'
  )$$,
  '42501',
  'Course is not available for authoring',
  'an instructor cannot append to another instructor course'
);
select throws_ok(
  $$select public.append_course_module(
    '40000000-0000-4000-8000-000000000002',
    '   '
  )$$,
  '22023',
  'Module title is required',
  'blank module titles are rejected'
);

select is(
  (public.append_module_lesson(
    '50000000-0000-4000-8000-000000000003',
    '  Kirchhoff Laws  '
  )).position,
  2,
  'a new lesson is appended after the existing lesson'
);
select is(
  (public.append_module_lesson(
    '50000000-0000-4000-8000-000000000003',
    'Circuit Examples'
  )).position,
  3,
  'later lesson appends receive the next position'
);
select lives_ok(
  format(
    'select public.reorder_module_lessons(%L, array[%L::uuid,%L::uuid,%L::uuid])',
    '50000000-0000-4000-8000-000000000003',
    (select id from public.lessons where module_id = '50000000-0000-4000-8000-000000000003' and title = 'Circuit Examples'),
    '60000000-0000-4000-8000-000000000004',
    (select id from public.lessons where module_id = '50000000-0000-4000-8000-000000000003' and title = 'Kirchhoff Laws')
  ),
  'all module lessons can be reordered atomically'
);
select is(
  (select title from public.lessons where module_id = '50000000-0000-4000-8000-000000000003' and position = 1),
  'Circuit Examples',
  'lesson reorder stores the requested first lesson'
);
select throws_ok(
  $$select public.reorder_module_lessons(
    '50000000-0000-4000-8000-000000000003',
    array['60000000-0000-4000-8000-000000000004'::uuid]
  )$$,
  '22023',
  'Lesson order must contain every module lesson exactly once',
  'incomplete lesson orders are rejected'
);
select throws_ok(
  $$select public.reorder_module_lessons(
    '50000000-0000-4000-8000-000000000003',
    array[
      '60000000-0000-4000-8000-000000000004'::uuid,
      '60000000-0000-4000-8000-000000000004'::uuid,
      '60000000-0000-4000-8000-000000000004'::uuid
    ]
  )$$,
  '22023',
  'Lesson order must contain every module lesson exactly once',
  'duplicate lesson IDs are rejected'
);
select throws_ok(
  $$select public.append_module_lesson(
    '50000000-0000-4000-8000-000000000005',
    'Forbidden lesson'
  )$$,
  '42501',
  'Module is not available for authoring',
  'an instructor cannot append to another instructor module'
);

select lives_ok(
  format(
    'select public.delete_draft_module_lesson(%L)',
    (select id from public.lessons where module_id = '50000000-0000-4000-8000-000000000003' and title = 'Kirchhoff Laws')
  ),
  'a lesson can be deleted from an owned draft course'
);
select is(
  (select max(position) from public.lessons where module_id = '50000000-0000-4000-8000-000000000003'),
  2,
  'lesson positions are compacted after deletion'
);
select lives_ok(
  format(
    'select public.delete_draft_course_module(%L)',
    (select id from public.modules where course_id = '40000000-0000-4000-8000-000000000002' and title = 'Advanced Circuits')
  ),
  'a module can be deleted from an owned draft course'
);
select is(
  (select max(position) from public.modules where course_id = '40000000-0000-4000-8000-000000000002'),
  2,
  'module positions are compacted after deletion'
);

select throws_ok(
  $$select public.delete_draft_course_module('50000000-0000-4000-8000-000000000001')$$,
  '42501',
  'Only modules in an editable draft course can be deleted',
  'published course modules cannot be deleted'
);
select throws_ok(
  $$select public.delete_draft_module_lesson('60000000-0000-4000-8000-000000000001')$$,
  '42501',
  'Only lessons in an editable draft course can be deleted',
  'published course lessons cannot be deleted'
);
with deleted as (
  delete from public.modules
  where id = '50000000-0000-4000-8000-000000000001'
  returning 1
)
select is((select count(*) from deleted), 0::bigint, 'direct REST-style deletion cannot remove a published module');
with deleted as (
  delete from public.lessons
  where id = '60000000-0000-4000-8000-000000000001'
  returning 1
)
select is((select count(*) from deleted), 0::bigint, 'direct REST-style deletion cannot remove a published lesson');

select is(
  (public.submit_course_for_review('40000000-0000-4000-8000-000000000002')).status,
  'in_review'::public.course_status,
  'an instructor can submit an owned draft course for review'
);
select throws_ok(
  $$select public.submit_course_for_review('40000000-0000-4000-8000-000000000009')$$,
  '42501',
  'Only an owned draft course can be submitted for review',
  'an instructor cannot submit another instructor course'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.append_course_module(
    '40000000-0000-4000-8000-000000000002',
    'Learner module'
  )$$,
  '42501',
  'Course is not available for authoring',
  'learners cannot append course modules'
);

reset role;
select * from finish();
rollback;
