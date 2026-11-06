-- One instructor-level authority; legacy course flags no longer authorize edits.
do $$
begin
  if exists (select 1 from public.courses where instructor_published_edits_allowed) then
    raise exception 'Review existing course edit grants before migrating instructor permissions';
  end if;
end;
$$;
alter table public.profiles add column instructor_published_updates_allowed boolean not null default false;

create function public.instructor_updates_enabled(target_instructor_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare allowed boolean;
begin
  -- Hold the permission row through the write transaction. Revocation serializes
  -- with every authoring/release operation that consults this helper.
  select instructor_published_updates_allowed into allowed from public.profiles
  where id = target_instructor_id and role = 'instructor' for share;
  return coalesce(allowed, false);
end;
$$;
revoke all on function public.instructor_updates_enabled(uuid) from public, anon;
grant execute on function public.instructor_updates_enabled(uuid) to authenticated, service_role;

create function public.protect_instructor_update_permission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.role <> 'instructor' then
    new.instructor_published_updates_allowed := false;
  end if;
  if (tg_op = 'INSERT' and new.instructor_published_updates_allowed) or
    (tg_op = 'UPDATE' and new.instructor_published_updates_allowed is distinct from old.instructor_published_updates_allowed) then
    if auth.uid() is null or not public.is_admin() then
      raise exception using errcode = '42501', message = 'Administrator role required';
    end if;
    if new.instructor_published_updates_allowed and new.role <> 'instructor' then
      raise exception using errcode = '22023', message = 'An instructor account is required';
    end if;
    insert into public.admin_audit_log(actor_id, action, subject, detail)
    values(auth.uid(), 'instructor.edit_permission.change', new.id::text,
      jsonb_build_object('from', case when tg_op = 'INSERT' then false else old.instructor_published_updates_allowed end,
        'to', new.instructor_published_updates_allowed));
  end if;
  return new;
end;
$$;
revoke all on function public.protect_instructor_update_permission() from public;
create trigger profiles_protect_instructor_update_permission before insert or update on public.profiles
for each row execute function public.protect_instructor_update_permission();

create function public.admin_set_instructor_edit_permission(target_instructor_id uuid, allow_edits boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator role required';
  end if;
  if allow_edits is null then
    raise exception using errcode = '22023', message = 'Edit permission must be true or false';
  end if;
  perform 1 from public.profiles where id = target_instructor_id and role = 'instructor' for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Instructor not found';
  end if;
  update public.profiles set instructor_published_updates_allowed = allow_edits where id = target_instructor_id;
  return allow_edits;
end;
$$;
revoke all on function public.admin_set_instructor_edit_permission(uuid, boolean) from public, anon;
grant execute on function public.admin_set_instructor_edit_permission(uuid, boolean) to authenticated;

-- Preserve the reviewed final guard/RPC definitions from previous migrations,
-- changing only the permission source. Fail on an unexpected unmapped consumer.
do $$
declare item record; definition text;
begin
  for item in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.prosrc like '%.instructor_published_edits_allowed%'
      and p.proname not in ('protect_published_course_edit_permission', 'admin_set_course_edit_permission')
  loop
    definition := pg_get_functiondef(item.oid);
    -- The media guard's record must now carry instructor identity, not the old flag.
    definition := replace(definition, 'select c.status, c.instructor_published_edits_allowed, l.is_pending',
      'select c.status, c.instructor_id, l.is_pending');
    definition := replace(definition, 'course.instructor_published_edits_allowed', 'public.instructor_updates_enabled(course.instructor_id)');
    definition := replace(definition, 'old.instructor_published_edits_allowed', 'public.instructor_updates_enabled(old.instructor_id)');
    definition := replace(definition, 'c.instructor_published_edits_allowed', 'public.instructor_updates_enabled(c.instructor_id)');
    if definition like '%.instructor_published_edits_allowed%' then raise exception 'Unmapped course permission consumer'; end if;
    execute definition;
  end loop;
  for item in select p.polname, c.relname, pg_get_expr(p.polqual, p.polrelid) as expression
    from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and pg_get_expr(p.polqual, p.polrelid) like '%instructor_published_edits_allowed%'
  loop
    definition := replace(item.expression, 'c.instructor_published_edits_allowed', 'public.instructor_updates_enabled(c.instructor_id)');
    if definition like '%instructor_published_edits_allowed%' then raise exception 'Unmapped permission policy'; end if;
    execute format('alter policy %I on public.%I using (%s)', item.polname, item.relname, definition);
  end loop;
end;
$$;

-- Keep the old signature for a clear error to stale clients, never a hidden
-- course-level override. The legacy column remains inert for rollback history.
create or replace function public.admin_set_course_edit_permission(target_course_id uuid, allow_edits boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator role required';
  end if;
  raise exception using errcode = '22023', message = 'Manage published updates on the instructor account',
    detail = format('Retired course permission request: course=%s, allow_edits=%s', target_course_id, allow_edits);
end;
$$;
