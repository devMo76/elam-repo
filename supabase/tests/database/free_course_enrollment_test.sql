begin;

select plan(5);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.claim_free_course('41000000-0000-4000-8000-000000000001')),
  1::bigint,
  'a confirmed learner can claim the published free course'
);

select ok(
  exists (
    select 1 from public.enrollments
    where user_id = '10000000-0000-4000-8000-000000000002'
      and course_id = '41000000-0000-4000-8000-000000000001'
  ),
  'claiming the free course creates a library enrolment'
);

select is(
  (select count(*) from public.claim_free_course('41000000-0000-4000-8000-000000000001')),
  1::bigint,
  'claiming a free course a second time is idempotent'
);

select throws_ok(
  $test$
    select public.claim_free_course('41000000-0000-4000-8000-000000000002')
  $test$,
  'P0002',
  'The free course is not available',
  'a learner cannot claim a paid or unavailable course'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $test$
    select public.claim_free_course('41000000-0000-4000-8000-000000000001')
  $test$,
  '42501',
  'A learner account is required to claim a free course',
  'an instructor cannot claim a free course through the RPC'
);

reset role;
select * from finish();
rollback;
