-- Complete browser-facing privileges, row-level policies, and audited
-- administrative controls. Service-role payment and enrolment writes remain
-- intentionally outside these policies.

revoke all privileges on table public.profiles from anon, authenticated;
revoke all privileges on table public.platform_settings from anon, authenticated;
revoke all privileges on table public.courses from anon, authenticated;
revoke all privileges on table public.modules from anon, authenticated;
revoke all privileges on table public.lessons from anon, authenticated;
revoke all privileges on table public.orders from anon, authenticated;
revoke all privileges on table public.enrollments from anon, authenticated;
revoke all privileges on table public.lesson_progress from anon, authenticated;
revoke all privileges on table public.admin_audit_log from anon, authenticated;

grant select on table public.profiles to anon, authenticated;
grant update (avatar_url, headline, bio) on table public.profiles to authenticated;

grant select on table public.platform_settings to authenticated;
grant update on table public.platform_settings to authenticated;

grant select on table public.courses to anon, authenticated;
grant insert, update on table public.courses to authenticated;

grant select on table public.modules, public.lessons to anon, authenticated;
grant insert, update, delete on table public.modules, public.lessons to authenticated;

grant select on table public.orders, public.enrollments to authenticated;
grant select, insert, update, delete on table public.lesson_progress to authenticated;
grant select on table public.admin_audit_log to authenticated;

create policy profiles_read_permitted
on public.profiles
for select
to anon, authenticated
using (
  role = 'instructor'
  or id = auth.uid()
  or public.is_admin()
);

create policy instructors_update_public_profile_fields
on public.profiles
for update
to authenticated
using (
  (id = auth.uid() and public.app_role() = 'instructor')
  or public.is_admin()
)
with check (
  (id = auth.uid() and public.app_role() = 'instructor')
  or public.is_admin()
);

create policy authenticated_read_settings
on public.platform_settings
for select
to authenticated
using (true);

create policy admins_update_settings
on public.platform_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy courses_read_permitted
on public.courses
for select
to anon, authenticated
using (
  status = 'published'
  or instructor_id = auth.uid()
  or public.is_admin()
);

create policy course_authors_insert_own_courses
on public.courses
for insert
to authenticated
with check (
  public.app_role() in ('instructor', 'admin')
  and instructor_id = auth.uid()
);

create policy course_owners_or_admins_update
on public.courses
for update
to authenticated
using (instructor_id = auth.uid() or public.is_admin())
with check (instructor_id = auth.uid() or public.is_admin());

create policy modules_read_permitted
on public.modules
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.courses
    where courses.id = modules.course_id
      and (
        courses.status = 'published'
        or courses.instructor_id = auth.uid()
        or public.is_admin()
      )
  )
);

create policy module_owners_or_admins_insert
on public.modules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.courses
    where courses.id = modules.course_id
      and (courses.instructor_id = auth.uid() or public.is_admin())
  )
);

create policy module_owners_or_admins_update
on public.modules
for update
to authenticated
using (
  exists (
    select 1
    from public.courses
    where courses.id = modules.course_id
      and (courses.instructor_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.courses
    where courses.id = modules.course_id
      and (courses.instructor_id = auth.uid() or public.is_admin())
  )
);

create policy module_owners_or_admins_delete
on public.modules
for delete
to authenticated
using (
  exists (
    select 1
    from public.courses
    where courses.id = modules.course_id
      and (courses.instructor_id = auth.uid() or public.is_admin())
  )
);

create policy lessons_read_permitted
on public.lessons
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.modules
    join public.courses on courses.id = modules.course_id
    where modules.id = lessons.module_id
      and (
        courses.status = 'published'
        or courses.instructor_id = auth.uid()
        or public.is_admin()
      )
  )
);

create policy lesson_owners_or_admins_insert
on public.lessons
for insert
to authenticated
with check (
  exists (
    select 1
    from public.modules
    join public.courses on courses.id = modules.course_id
    where modules.id = lessons.module_id
      and (courses.instructor_id = auth.uid() or public.is_admin())
  )
);

create policy lesson_owners_or_admins_update
on public.lessons
for update
to authenticated
using (
  exists (
    select 1
    from public.modules
    join public.courses on courses.id = modules.course_id
    where modules.id = lessons.module_id
      and (courses.instructor_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.modules
    join public.courses on courses.id = modules.course_id
    where modules.id = lessons.module_id
      and (courses.instructor_id = auth.uid() or public.is_admin())
  )
);

create policy lesson_owners_or_admins_delete
on public.lessons
for delete
to authenticated
using (
  exists (
    select 1
    from public.modules
    join public.courses on courses.id = modules.course_id
    where modules.id = lessons.module_id
      and (courses.instructor_id = auth.uid() or public.is_admin())
  )
);

create policy users_or_admins_read_orders
on public.orders
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy users_or_admins_read_enrollments
on public.enrollments
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy users_manage_own_progress
on public.lesson_progress
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy admins_read_audit_log
on public.admin_audit_log
for select
to authenticated
using (public.is_admin());

-- Role changes must pass through the audited RPC below. The only exception is
-- a direct database session used for the one-time first-admin bootstrap.

create or replace function public.protect_profile_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
    and coalesce(current_setting('elam.role_change_authorized', true), '') <> 'true'
    and session_user not in ('postgres', 'supabase_admin') then
    raise exception using
      errcode = '42501',
      message = 'Profile roles can only be changed through the audited admin operation';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_role_change() from public;

create trigger profiles_protect_role_change
before update of role on public.profiles
for each row execute function public.protect_profile_role_change();

create or replace function public.admin_change_user_role(
  target_user_id uuid,
  new_role public.user_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  previous_role public.user_role;
begin
  if actor_id is null or not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Administrator role required';
  end if;

  if target_user_id = actor_id then
    raise exception using
      errcode = '22023',
      message = 'Administrators cannot change their own role';
  end if;

  select role
  into previous_role
  from public.profiles
  where id = target_user_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Target profile not found';
  end if;

  if previous_role = new_role then
    return;
  end if;

  perform set_config('elam.role_change_authorized', 'true', true);

  update public.profiles
  set role = new_role
  where id = target_user_id;

  perform set_config('elam.role_change_authorized', '', true);

  insert into public.admin_audit_log (actor_id, action, subject, detail)
  values (
    actor_id,
    'role.change',
    target_user_id::text,
    jsonb_build_object('from', previous_role, 'to', new_role)
  );
end;
$$;

revoke all on function public.admin_change_user_role(uuid, public.user_role) from public;
grant execute on function public.admin_change_user_role(uuid, public.user_role) to authenticated;

-- Settings updates are authorized and audited in the database so direct REST
-- requests receive the same result as the application route.

create or replace function public.authorize_and_audit_settings_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    if session_user not in ('postgres', 'supabase_admin') then
      raise exception using
        errcode = '42501',
        message = 'Administrator session required to update platform settings';
    end if;
  elsif not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Administrator role required';
  end if;

  new.updated_by = actor_id;

  if new.instructor_direct_publish is distinct from old.instructor_direct_publish
    and actor_id is not null then
    insert into public.admin_audit_log (actor_id, action, subject, detail)
    values (
      actor_id,
      'settings.update',
      'platform_settings:1',
      jsonb_build_object(
        'instructor_direct_publish',
        jsonb_build_object(
          'from', old.instructor_direct_publish,
          'to', new.instructor_direct_publish
        )
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function public.authorize_and_audit_settings_update() from public;

create trigger platform_settings_authorize_and_audit
before update on public.platform_settings
for each row execute function public.authorize_and_audit_settings_update();
