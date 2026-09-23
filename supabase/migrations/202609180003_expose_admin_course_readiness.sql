-- Give reviewers the same minimum publication signal used by instructors and
-- prevent an administrator from accidentally publishing incomplete content.

drop function if exists public.admin_course_review_queue(text, public.course_status, integer, integer);

create function public.admin_course_review_queue(
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
  module_count bigint,
  lesson_count bigint,
  unready_lesson_count bigint,
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
    curriculum.module_count,
    curriculum.lesson_count,
    curriculum.unready_lesson_count,
    count(*) over ()
  from public.courses as course
  join public.profiles as instructor on instructor.id = course.instructor_id
  cross join lateral (
    select
      count(distinct module.id)::bigint as module_count,
      count(lesson.id)::bigint as lesson_count,
      count(lesson.id) filter (where lesson.media_status <> 'ready')::bigint as unready_lesson_count
    from public.modules as module
    left join public.lessons as lesson on lesson.module_id = module.id
    where module.course_id = course.id
  ) as curriculum
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

create or replace function public.admin_change_course_status(
  target_course_id uuid,
  new_status public.course_status
)
returns public.courses
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  previous_status public.course_status;
  changed_course public.courses;
  module_count bigint;
  lesson_count bigint;
  unready_lesson_count bigint;
begin
  if actor_id is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator role required';
  end if;

  select status into previous_status
  from public.courses
  where id = target_course_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Course not found';
  end if;

  if previous_status = new_status then
    select * into changed_course from public.courses where id = target_course_id;
    return changed_course;
  end if;

  if previous_status = 'archived'
    or new_status = 'in_review'
    or not (
      (new_status = 'published' and previous_status in ('draft', 'in_review'))
      or (new_status = 'draft' and previous_status in ('in_review', 'published'))
      or (new_status = 'archived' and previous_status in ('draft', 'in_review', 'published'))
    ) then
    raise exception using errcode = '22023', message = 'Course status transition not permitted';
  end if;

  if new_status = 'published' then
    select
      count(distinct module.id),
      count(lesson.id),
      count(lesson.id) filter (where lesson.media_status <> 'ready')
    into module_count, lesson_count, unready_lesson_count
    from public.modules as module
    left join public.lessons as lesson on lesson.module_id = module.id
    where module.course_id = target_course_id;

    if module_count = 0 or lesson_count = 0 or unready_lesson_count > 0 then
      raise exception using errcode = '23514', message = 'Course is not ready for publication';
    end if;
  end if;

  update public.courses
  set status = new_status
  where id = target_course_id
  returning * into changed_course;

  insert into public.admin_audit_log (actor_id, action, subject, detail)
  values (
    actor_id,
    'course.status.change',
    target_course_id::text,
    jsonb_build_object('from', previous_status, 'to', new_status)
  );

  return changed_course;
end;
$$;

revoke all on function public.admin_change_course_status(uuid, public.course_status) from public;
revoke all on function public.admin_change_course_status(uuid, public.course_status) from anon, authenticated;
grant execute on function public.admin_change_course_status(uuid, public.course_status) to authenticated;
