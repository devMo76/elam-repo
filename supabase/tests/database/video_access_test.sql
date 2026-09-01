begin;

select plan(7);

set local role anon;

select is(
  (
    select count(*)
    from public.get_lesson_playback_access(
      '60000000-0000-4000-8000-000000000001'
    )
  ),
  1::bigint,
  'anonymous users may access a published free preview'
);

select is(
  (
    select count(*)
    from public.get_lesson_playback_access(
      '60000000-0000-4000-8000-000000000002'
    )
  ),
  0::bigint,
  'anonymous users may not access a paid lesson'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select is(
  (
    select count(*)
    from public.get_lesson_playback_access(
      '60000000-0000-4000-8000-000000000002'
    )
  ),
  0::bigint,
  'a non-enrolled learner may not access a paid lesson'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select is(
  (
    select count(*)
    from public.get_lesson_playback_access(
      '60000000-0000-4000-8000-000000000002'
    )
  ),
  1::bigint,
  'an enrolled learner may access a paid lesson'
);

select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000001',
  true
);

select is(
  (
    select count(*)
    from public.get_lesson_playback_access(
      '60000000-0000-4000-8000-000000000004'
    )
  ),
  1::bigint,
  'the course owner may preview a draft lesson'
);

select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-4000-8000-000000000001',
  true
);

select is(
  (
    select count(*)
    from public.get_lesson_playback_access(
      '60000000-0000-4000-8000-000000000004'
    )
  ),
  1::bigint,
  'an administrator may preview a draft lesson'
);

update public.courses
set status = 'archived'
where id = '40000000-0000-4000-8000-000000000001';

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select is(
  (
    select count(*)
    from public.get_lesson_playback_access(
      '60000000-0000-4000-8000-000000000002'
    )
  ),
  1::bigint,
  'an enrolled learner retains access after archival'
);

reset role;
select * from finish();
rollback;
