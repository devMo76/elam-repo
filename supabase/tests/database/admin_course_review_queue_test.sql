begin;
select plan(8);

update public.profiles
set full_name = 'Instructor Search Fixture'
where id = '20000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok($$select * from public.admin_course_review_queue()$$, '42501', 'Administrator role required', 'learners cannot list admin courses');

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select throws_ok($$select * from public.admin_course_review_queue()$$, '42501', 'Administrator role required', 'instructors cannot list admin courses');

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.admin_course_review_queue()), 9::bigint, 'admins can list every course');
select is((select count(*) from public.admin_course_review_queue(filter_status => 'in_review')), 1::bigint, 'review status filtering works');
select is((select count(*) from public.admin_course_review_queue(search_query => 'Instructor Search Fixture')), 5::bigint, 'instructor search works');
select is((select count(*) from public.admin_course_review_queue(search_query => 'EE301')), 1::bigint, 'course-code search works');
select is((select total_count from public.admin_course_review_queue(page_size => 1)), 9::bigint, 'pagination preserves total count');
select throws_ok($$select * from public.admin_course_review_queue(page_size => 101)$$, '22023', 'Invalid pagination', 'oversized pages are rejected');

reset role;
select * from finish();
rollback;
