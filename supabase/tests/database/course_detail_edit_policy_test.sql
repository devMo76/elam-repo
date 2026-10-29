begin;
select plan(20);

insert into public.courses (id, slug, title, price_halalas, status, instructor_id,
  instructor_published_edits_allowed)
values
  ('49120000-0000-4000-8000-000000000001', 'detail-policy-draft', 'Draft', 1000, 'draft', '20000000-0000-4000-8000-000000000001', false),
  ('49120000-0000-4000-8000-000000000002', 'detail-policy-review', 'Review', 1000, 'in_review', '20000000-0000-4000-8000-000000000001', false),
  ('49120000-0000-4000-8000-000000000003', 'detail-policy-live', 'Live', 1000, 'published', '20000000-0000-4000-8000-000000000001', false),
  ('49120000-0000-4000-8000-000000000004', 'detail-policy-archived', 'Archived', 1000, 'archived', '20000000-0000-4000-8000-000000000001', false);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select lives_ok($$update public.courses set title = 'Updated draft', price_halalas = 2000,
  slug = 'detail-policy-draft-updated' where id = '49120000-0000-4000-8000-000000000001'$$,
  'draft descriptive and commercial edits remain available');
select throws_ok($$update public.courses set created_at = created_at + interval '1 day'
  where id = '49120000-0000-4000-8000-000000000001'$$,
  '42501', 'Course identity fields are immutable for instructors', 'draft cannot forge identity timestamp');
select throws_ok($$update public.courses set instructor_id = '20000000-0000-4000-8000-000000000002'
  where id = '49120000-0000-4000-8000-000000000001'$$,
  '42501', 'Course identity fields are immutable for instructors', 'instructor cannot reassign ownership');
select throws_ok($$update public.courses set title = 'Review bypass'
  where id = '49120000-0000-4000-8000-000000000002'$$,
  '42501', 'Course details are locked in this state', 'review details are read-only');
select lives_ok($$update public.courses set status = 'draft'
  where id = '49120000-0000-4000-8000-000000000002'$$,
  'existing review withdrawal transition still works');
select throws_ok($$update public.courses set title = 'Locked bypass'
  where id = '49120000-0000-4000-8000-000000000003'$$,
  '42501', 'Course details are locked in this state', 'published details default locked');
with changed as (update public.courses set title = 'Archived bypass'
  where id = '49120000-0000-4000-8000-000000000004' returning 1)
select is((select count(*) from changed), 0::bigint, 'archived write is filtered by RLS');

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select public.admin_set_course_edit_permission('49120000-0000-4000-8000-000000000003', true);
update public.platform_settings set instructor_direct_publish = true where id = 1;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select lives_ok($$update public.courses set department = 'Updated department', course_code = 'NEW',
  title = 'Updated live', subtitle = 'Subtitle', description = 'Description', cover_url = 'https://example.invalid/cover.jpg'
  where id = '49120000-0000-4000-8000-000000000003'$$, 'enabled published descriptive fields are editable');
select is((select status from public.courses where id = '49120000-0000-4000-8000-000000000003'),
  'published'::public.course_status, 'descriptive edits preserve live publication');
select lives_ok($$update public.courses set price_halalas = 1000, slug = 'detail-policy-live'
  where id = '49120000-0000-4000-8000-000000000003'$$, 'unchanged commercial fields are accepted');
select throws_ok($$update public.courses set price_halalas = 0
  where id = '49120000-0000-4000-8000-000000000003'$$,
  '42501', 'Course price and URL are locked after draft', 'published price change denied');
select throws_ok($$update public.courses set slug = 'live-url-bypass'
  where id = '49120000-0000-4000-8000-000000000003'$$,
  '42501', 'Course price and URL are locked after draft', 'published URL change denied');
select throws_ok($$update public.courses set status = 'draft'
  where id = '49120000-0000-4000-8000-000000000003'$$,
  '42501', 'Only administrators can return a published course to draft', 'direct-publish setting cannot bypass live restrictions');

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
with changed as (update public.courses set title = 'Other owner bypass'
  where id = '49120000-0000-4000-8000-000000000003' returning 1)
select is((select count(*) from changed), 0::bigint, 'other instructor cannot edit live course');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
with changed as (update public.courses set title = 'Learner bypass'
  where id = '49120000-0000-4000-8000-000000000003' returning 1)
select is((select count(*) from changed), 0::bigint, 'learner cannot edit live course');

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select public.admin_set_course_edit_permission('49120000-0000-4000-8000-000000000003', false);
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select throws_ok($$update public.courses set title = 'Revoked bypass'
  where id = '49120000-0000-4000-8000-000000000003'$$,
  '42501', 'Course details are locked in this state', 'revocation takes effect on next write');
select is((select title from public.courses where id = '49120000-0000-4000-8000-000000000003'),
  'Updated live', 'failed changes leave live data intact');
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select lives_ok($$update public.courses set title = 'Admin update', price_halalas = 3000
  where id = '49120000-0000-4000-8000-000000000003'$$, 'admin edits remain available regardless of opt-in');
select lives_ok($$update public.courses set status = 'draft'
  where id = '49120000-0000-4000-8000-000000000003'$$, 'admin may return live course to draft');
select lives_ok($$update public.courses set title = 'Admin archived update'
  where id = '49120000-0000-4000-8000-000000000004'$$, 'admin archived management remains available');
select * from finish();
rollback;
