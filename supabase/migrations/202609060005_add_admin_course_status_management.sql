-- Course lifecycle changes and their audit record commit as one transaction.
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
