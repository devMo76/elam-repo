begin;
select plan(15);

-- Own fixture: do not assume a catalogue seed course still has its original owner.
insert into public.courses (id, slug, title, price_halalas, instructor_id)
values ('49110000-0000-4000-8000-000000000001', 'published-edit-permission-fixture',
  'Permission fixture', 0, '20000000-0000-4000-8000-000000000001');

select is((select instructor_published_edits_allowed from public.courses
  where id = '49110000-0000-4000-8000-000000000001'), false, 'course permissions default off');

set local role anon;
select throws_ok($$select public.admin_set_course_edit_permission('49110000-0000-4000-8000-000000000001', true)$$,
  '42501', null, 'anonymous callers cannot invoke permission RPC');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok($$select public.admin_set_course_edit_permission('49110000-0000-4000-8000-000000000001', true)$$,
  '42501', 'Administrator role required', 'learner cannot grant edits');

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select throws_ok($$select public.admin_set_course_edit_permission('49110000-0000-4000-8000-000000000001', true)$$,
  '42501', 'Administrator role required', 'instructor cannot invoke permission RPC');
select throws_ok($$update public.courses set instructor_published_edits_allowed = true
  where id = '49110000-0000-4000-8000-000000000001'$$,
  '42501', 'Administrator role required', 'owner cannot bypass RPC with direct update');

select throws_ok($$insert into public.courses
  (slug, title, price_halalas, instructor_id, instructor_published_edits_allowed)
  values ('forged-edit-permission', 'Forged permission', 0,
    '20000000-0000-4000-8000-000000000001', true)$$,
  '42501', 'Administrator role required', 'instructor cannot grant permission on insert');

select lives_ok($$update public.courses set title = 'Updated permission fixture'
  where id = '49110000-0000-4000-8000-000000000001'$$,
  'ordinary draft edits remain available');

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select is(public.admin_set_course_edit_permission('49110000-0000-4000-8000-000000000001', true), true,
  'admin can grant edits');
select is((select count(*) from public.admin_audit_log where action = 'course.edit_permission.change'
  and subject = '49110000-0000-4000-8000-000000000001'), 1::bigint, 'grant creates one audit record');

select is((select detail from public.admin_audit_log where action = 'course.edit_permission.change'
  and subject = '49110000-0000-4000-8000-000000000001'),
  '{"from":false,"to":true}'::jsonb, 'audit records the exact permission transition');

select public.admin_set_course_edit_permission('49110000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.admin_audit_log where action = 'course.edit_permission.change'
  and subject = '49110000-0000-4000-8000-000000000001'), 1::bigint, 'unchanged permission does not duplicate audit');

select is(public.admin_set_course_edit_permission('49110000-0000-4000-8000-000000000001', false), false,
  'admin can revoke edits');
select is((select count(*) from public.admin_audit_log where action = 'course.edit_permission.change'
  and subject = '49110000-0000-4000-8000-000000000001'), 2::bigint, 'revocation adds an audit record');
select throws_ok($$select public.admin_set_course_edit_permission('49110000-0000-4000-8000-000000000001', null)$$,
  '22023', 'Edit permission must be true or false', 'null permission is rejected');
select throws_ok($$select public.admin_set_course_edit_permission('ffffffff-ffff-4fff-8fff-ffffffffffff', true)$$,
  'P0002', 'Course not found', 'missing course is rejected');

select * from finish();
rollback;
