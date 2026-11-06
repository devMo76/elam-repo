begin;
select no_plan();

insert into public.courses(id, slug, title, price_halalas, status, instructor_id) values
 ('49110000-0000-4000-8000-000000000001','wide-edit-one','Course one',0,'published','20000000-0000-4000-8000-000000000001'),
 ('49110000-0000-4000-8000-000000000002','wide-edit-two','Course two',0,'published','20000000-0000-4000-8000-000000000001'),
 ('49110000-0000-4000-8000-000000000003','wide-edit-other','Other instructor',0,'published','20000000-0000-4000-8000-000000000002');

select is((select instructor_published_updates_allowed from public.profiles where id='20000000-0000-4000-8000-000000000001'), false, 'instructor updates default off');
set local role anon;
select throws_ok($$select public.admin_set_instructor_edit_permission('20000000-0000-4000-8000-000000000001',true)$$, '42501', null, 'anonymous cannot grant updates');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.admin_set_instructor_edit_permission('20000000-0000-4000-8000-000000000001',true)$$, '42501','Administrator role required','learner cannot grant updates');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.admin_set_instructor_edit_permission('20000000-0000-4000-8000-000000000001',true)$$, '42501','Administrator role required','instructor cannot self-grant');
select throws_ok($$update public.profiles set instructor_published_updates_allowed=true where id=auth.uid()$$, '42501',null,'profile update cannot self-grant');
select throws_ok($$update public.courses set title='Blocked' where id='49110000-0000-4000-8000-000000000001'$$,'42501','Course details are locked in this state','disabled instructor cannot edit');

select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.admin_set_course_edit_permission('49110000-0000-4000-8000-000000000001',true)$$,'22023','Manage published updates on the instructor account','legacy course setter retired');
select is(public.admin_set_instructor_edit_permission('20000000-0000-4000-8000-000000000001',true),true,'admin enables instructor');
select is(public.instructor_updates_enabled('20000000-0000-4000-8000-000000000001'),true,'one grant covers instructor');
select is(public.instructor_updates_enabled('20000000-0000-4000-8000-000000000002'),false,'other instructor unaffected');
select is((select count(*) from public.admin_audit_log where action='instructor.edit_permission.change' and subject='20000000-0000-4000-8000-000000000001'),1::bigint,'grant audited');
select public.admin_set_instructor_edit_permission('20000000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.admin_audit_log where action='instructor.edit_permission.change' and subject='20000000-0000-4000-8000-000000000001'),1::bigint,'idempotent grant does not duplicate audit');

select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select lives_ok($$update public.courses set title='Corrected one' where id='49110000-0000-4000-8000-000000000001'$$,'first published course editable');
select lives_ok($$update public.courses set title='Corrected two' where id='49110000-0000-4000-8000-000000000002'$$,'second published course editable without a separate grant');
update public.courses set title='Cannot edit other owner' where id='49110000-0000-4000-8000-000000000003';
reset role;
select is((select title from public.courses where id='49110000-0000-4000-8000-000000000003'),'Other instructor','enabled instructor still cannot edit another owner');

select set_config('request.jwt.claim.sub','',true);
insert into public.courses(id,slug,title,status,instructor_id) values('49110000-0000-4000-8000-000000000004','wide-edit-future','Future course','published','20000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select lives_ok($$update public.courses set title='Future corrected' where id='49110000-0000-4000-8000-000000000004'$$,'future published course inherits permission');
select throws_ok($$update public.courses set price_halalas=500 where id='49110000-0000-4000-8000-000000000001'$$,'42501','Course price and URL are locked after draft','commercial fields remain locked');

select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',true);
-- Even a leftover legacy true flag cannot override the instructor-wide decision.
update public.courses set instructor_published_edits_allowed=true where id='49110000-0000-4000-8000-000000000001';
select is(public.admin_set_instructor_edit_permission('20000000-0000-4000-8000-000000000001',false),false,'admin revokes all instructor updates');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select throws_ok($$update public.courses set title='Legacy bypass' where id='49110000-0000-4000-8000-000000000001'$$,'42501','Course details are locked in this state','legacy true flag cannot bypass revocation');
select throws_ok($$update public.courses set title='Blocked again' where id='49110000-0000-4000-8000-000000000002'$$,'42501','Course details are locked in this state','revocation affects every course');

select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.admin_set_instructor_edit_permission('10000000-0000-4000-8000-000000000001',true)$$,'P0002','Instructor not found','learner target rejected');
select throws_ok($$select public.admin_set_instructor_edit_permission('20000000-0000-4000-8000-000000000001',null)$$,'22023','Edit permission must be true or false','null rejected');
select throws_ok($$select public.admin_set_instructor_edit_permission('ffffffff-ffff-4fff-8fff-ffffffffffff',true)$$,'P0002','Instructor not found','unknown instructor rejected');
select is((select count(*) from public.admin_audit_log where action='instructor.edit_permission.change' and subject='20000000-0000-4000-8000-000000000001'),2::bigint,'revocation audited once');

select public.admin_set_instructor_edit_permission('20000000-0000-4000-8000-000000000001',true);
select lives_ok($$update public.profiles set role='learner' where id='20000000-0000-4000-8000-000000000001'$$,'admin can demote an enabled instructor');
select is(public.instructor_updates_enabled('20000000-0000-4000-8000-000000000001'),false,'demoted user loses update permission');
select is((select instructor_published_updates_allowed from public.profiles where id='20000000-0000-4000-8000-000000000001'),false,'permission is cleared rather than silently revived on later promotion');

reset role;
select * from finish();
rollback;
