begin;

select plan(13);

select is((select public from storage.buckets where id = 'lesson-pdfs'), false,
  'lesson PDF bucket is private');
select is((select file_size_limit from storage.buckets where id = 'lesson-pdfs'), 20971520::bigint,
  'lesson PDF bucket limits file size');

insert into public.lesson_resources (lesson_id, storage_path, file_name, byte_size)
values
  ('60000000-0000-4000-8000-000000000001', 'preview/test.pdf', 'preview.pdf', 100),
  ('60000000-0000-4000-8000-000000000002', 'paid/test.pdf', 'paid.pdf', 100);

set local role anon;
select is((select count(*) from public.lesson_resources), 1::bigint,
  'anonymous visitors only see the free preview PDF metadata');
select is((select count(*) from public.lesson_resources where lesson_id = '60000000-0000-4000-8000-000000000002'), 0::bigint,
  'anonymous visitors cannot see paid PDF metadata');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.lesson_resources), 1::bigint,
  'non-enrolled learners only see preview PDF metadata');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.lesson_resources), 2::bigint,
  'enrolled learners see paid PDF metadata');
select throws_ok(
  $$insert into public.lesson_resources (lesson_id, storage_path, file_name, byte_size)
    values ('60000000-0000-4000-8000-000000000003', 'bad/test.pdf', 'bad.pdf', 100)$$,
  '42501', null, 'learners cannot author PDF metadata');

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
update public.courses set status = 'archived'
where id = '40000000-0000-4000-8000-000000000001';

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*) from public.courses where id = '40000000-0000-4000-8000-000000000001'), 0::bigint,
  'anonymous visitors cannot read archived courses');
select is((select count(*) from public.lesson_resources), 0::bigint,
  'anonymous visitors cannot read archived PDFs');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.courses where id = '40000000-0000-4000-8000-000000000001'), 0::bigint,
  'non-enrolled learners cannot read archived courses');
select is((select count(*) from public.lesson_resources), 0::bigint,
  'non-enrolled learners cannot read archived PDFs');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.courses where id = '40000000-0000-4000-8000-000000000001'), 1::bigint,
  'enrolled learners retain archived course access');
select is((select count(*) from public.lesson_resources), 2::bigint,
  'enrolled learners retain archived PDF access');

reset role;
select * from finish();
rollback;
