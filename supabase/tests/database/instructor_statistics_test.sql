begin;

select plan(8);

select is(
  has_function_privilege('authenticated', 'public.instructor_course_stats()', 'execute'),
  true,
  'authenticated sessions can request instructor statistics'
);
select is(
  has_function_privilege('anon', 'public.instructor_course_stats()', 'execute'),
  false,
  'anonymous sessions cannot request instructor statistics'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is(
  (select count(*) from public.instructor_course_stats()),
  0::bigint,
  'learners receive no instructor statistics'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select is(
  (select count(*) from public.instructor_course_stats()),
  4::bigint,
  'an instructor receives one row per owned course'
);
select is(
  (
    select enrollment_count
    from public.instructor_course_stats()
    where course_id = '40000000-0000-4000-8000-000000000001'
  ),
  1,
  'the function returns the correct enrolment count'
);
select is(
  (select count(*) from public.enrollments),
  0::bigint,
  'the instructor still cannot read learner enrolment rows'
);
select is(
  (
    select bool_or(to_jsonb(statistic) ? 'user_id' or to_jsonb(statistic) ? 'amount_halalas')
    from public.instructor_course_stats() as statistic
  ),
  false,
  'statistics expose neither learner IDs nor monetary fields'
);
select is(
  (
    select bool_and(to_jsonb(statistic) ? 'enrollment_count')
    from public.instructor_course_stats() as statistic
  ),
  true,
  'statistics expose only the intended aggregate count'
);

reset role;
select * from finish();
rollback;
