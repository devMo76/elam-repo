-- Transaction-safe instructor authoring primitives. These functions run with
-- the caller's privileges so the existing RLS policies remain authoritative.

create or replace function public.append_course_module(
  target_course_id uuid,
  module_title text
)
returns public.modules
language plpgsql
set search_path = ''
as $$
declare
  next_position integer;
  created_module public.modules;
begin
  if nullif(btrim(module_title), '') is null then
    raise exception using errcode = '22023', message = 'Module title is required';
  end if;

  perform 1
  from public.courses
  where id = target_course_id
    and status <> 'archived'
    and (instructor_id = auth.uid() or public.is_admin())
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Course is not available for authoring';
  end if;

  select coalesce(max(position), 0) + 1
  into next_position
  from public.modules
  where course_id = target_course_id;

  insert into public.modules (course_id, title, position)
  values (target_course_id, btrim(module_title), next_position)
  returning * into created_module;

  return created_module;
end;
$$;

create or replace function public.reorder_course_modules(
  target_course_id uuid,
  ordered_module_ids uuid[]
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  existing_count integer;
  supplied_count integer := coalesce(cardinality(ordered_module_ids), 0);
  distinct_count integer;
begin
  perform 1
  from public.courses
  where id = target_course_id
    and status <> 'archived'
    and (instructor_id = auth.uid() or public.is_admin())
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Course is not available for authoring';
  end if;

  select count(*) into existing_count
  from public.modules
  where course_id = target_course_id;

  select count(distinct module_id) into distinct_count
  from unnest(coalesce(ordered_module_ids, array[]::uuid[])) as supplied(module_id);

  if supplied_count <> existing_count
    or distinct_count <> supplied_count
    or exists (
      select 1
      from unnest(coalesce(ordered_module_ids, array[]::uuid[])) as supplied(module_id)
      where not exists (
        select 1 from public.modules
        where id = supplied.module_id and course_id = target_course_id
      )
    ) then
    raise exception using errcode = '22023', message = 'Module order must contain every course module exactly once';
  end if;

  update public.modules as module
  set position = supplied.new_position::integer
  from unnest(coalesce(ordered_module_ids, array[]::uuid[])) with ordinality
    as supplied(module_id, new_position)
  where module.id = supplied.module_id
    and module.course_id = target_course_id;
end;
$$;

create or replace function public.delete_draft_course_module(target_module_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  parent_course_id uuid;
  removed_position integer;
begin
  select module.course_id, module.position
  into parent_course_id, removed_position
  from public.modules as module
  join public.courses as course on course.id = module.course_id
  where module.id = target_module_id
    and course.status = 'draft'
    and (course.instructor_id = auth.uid() or public.is_admin())
  for update of course;

  if not found then
    raise exception using errcode = '42501', message = 'Only modules in an editable draft course can be deleted';
  end if;

  delete from public.modules where id = target_module_id;

  update public.modules
  set position = position - 1
  where course_id = parent_course_id
    and position > removed_position;
end;
$$;

create or replace function public.append_module_lesson(
  target_module_id uuid,
  lesson_title text
)
returns public.lessons
language plpgsql
set search_path = ''
as $$
declare
  next_position integer;
  created_lesson public.lessons;
begin
  if nullif(btrim(lesson_title), '') is null then
    raise exception using errcode = '22023', message = 'Lesson title is required';
  end if;

  perform 1
  from public.modules as module
  join public.courses as course on course.id = module.course_id
  where module.id = target_module_id
    and course.status <> 'archived'
    and (course.instructor_id = auth.uid() or public.is_admin())
  for update of module;

  if not found then
    raise exception using errcode = '42501', message = 'Module is not available for authoring';
  end if;

  select coalesce(max(position), 0) + 1
  into next_position
  from public.lessons
  where module_id = target_module_id;

  insert into public.lessons (module_id, title, position)
  values (target_module_id, btrim(lesson_title), next_position)
  returning * into created_lesson;

  return created_lesson;
end;
$$;

create or replace function public.reorder_module_lessons(
  target_module_id uuid,
  ordered_lesson_ids uuid[]
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  existing_count integer;
  supplied_count integer := coalesce(cardinality(ordered_lesson_ids), 0);
  distinct_count integer;
begin
  perform 1
  from public.modules as module
  join public.courses as course on course.id = module.course_id
  where module.id = target_module_id
    and course.status <> 'archived'
    and (course.instructor_id = auth.uid() or public.is_admin())
  for update of module;

  if not found then
    raise exception using errcode = '42501', message = 'Module is not available for authoring';
  end if;

  select count(*) into existing_count
  from public.lessons
  where module_id = target_module_id;

  select count(distinct lesson_id) into distinct_count
  from unnest(coalesce(ordered_lesson_ids, array[]::uuid[])) as supplied(lesson_id);

  if supplied_count <> existing_count
    or distinct_count <> supplied_count
    or exists (
      select 1
      from unnest(coalesce(ordered_lesson_ids, array[]::uuid[])) as supplied(lesson_id)
      where not exists (
        select 1 from public.lessons
        where id = supplied.lesson_id and module_id = target_module_id
      )
    ) then
    raise exception using errcode = '22023', message = 'Lesson order must contain every module lesson exactly once';
  end if;

  update public.lessons as lesson
  set position = supplied.new_position::integer
  from unnest(coalesce(ordered_lesson_ids, array[]::uuid[])) with ordinality
    as supplied(lesson_id, new_position)
  where lesson.id = supplied.lesson_id
    and lesson.module_id = target_module_id;
end;
$$;

create or replace function public.delete_draft_module_lesson(target_lesson_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  parent_module_id uuid;
  removed_position integer;
begin
  select lesson.module_id, lesson.position
  into parent_module_id, removed_position
  from public.lessons as lesson
  join public.modules as module on module.id = lesson.module_id
  join public.courses as course on course.id = module.course_id
  where lesson.id = target_lesson_id
    and course.status = 'draft'
    and (course.instructor_id = auth.uid() or public.is_admin())
  for update of module;

  if not found then
    raise exception using errcode = '42501', message = 'Only lessons in an editable draft course can be deleted';
  end if;

  delete from public.lessons where id = target_lesson_id;

  update public.lessons
  set position = position - 1
  where module_id = parent_module_id
    and position > removed_position;
end;
$$;

create or replace function public.submit_course_for_review(target_course_id uuid)
returns public.courses
language plpgsql
set search_path = ''
as $$
declare
  submitted_course public.courses;
begin
  update public.courses
  set status = 'in_review'
  where id = target_course_id
    and status = 'draft'
    and instructor_id = auth.uid()
  returning * into submitted_course;

  if not found then
    raise exception using errcode = '42501', message = 'Only an owned draft course can be submitted for review';
  end if;

  return submitted_course;
end;
$$;

-- Direct table deletion must follow the same paid-content protection as the
-- trusted functions. Only draft course structure can be removed.
drop policy module_owners_or_admins_delete on public.modules;
create policy module_owners_or_admins_delete_drafts
on public.modules
for delete
to authenticated
using (
  exists (
    select 1
    from public.courses
    where courses.id = modules.course_id
      and courses.status = 'draft'
      and (courses.instructor_id = auth.uid() or public.is_admin())
  )
);

drop policy lesson_owners_or_admins_delete on public.lessons;
create policy lesson_owners_or_admins_delete_drafts
on public.lessons
for delete
to authenticated
using (
  exists (
    select 1
    from public.modules
    join public.courses on courses.id = modules.course_id
    where modules.id = lessons.module_id
      and courses.status = 'draft'
      and (courses.instructor_id = auth.uid() or public.is_admin())
  )
);

revoke all on function public.append_course_module(uuid, text) from public;
revoke all on function public.reorder_course_modules(uuid, uuid[]) from public;
revoke all on function public.delete_draft_course_module(uuid) from public;
revoke all on function public.append_module_lesson(uuid, text) from public;
revoke all on function public.reorder_module_lessons(uuid, uuid[]) from public;
revoke all on function public.delete_draft_module_lesson(uuid) from public;
revoke all on function public.submit_course_for_review(uuid) from public;

revoke all on function public.append_course_module(uuid, text) from anon, authenticated;
revoke all on function public.reorder_course_modules(uuid, uuid[]) from anon, authenticated;
revoke all on function public.delete_draft_course_module(uuid) from anon, authenticated;
revoke all on function public.append_module_lesson(uuid, text) from anon, authenticated;
revoke all on function public.reorder_module_lessons(uuid, uuid[]) from anon, authenticated;
revoke all on function public.delete_draft_module_lesson(uuid) from anon, authenticated;
revoke all on function public.submit_course_for_review(uuid) from anon, authenticated;

grant execute on function public.append_course_module(uuid, text) to authenticated;
grant execute on function public.reorder_course_modules(uuid, uuid[]) to authenticated;
grant execute on function public.delete_draft_course_module(uuid) to authenticated;
grant execute on function public.append_module_lesson(uuid, text) to authenticated;
grant execute on function public.reorder_module_lessons(uuid, uuid[]) to authenticated;
grant execute on function public.delete_draft_module_lesson(uuid) to authenticated;
grant execute on function public.submit_course_for_review(uuid) to authenticated;
