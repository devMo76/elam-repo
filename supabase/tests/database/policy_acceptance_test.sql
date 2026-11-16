begin;
select no_plan();

select has_table('public', 'policy_acceptances', 'policy acceptance table exists');
select is(public.current_policy_version(), '2026-11-13.1', 'published policy version matches the application');

insert into auth.users(id, email, raw_user_meta_data) values
  ('fa130001-0000-4000-8000-000000000001', 'policy-new@example.test',
    '{"full_name":"New account","policy_acceptance":{"accepted":true,"version":"2026-11-13.1"}}'),
  ('fa130001-0000-4000-8000-000000000002', 'policy-existing@example.test', '{"full_name":"Existing instructor"}'),
  ('fa130001-0000-4000-8000-000000000003', 'policy-forged@example.test',
    '{"full_name":"Forged metadata","policy_acceptance":{"accepted":"true","version":"2026-11-13.1"}}'),
  ('fa130001-0000-4000-8000-000000000004', 'policy-stale@example.test',
    '{"full_name":"Old version","policy_acceptance":{"accepted":true,"version":"obsolete"}}');

select is((select source from public.policy_acceptances where user_id = 'fa130001-0000-4000-8000-000000000001'),
  'registration', 'signup records explicit current-version consent atomically');
select is((select accepted_at from public.policy_acceptances where user_id = 'fa130001-0000-4000-8000-000000000001'),
  now(), 'acceptance uses the server transaction timestamp');
select is((select count(*) from public.policy_acceptances where user_id in (
  'fa130001-0000-4000-8000-000000000002', 'fa130001-0000-4000-8000-000000000003', 'fa130001-0000-4000-8000-000000000004')),
  0::bigint, 'legacy, string-valued and outdated metadata do not imply agreement');

update auth.users set raw_user_meta_data = '{"full_name":"Existing instructor","policy_acceptance":{"accepted":true,"version":"2026-11-13.1"}}'
where id = 'fa130001-0000-4000-8000-000000000002';
select is((select count(*) from public.policy_acceptances where user_id = 'fa130001-0000-4000-8000-000000000002'),
  0::bigint, 'editing user metadata cannot fabricate acceptance');
update public.profiles set role = 'instructor' where id = 'fa130001-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'fa130001-0000-4000-8000-000000000002', true);
select is(public.has_current_policy_acceptance(), false, 'existing instructor must agree');
select is((select count(*) from public.policy_acceptances), 0::bigint, 'RLS hides another user agreement');
select throws_ok($$ select public.accept_current_policy('obsolete') $$, '22023', 'Policy version is outdated', 'outdated agreement is rejected');
select lives_ok($$ select public.accept_current_policy('2026-11-13.1') $$, 'existing instructor may agree');
select is(public.has_current_policy_acceptance(), true, 'saved acceptance unlocks the current policy');
select is((select source from public.policy_acceptances), 'existing_account', 'existing-user source recorded');
select lives_ok($$ select public.accept_current_policy('2026-11-13.1') $$, 'retries are idempotent');
select is((select count(*) from public.policy_acceptances), 1::bigint, 'retry does not duplicate acceptance');
select is((select accepted_at from public.policy_acceptances), now(), 'retry keeps the original timestamp');
select is((select role::text from public.profiles where id = auth.uid()), 'instructor', 'agreement preserves the instructor role');
select throws_ok($$ insert into public.policy_acceptances(user_id,policy_version,source) values(auth.uid(),'forged','registration') $$,
  '42501', 'permission denied for table policy_acceptances', 'browser cannot directly insert forged evidence');
select throws_ok($$ update public.policy_acceptances set accepted_at = '2000-01-01' where user_id = auth.uid() $$,
  '42501', 'permission denied for table policy_acceptances', 'browser cannot alter timestamps');
select throws_ok($$ delete from public.policy_acceptances where user_id = auth.uid() $$,
  '42501', 'permission denied for table policy_acceptances', 'browser cannot erase agreement history');

select set_config('request.jwt.claim.sub', 'fa130001-0000-4000-8000-000000000003', true);
select is(public.has_current_policy_acceptance(), false, 'another session cannot inherit acceptance');
select is((select count(*) from public.policy_acceptances), 0::bigint, 'RLS still isolates accepted users');
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$ select public.accept_current_policy('2026-11-13.1') $$,
  '42501', 'Authentication required', 'RPC requires a verified identity');
set local role anon;
select throws_ok($$ select public.accept_current_policy('2026-11-13.1') $$,
  '42501', 'permission denied for function accept_current_policy', 'anonymous users cannot accept on behalf of accounts');

select * from finish();
rollback;
