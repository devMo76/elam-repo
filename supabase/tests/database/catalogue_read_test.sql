begin;

select plan(11);

select throws_ok(
  $test$
    insert into public.courses (slug, title, price_halalas, instructor_id)
    values ('Invalid Slug', 'Invalid slug course', 1000, '20000000-0000-4000-8000-000000000001')
  $test$,
  '23514',
  null,
  'course slugs must be normalized for stable URLs'
);

set local role anon;

select is(
  (select count(*) from public.courses where status = 'published'),
  1::bigint,
  'the anonymous catalogue contains the published seed course only'
);
select is(
  (
    select slug from public.courses
    where slug = 'signals-and-systems-ee301'
  ),
  'signals-and-systems-ee301',
  'the published course resolves by stable slug'
);
select is(
  (
    select count(*) from public.courses
    where slug in (
      'electric-circuits-ee201',
      'digital-communications-ee401',
      'engineering-mechanics-me201'
    )
  ),
  0::bigint,
  'draft, review, and archived slugs do not resolve anonymously'
);
select is(
  (
    select array_agg(position order by position)
    from public.modules
    where course_id = '40000000-0000-4000-8000-000000000001'
  ),
  array[1, 2],
  'public syllabus modules retain deterministic ordering'
);
select is(
  (
    select array_agg(l.position order by l.position)
    from public.lessons l
    join public.modules m on m.id = l.module_id
    where m.id = '50000000-0000-4000-8000-000000000001'
  ),
  array[1, 2],
  'public syllabus lessons retain deterministic ordering'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (
    select count(*) from public.enrollments
    where user_id = auth.uid()
      and course_id = '40000000-0000-4000-8000-000000000001'
      and (expires_at is null or expires_at > now())
  ),
  1::bigint,
  'enrolled state is derivable from the authenticated learner session'
);
select is(
  (
    select count(*) from public.courses
    where slug = 'engineering-mechanics-me201'
  ),
  0::bigint,
  'archived courses do not leak through catalogue reads to learners'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);

select is(
  (
    select count(*) from public.courses
    where slug in (
      'electric-circuits-ee201',
      'digital-communications-ee401',
      'engineering-mechanics-me201'
    )
  ),
  3::bigint,
  'the owning instructor can preview every state of their own courses'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*) from public.courses),
  4::bigint,
  'administrators can preview every course state'
);
select is(
  (select count(id) from public.orders),
  3::bigint,
  'catalogue policy changes do not alter existing administrator access'
);

reset role;
select * from finish();
rollback;
