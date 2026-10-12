begin;
select plan(16);
insert into public.courses(id, slug, title, price_halalas, status, instructor_id) values
('49140000-0000-4000-8000-000000000001', 'pending-media-fixture', 'Media fixture', 0, 'published', '20000000-0000-4000-8000-000000000001'),
('49140000-0000-4000-8000-000000000002', 'draft-media-fixture', 'Draft fixture', 0, 'draft', '20000000-0000-4000-8000-000000000001');
insert into public.modules(id, course_id, title, position) values
('59140000-0000-4000-8000-000000000001','49140000-0000-4000-8000-000000000001','Live',1),
('59140000-0000-4000-8000-000000000002','49140000-0000-4000-8000-000000000002','Draft',1);
insert into public.lessons(id,module_id,title,position) values
('69140000-0000-4000-8000-000000000001','59140000-0000-4000-8000-000000000001','Live',1),
('69140000-0000-4000-8000-000000000003','59140000-0000-4000-8000-000000000002','Draft',1);
insert into public.lesson_resources(lesson_id,storage_path,file_name,byte_size) values
('69140000-0000-4000-8000-000000000001','cleanup/live.pdf','live.pdf',100),
('69140000-0000-4000-8000-000000000003','cleanup/draft.pdf','draft.pdf',100);
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',true);
select public.admin_set_course_edit_permission('49140000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select public.append_module_lesson('59140000-0000-4000-8000-000000000001','Pending media cleanup');
select is((select is_pending from public.lessons where title='Pending media cleanup'),true,'instructor cannot insert publicly visible live addition');
select throws_ok($$update public.lessons set is_pending=false where title='Pending media cleanup'$$,
'42501','permission denied for table lessons','direct visibility bypass denied by column grants');
set local role service_role;
select set_config('request.jwt.claim.sub','',true);
select throws_ok($$update public.lesson_resources set file_name='bypass.pdf' where lesson_id='69140000-0000-4000-8000-000000000001'$$,
'42501','Existing live media cannot be replaced or removed','live PDF metadata is immutable');
select throws_ok($$delete from public.lesson_resources where lesson_id='69140000-0000-4000-8000-000000000001'$$,
'42501','Existing live media cannot be replaced or removed','live PDF removal denied');
select lives_ok($$insert into public.lesson_resources(lesson_id,storage_path,file_name,byte_size)
select id,'cleanup/pending.pdf','pending.pdf',100 from public.lessons where title='Pending media cleanup'$$,'pending PDF can be attached');
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.delete_draft_module_lesson((select id from public.lessons where title='Pending media cleanup'))$$,'pending lesson with PDF can be deleted');
select lives_ok($$select public.delete_draft_module_lesson('69140000-0000-4000-8000-000000000003')$$,'draft lesson with PDF can be deleted');
reset role;
select set_config('request.jwt.claim.sub','',true);
select is((select count(*) from public.lesson_resources where storage_path in ('cleanup/pending.pdf','cleanup/draft.pdf')),0::bigint,'resource metadata cascades without orphan rows');
select is((select count(*) from public.lessons where id='69140000-0000-4000-8000-000000000001'),1::bigint,'live lesson ID preserved');
select is((select file_name from public.lesson_resources where lesson_id='69140000-0000-4000-8000-000000000001'),'live.pdf','live PDF unchanged');
insert into public.modules(id,course_id,title,position,is_pending) values
('59140000-0000-4000-8000-000000000003','49140000-0000-4000-8000-000000000001','Pending deletion',2,true);
insert into public.lessons(module_id,title,position,is_pending) values
('59140000-0000-4000-8000-000000000003','Pending cascade',1,true),
('59140000-0000-4000-8000-000000000002','Draft cascade',1,false);
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select throws_ok($$update public.modules set is_pending=false where id='59140000-0000-4000-8000-000000000003'$$,
'42501','Use the release operation to publish additions','module visibility bypass denied');
select throws_ok($$update public.modules set id='59140000-0000-4000-8000-000000000099' where id='59140000-0000-4000-8000-000000000003'$$,
'42501','Curriculum identity is immutable','pending module identity preserved');
select lives_ok($$select public.delete_draft_course_module('59140000-0000-4000-8000-000000000003')$$,'pending module and its lessons can be deleted');
select lives_ok($$select public.delete_draft_course_module('59140000-0000-4000-8000-000000000002')$$,'draft module and its lessons can be deleted');
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',true);
select public.admin_set_course_edit_permission('49140000-0000-4000-8000-000000000001',false);
set local role service_role;
select set_config('request.jwt.claim.sub','',true);
select throws_ok($$update public.lessons set video_asset_id='late-upload' where id='69140000-0000-4000-8000-000000000001'$$,
'42501','Existing live media cannot be replaced or removed','late service binding fails after revocation');
select throws_ok($$insert into public.lesson_resources(lesson_id,storage_path,file_name,byte_size) values
('69140000-0000-4000-8000-000000000001','cleanup/replacement.pdf','replacement.pdf',100)$$,
'42501','Existing live media cannot be replaced or removed','live PDF replacement denied before upsert');
select * from finish();
rollback;
