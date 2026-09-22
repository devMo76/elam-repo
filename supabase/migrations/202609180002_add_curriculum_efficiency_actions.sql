-- Atomic efficiency actions for long instructor curricula. New lessons never
-- inherit provider-controlled video fields from their source.

create or replace function public.append_module_lessons(
  target_module_id uuid,
  lesson_titles text[]
)
returns setof public.lessons
language plpgsql
set search_path = ''
as $$
declare
  next_position integer;
  supplied_count integer := coalesce(cardinality(lesson_titles), 0);
begin
  if supplied_count < 1 or supplied_count > 50
    or exists (
      select 1
      from unnest(coalesce(lesson_titles, array[]::text[])) as supplied(title)
      where nullif(btrim(supplied.title), '') is null
        or length(btrim(supplied.title)) > 160
    ) then
    raise exception using
      errcode = '22023',
      message = 'Provide between 1 and 50 valid lesson titles';
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

  return query
  insert into public.lessons (module_id, title, position)
  select
    target_module_id,
    btrim(supplied.title),
    next_position + supplied.ordinality::integer - 1
  from unnest(lesson_titles) with ordinality as supplied(title, ordinality)
  returning *;
end;
$$;

create or replace function public.duplicate_module_lesson(target_lesson_id uuid)
returns public.lessons
language plpgsql
set search_path = ''
as $$
declare
  source_lesson public.lessons%rowtype;
  created_lesson public.lessons;
begin
  select lesson.*
  into source_lesson
  from public.lessons as lesson
  join public.modules as module on module.id = lesson.module_id
  join public.courses as course on course.id = module.course_id
  where lesson.id = target_lesson_id
    and course.status <> 'archived'
    and (course.instructor_id = auth.uid() or public.is_admin())
  for update of module;

  if not found then
    raise exception using errcode = '42501', message = 'Lesson is not available for authoring';
  end if;

  update public.lessons
  set position = position + 1
  where module_id = source_lesson.module_id
    and position > source_lesson.position;

  insert into public.lessons (
    module_id,
    title,
    position,
    is_free_preview
  ) values (
    source_lesson.module_id,
    left(source_lesson.title, 152) || ' (نسخة)',
    source_lesson.position + 1,
    source_lesson.is_free_preview
  )
  returning * into created_lesson;

  return created_lesson;
end;
$$;

revoke all on function public.append_module_lessons(uuid, text[]) from public, anon;
revoke all on function public.duplicate_module_lesson(uuid) from public, anon;
grant execute on function public.append_module_lessons(uuid, text[]) to authenticated;
grant execute on function public.duplicate_module_lesson(uuid) to authenticated;
