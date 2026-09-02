begin;

select plan(26);

select has_type('public', 'user_role', 'user_role enum exists');
select has_type('public', 'course_status', 'course_status enum exists');
select has_type('public', 'order_status', 'order_status enum exists');
select has_type('public', 'media_status', 'media_status enum exists');

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'platform_settings', 'platform_settings table exists');
select has_table('public', 'courses', 'courses table exists');
select has_table('public', 'modules', 'modules table exists');
select has_table('public', 'lessons', 'lessons table exists');
select has_table('public', 'orders', 'orders table exists');
select has_table('public', 'enrollments', 'enrollments table exists');
select has_table('public', 'lesson_progress', 'lesson_progress table exists');
select has_table('public', 'admin_audit_log', 'admin_audit_log table exists');

select is(
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'app_role'),
  1::bigint,
  'app_role helper exists'
);
select is(
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'is_admin'),
  1::bigint,
  'is_admin helper exists'
);
select is(
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'is_enrolled'),
  1::bigint,
  'is_enrolled helper exists'
);
select is(
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'enforce_course_initial_status'),
  1::bigint,
  'initial publication gate exists'
);
select is(
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'enforce_course_status_transition'),
  1::bigint,
  'publication transition function exists'
);
select is(
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'set_updated_at'),
  1::bigint,
  'updated-at helper exists'
);
select is(
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'reject_protected_record_deletion'),
  1::bigint,
  'protected-deletion helper exists'
);

select is(
  (
    select count(*)
    from pg_class
    where relnamespace = 'public'::regnamespace
      and relname in (
        'profiles',
        'platform_settings',
        'courses',
        'modules',
        'lessons',
        'orders',
        'enrollments',
        'lesson_progress',
        'admin_audit_log'
      )
      and relrowsecurity
  ),
  9::bigint,
  'RLS is enabled on every application table'
);

select is(
  (select count(*) from public.platform_settings),
  1::bigint,
  'there is exactly one platform settings row'
);
select is(
  (select instructor_direct_publish from public.platform_settings where id = 1),
  false,
  'instructor direct publishing is disabled by default'
);
select is(
  (
    select count(*)
    from pg_constraint
    where conname in ('modules_course_position_key', 'lessons_module_position_key')
      and condeferrable
      and condeferred
  ),
  2::bigint,
  'module and lesson position constraints are initially deferred'
);

select has_index('public', 'courses', 'courses_published_status_idx', 'published-course index exists');
select has_index('public', 'orders', 'orders_status_created_at_idx', 'order reporting index exists');

select * from finish();
rollback;
