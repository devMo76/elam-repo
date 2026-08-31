begin;

select plan(18);

set local role anon;

select is((select count(*) from public.profiles), 0::bigint, 'anon cannot read profiles');
select is((select count(*) from public.platform_settings), 0::bigint, 'anon cannot read settings');
select is((select count(*) from public.courses), 0::bigint, 'anon cannot read courses before policies exist');
select is((select count(*) from public.modules), 0::bigint, 'anon cannot read modules before policies exist');
select is((select count(*) from public.lessons), 0::bigint, 'anon cannot read lessons before policies exist');
select is((select count(*) from public.orders), 0::bigint, 'anon cannot read orders');
select is((select count(*) from public.enrollments), 0::bigint, 'anon cannot read enrolments');
select is((select count(*) from public.lesson_progress), 0::bigint, 'anon cannot read progress');
select is((select count(*) from public.admin_audit_log), 0::bigint, 'anon cannot read audit records');

reset role;
set local role authenticated;

select is((select count(*) from public.profiles), 0::bigint, 'authenticated users cannot read profiles before policies exist');
select is((select count(*) from public.platform_settings), 0::bigint, 'authenticated users cannot read settings before policies exist');
select is((select count(*) from public.courses), 0::bigint, 'authenticated users cannot read courses before policies exist');
select is((select count(*) from public.modules), 0::bigint, 'authenticated users cannot read modules before policies exist');
select is((select count(*) from public.lessons), 0::bigint, 'authenticated users cannot read lessons before policies exist');
select is((select count(*) from public.orders), 0::bigint, 'authenticated users cannot read orders before policies exist');
select is((select count(*) from public.enrollments), 0::bigint, 'authenticated users cannot read enrolments before policies exist');
select is((select count(*) from public.lesson_progress), 0::bigint, 'authenticated users cannot read progress before policies exist');
select is((select count(*) from public.admin_audit_log), 0::bigint, 'authenticated users cannot read audit records before policies exist');

reset role;
select * from finish();
rollback;
