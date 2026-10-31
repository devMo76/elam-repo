-- Permission storage only. Authoring enforcement and pending-content visibility
-- ship in later steps; this flag must not yet unlock arbitrary live writes.
alter table public.courses
  add column instructor_published_edits_allowed boolean not null default false;

create function public.protect_published_course_edit_permission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.instructor_published_edits_allowed and not public.is_admin() then
      raise exception using errcode = '42501', message = 'Administrator role required';
    end if;
  elsif new.instructor_published_edits_allowed is distinct from old.instructor_published_edits_allowed then
    if auth.uid() is null or not public.is_admin() then
      raise exception using errcode = '42501', message = 'Administrator role required';
    end if;
    insert into public.admin_audit_log (actor_id, action, subject, detail)
    values (auth.uid(), 'course.edit_permission.change', new.id::text,
      jsonb_build_object('from', old.instructor_published_edits_allowed,
        'to', new.instructor_published_edits_allowed));
  end if;
  return new;
end;
$$;

revoke all on function public.protect_published_course_edit_permission() from public;
create trigger courses_protect_published_edit_permission
before insert or update on public.courses
for each row execute function public.protect_published_course_edit_permission();

create function public.admin_set_course_edit_permission(target_course_id uuid, allow_edits boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator role required';
  end if;
  if allow_edits is null then
    raise exception using errcode = '22023', message = 'Edit permission must be true or false';
  end if;
  update public.courses set instructor_published_edits_allowed = allow_edits
  where id = target_course_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Course not found';
  end if;
  return allow_edits;
end;
$$;

revoke all on function public.admin_set_course_edit_permission(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_course_edit_permission(uuid, boolean) to authenticated;
