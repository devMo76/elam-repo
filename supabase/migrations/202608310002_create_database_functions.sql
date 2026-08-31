-- Security helpers used by RLS policies and trusted server-side operations.

create or replace function public.app_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.app_role() = 'admin', false)
$$;

create or replace function public.is_enrolled(target_course uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments
    where user_id = auth.uid()
      and course_id = target_course
      and (expires_at is null or expires_at > now())
  )
$$;

revoke all on function public.app_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_enrolled(uuid) from public;

grant execute on function public.app_role() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_enrolled(uuid) to authenticated;

-- Keep timestamps trustworthy instead of relying on every caller to update them.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

create trigger platform_settings_set_updated_at
before update on public.platform_settings
for each row execute function public.set_updated_at();

create trigger lesson_progress_set_updated_at
before update on public.lesson_progress
for each row execute function public.set_updated_at();

-- Enforce course publication at the data layer. UI checks alone are bypassable.

create or replace function public.enforce_course_initial_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.user_role := public.app_role();
  direct_publish_enabled boolean;
begin
  if new.status = 'draft' then
    new.published_at = null;
    return new;
  end if;

  -- Migrations and trusted service-role operations have no end-user identity.
  if auth.uid() is null then
    if new.status = 'published' and new.published_at is null then
      new.published_at = now();
    end if;

    return new;
  end if;

  if actor = 'admin' then
    if new.status = 'published' then
      new.published_at = now();
    else
      new.published_at = null;
    end if;

    return new;
  end if;

  if actor = 'instructor'
    and new.instructor_id = auth.uid()
    and new.status = 'published' then
    select instructor_direct_publish
    into direct_publish_enabled
    from public.platform_settings
    where id = 1;

    if direct_publish_enabled then
      new.published_at = now();
      return new;
    end if;
  end if;

  raise exception using
    errcode = '42501',
    message = 'Initial course status not permitted';
end;
$$;

revoke all on function public.enforce_course_initial_status() from public;

create trigger course_initial_status
before insert on public.courses
for each row execute function public.enforce_course_initial_status();

create or replace function public.enforce_course_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.user_role := public.app_role();
  direct_publish_enabled boolean;
begin
  if new.status is not distinct from old.status then
    new.published_at = old.published_at;
    return new;
  end if;

  if actor = 'admin' then
    null;
  elsif actor = 'instructor' and old.instructor_id = auth.uid() then
    select instructor_direct_publish
    into direct_publish_enabled
    from public.platform_settings
    where id = 1;

    if (old.status = 'draft' and new.status = 'in_review')
      or (old.status = 'in_review' and new.status = 'draft') then
      null;
    elsif direct_publish_enabled
      and old.status in ('draft', 'in_review')
      and new.status = 'published' then
      null;
    elsif direct_publish_enabled
      and old.status = 'published'
      and new.status = 'draft' then
      null;
    else
      raise exception using
        errcode = '42501',
        message = 'Course status transition not permitted';
    end if;
  else
    raise exception using
      errcode = '42501',
      message = 'Course status change not permitted';
  end if;

  if new.status = 'published' and old.published_at is null then
    new.published_at = now();
  else
    new.published_at = old.published_at;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_course_status_transition() from public;

create trigger course_status_transition
before update of status, published_at on public.courses
for each row execute function public.enforce_course_status_transition();

-- Courses are archived, purchase records are retained, and enrolments grant
-- lifetime access in v1. These records must not be physically deleted.

create or replace function public.reject_protected_record_deletion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '23514',
    message = format('Deleting records from %I.%I is prohibited', tg_table_schema, tg_table_name);
end;
$$;

revoke all on function public.reject_protected_record_deletion() from public;

create trigger courses_reject_delete
before delete on public.courses
for each row execute function public.reject_protected_record_deletion();

create trigger orders_reject_delete
before delete on public.orders
for each row execute function public.reject_protected_record_deletion();

create trigger enrollments_reject_delete
before delete on public.enrollments
for each row execute function public.reject_protected_record_deletion();

create trigger platform_settings_reject_delete
before delete on public.platform_settings
for each row execute function public.reject_protected_record_deletion();

create or replace function public.reject_audit_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '23514',
    message = 'Administrative audit records are append-only';
end;
$$;

revoke all on function public.reject_audit_log_mutation() from public;

create trigger admin_audit_log_reject_update_or_delete
before update or delete on public.admin_audit_log
for each row execute function public.reject_audit_log_mutation();
