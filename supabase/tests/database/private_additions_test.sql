begin;
select plan(19);
insert into public.courses(id, slug, title, price_halalas, status, instructor_id)
values ('49130000-0000-4000-8000-000000000001', 'private-additions-fixture', 'Private additions', 0,
  'published', '20000000-0000-4000-8000-000000000001');
insert into public.modules(id, course_id, title, position)
values ('59130000-0000-4000-8000-000000000001', '49130000-0000-4000-8000-000000000001', 'Live module', 1);
insert into public.lessons(id, module_id, title, position, media_status, video_asset_id, duration_seconds)
values ('69130000-0000-4000-8000-000000000001', '59130000-0000-4000-8000-000000000001',
  'Live lesson', 1, 'ready', 'live-additions-fixture', 30);
insert into public.enrollments(user_id, course_id)
values ('10000000-0000-4000-8000-000000000001', '49130000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select throws_ok($$select public.append_course_module('49130000-0000-4000-8000-000000000001','Denied')$$,
  '42501', 'Course curriculum is locked', 'locked course cannot receive additions');
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select public.admin_set_course_edit_permission('49130000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
insert into public.lessons(module_id, title, position, is_free_preview)
values ('59130000-0000-4000-8000-000000000001', 'Pending preview', 2, true);
select is((select is_pending from public.lessons where title = 'Pending preview'), true, 'live additions automatically private');
select throws_ok($$update public.lessons set title = 'Live bypass' where id = '69130000-0000-4000-8000-000000000001'$$,
  '42501', 'Existing published curriculum is immutable', 'existing live lesson cannot change');
select throws_ok($$update public.modules set title = 'Live bypass' where id = '59130000-0000-4000-8000-000000000001'$$,
  '42501', 'Existing published curriculum is immutable', 'existing live module cannot change');
select throws_ok($$select public.release_course_additions('49130000-0000-4000-8000-000000000001')$$,
  '23514', 'All additions must contain ready lessons before release', 'unfinished addition cannot release');
select lives_ok($$update public.lessons set title = 'Pending edited' where title = 'Pending preview'$$,
  'pending lesson metadata remains editable');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.lessons where module_id = '59130000-0000-4000-8000-000000000001'), 1::bigint,
  'enrolled learner catalogue cannot see pending additions');
select is((select lesson_count from public.get_learner_course_progress() where course_id = '49130000-0000-4000-8000-000000000001'),
  1::bigint, 'pending lessons do not change learner progress denominator');
select throws_ok($$select public.release_course_additions('49130000-0000-4000-8000-000000000001')$$,
  '42501', 'Course is not available for releasing additions', 'learner cannot release content');
reset role;
select set_config('request.jwt.claim.sub', '', true);
select is(public.can_access_lesson((select id from public.lessons where title='Pending edited')), false,
  'security-definer preview/playback/PDF helper denies anonymous pending access');
update public.lessons set video_asset_id = 'pending-additions-fixture', media_status='ready', duration_seconds=7
where title = 'Pending edited';
set local role service_role;
select throws_ok($$update public.lessons set video_asset_id = 'live-replacement-bypass'
  where id = '69130000-0000-4000-8000-000000000001'$$,
  '42501', 'Existing live media cannot be replaced or removed', 'service upload cannot replace live media');
select lives_ok($$update public.lessons set duration_seconds = 31 where id = '69130000-0000-4000-8000-000000000001'$$,
  'same-asset provider metadata synchronization remains available');
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select is(public.release_course_additions('49130000-0000-4000-8000-000000000001'), 1, 'ready additions released atomically');
select is(public.release_course_additions('49130000-0000-4000-8000-000000000001'), 0, 'release retry is idempotent');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.lessons where module_id = '59130000-0000-4000-8000-000000000001'), 2::bigint,
  'learner sees newly released lesson');
select is((select lesson_count from public.get_learner_course_progress() where course_id = '49130000-0000-4000-8000-000000000001'),
  2::bigint, 'released additions update denominator without deleting watched history');
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.admin_audit_log where action='course.additions.release'
  and subject='49130000-0000-4000-8000-000000000001'), 1::bigint, 'one release audit event');
select public.admin_set_course_edit_permission('49130000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select throws_ok($$select public.release_course_additions('49130000-0000-4000-8000-000000000001')$$,
  '42501', 'Course is not available for releasing additions', 'revocation blocks release');
select is((select count(*) from public.enrollments where course_id='49130000-0000-4000-8000-000000000001'), 0::bigint,
  'instructor does not gain learner private enrollment visibility');
select * from finish();
rollback;
