-- Admin-only course list for review and lifecycle management.
create or replace function public.admin_course_review_queue(
  search_query text default null,
  filter_status public.course_status default null,
  page_size integer default 20,
  page_offset integer default 0
)
returns table (
  course_id uuid,
  course_slug text,
  course_code text,
  course_title text,
  course_status public.course_status,
  instructor_id uuid,
  instructor_name text,
  created_at timestamptz,
  published_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator role required';
  end if;

  if page_size < 1 or page_size > 100 or page_offset < 0 then
    raise exception using errcode = '22023', message = 'Invalid pagination';
  end if;

  return query
  select
    course.id,
    course.slug,
    course.course_code,
    course.title,
    course.status,
    instructor.id,
    instructor.full_name,
    course.created_at,
    course.published_at,
    count(*) over ()
  from public.courses as course
  join public.profiles as instructor on instructor.id = course.instructor_id
  where (filter_status is null or course.status = filter_status)
    and (
      nullif(btrim(search_query), '') is null
      or strpos(lower(course.title), lower(btrim(search_query))) > 0
      or strpos(lower(coalesce(course.course_code, '')), lower(btrim(search_query))) > 0
      or strpos(lower(course.slug), lower(btrim(search_query))) > 0
      or strpos(lower(instructor.full_name), lower(btrim(search_query))) > 0
    )
  order by course.created_at desc, course.id desc
  limit page_size
  offset page_offset;
end;
$$;

revoke all on function public.admin_course_review_queue(text, public.course_status, integer, integer) from public;
revoke all on function public.admin_course_review_queue(text, public.course_status, integer, integer) from anon, authenticated;
grant execute on function public.admin_course_review_queue(text, public.course_status, integer, integer) to authenticated;
