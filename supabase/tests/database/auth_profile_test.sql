begin;

select plan(5);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '90000000-0000-4000-8000-000000000001',
  'new.learner@example.invalid',
  '{"full_name":"New Learner","role":"admin"}'::jsonb
);

select is(
  (
    select count(*)
    from public.profiles
    where id = '90000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'a new Auth identity receives exactly one profile'
);
select is(
  (
    select full_name
    from public.profiles
    where id = '90000000-0000-4000-8000-000000000001'
  ),
  'New Learner',
  'the validated full name is copied into the profile'
);
select is(
  (
    select role
    from public.profiles
    where id = '90000000-0000-4000-8000-000000000001'
  ),
  'learner'::public.user_role,
  'user metadata cannot elevate the default learner role'
);
select throws_ok(
  $test$
    insert into auth.users (id, email, raw_user_meta_data)
    values (
      '90000000-0000-4000-8000-000000000002',
      'missing.name@example.invalid',
      '{}'::jsonb
    )
  $test$,
  '23514',
  'A non-empty full name is required to create a profile',
  'registration without a full name is rejected atomically'
);
select is(
  (
    select count(*)
    from auth.users
    where id = '90000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'a rejected registration leaves no orphaned Auth identity'
);

select * from finish();
rollback;
