-- Counts-only instructor reporting. SECURITY DEFINER is required because
-- instructors must count enrolments without gaining access to learner rows.

create or replace function public.instructor_course_stats()
returns table (
  course_id uuid,
  course_title text,
  course_status public.course_status,
  enrollment_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    course.id,
    course.title,
    course.status,
    count(enrollment.id)::integer
  from public.courses as course
  left join public.enrollments as enrollment on enrollment.course_id = course.id
  where public.app_role() = 'instructor'
    and course.instructor_id = auth.uid()
  group by course.id, course.title, course.status
  order by course.created_at desc, course.id
$$;

revoke all on function public.instructor_course_stats() from public;
revoke all on function public.instructor_course_stats() from anon, authenticated;
grant execute on function public.instructor_course_stats() to authenticated;
