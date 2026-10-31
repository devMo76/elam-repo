-- Additions to live courses are private until an explicit, readiness-checked release.
alter table public.modules add column is_pending boolean not null default false;
alter table public.lessons add column is_pending boolean not null default false;

create function public.guard_instructor_curriculum_write()
returns trigger language plpgsql set search_path = '' as $$
declare
  parent_id uuid;
  course public.courses;
begin
  if tg_table_name = 'modules' then
    parent_id := case when tg_op = 'DELETE' then old.course_id else new.course_id end;
  else
    select course_id into parent_id from public.modules
    where id = case when tg_op = 'DELETE' then old.module_id else new.module_id end;
  end if;
  select * into course from public.courses where id = parent_id for update;
  if not found then raise exception using errcode = '42501', message = 'Course is not available for authoring'; end if;

  -- New live content is private even when inserted by an admin/trusted service.
  if tg_op = 'INSERT' then
    new.is_pending := course.status = 'published';
  end if;
  if auth.uid() is null or public.is_admin() then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if public.app_role() is distinct from 'instructor' or course.instructor_id <> auth.uid() then
    raise exception using errcode = '42501', message = 'Instructor course ownership required';
  end if;
  if course.status = 'draft' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if course.status <> 'published' or not course.instructor_published_edits_allowed then
    raise exception using errcode = '42501', message = 'Course curriculum is locked';
  end if;
  if tg_op = 'UPDATE' then
    -- Trusted release RPC runs as its owner. Browser users cannot set visibility.
    if new.is_pending is distinct from old.is_pending and current_user = 'authenticated' then
      raise exception using errcode = '42501', message = 'Use the release operation to publish additions';
    end if;
    if not old.is_pending and new is distinct from old then
      raise exception using errcode = '42501', message = 'Existing published curriculum is immutable';
    end if;
  elsif tg_op = 'DELETE' and not old.is_pending then
    raise exception using errcode = '42501', message = 'Existing published curriculum is immutable';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function public.guard_instructor_curriculum_write() from public;
create trigger modules_guard_authoring before insert or update or delete on public.modules
for each row execute function public.guard_instructor_curriculum_write();
create trigger lessons_guard_authoring before insert or update or delete on public.lessons
for each row execute function public.guard_instructor_curriculum_write();

create policy modules_hide_pending on public.modules as restrictive for select to anon, authenticated
using (not is_pending or public.is_admin() or exists (
  select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid()
));
create policy lessons_hide_pending on public.lessons as restrictive for select to anon, authenticated
using (not is_pending or public.is_admin() or exists (
  select 1 from public.modules m join public.courses c on c.id = m.course_id
  where m.id = module_id and c.instructor_id = auth.uid()
));

create or replace function public.can_access_lesson(target_lesson uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l
    join public.modules m on m.id = l.module_id join public.courses c on c.id = m.course_id
    where l.id = target_lesson and (
      (auth.uid() is not null and (c.instructor_id = auth.uid() or public.is_admin()))
      or (not l.is_pending and not m.is_pending and (
        (c.status = 'published' and l.is_free_preview)
        or (auth.uid() is not null and c.status in ('published', 'archived') and public.is_enrolled(c.id))
      ))
    )
  )
$$;

-- This security-definer aggregate must not bypass the new private boundary.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.get_learner_course_progress()'::regprocedure);
  if position('left join public.modules on modules.course_id = courses.id' in definition) = 0
    or position('left join public.lessons on lessons.module_id = modules.id' in definition) = 0 then
    raise exception 'Unexpected learner progress definition; review visibility migration';
  end if;
  definition := replace(definition, 'left join public.modules on modules.course_id = courses.id',
    'left join public.modules on modules.course_id = courses.id and not modules.is_pending');
  definition := replace(definition, 'left join public.lessons on lessons.module_id = modules.id',
    'left join public.lessons on lessons.module_id = modules.id and not lessons.is_pending');
  execute definition;
end;
$$;

create function public.release_course_additions(target_course_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare course public.courses; released_count integer;
begin
  select * into course from public.courses where id = target_course_id for update;
  if auth.uid() is null or not found or (not public.is_admin() and
    (public.app_role() is distinct from 'instructor' or course.instructor_id <> auth.uid()
      or not course.instructor_published_edits_allowed)) or course.status <> 'published' then
    raise exception using errcode = '42501', message = 'Course is not available for releasing additions';
  end if;
  if exists (select 1 from public.lessons l join public.modules m on m.id = l.module_id
    where m.course_id = target_course_id and l.is_pending
      and (l.media_status <> 'ready' or l.video_asset_id is null))
    or exists (select 1 from public.modules m where m.course_id = target_course_id and m.is_pending
      and not exists (select 1 from public.lessons l where l.module_id = m.id)) then
    raise exception using errcode = '23514', message = 'All additions must contain ready lessons before release';
  end if;
  -- Video readiness and row identity are preserved. Optional PDFs remain optional.
  update public.lessons l set is_pending = false from public.modules m
  where l.module_id = m.id and m.course_id = target_course_id and l.is_pending;
  get diagnostics released_count = row_count;
  update public.modules set is_pending = false where course_id = target_course_id and is_pending;
  if released_count > 0 then
    insert into public.admin_audit_log(actor_id, action, subject, detail)
    values (auth.uid(), 'course.additions.release', target_course_id::text,
      jsonb_build_object('lessonCount', released_count));
  end if;
  return released_count;
end;
$$;
revoke all on function public.release_course_additions(uuid) from public, anon;
grant execute on function public.release_course_additions(uuid) to authenticated;
