-- Keep drafting permissive while preventing unusable courses from entering
-- review. The owned draft is locked, checked, and conditionally transitioned
-- in one transaction so a stale client cannot bypass readiness.

drop function public.submit_course_for_review(uuid);

create function public.submit_course_for_review(target_course_id uuid)
returns table (
  course_id uuid,
  status public.course_status,
  blockers jsonb
)
language plpgsql
set search_path = ''
as $$
declare
  submitted_course public.courses;
  readiness_blockers jsonb := '[]'::jsonb;
  lesson_record record;
begin
  select course.*
  into submitted_course
  from public.courses as course
  where course.id = target_course_id
    and course.status = 'draft'
    and course.instructor_id = auth.uid()
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Only an owned draft course can be submitted for review';
  end if;

  if nullif(btrim(submitted_course.title), '') is null
    or submitted_course.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or submitted_course.price_halalas < 0 then
    readiness_blockers := readiness_blockers || jsonb_build_array(
      jsonb_build_object(
        'code', 'course_identity_invalid',
        'target', 'details'
      )
    );
  end if;

  if not exists (
    select 1
    from public.modules as module
    where module.course_id = target_course_id
  ) then
    readiness_blockers := readiness_blockers || jsonb_build_array(
      jsonb_build_object(
        'code', 'course_module_required',
        'target', 'curriculum'
      )
    );
  end if;

  if not exists (
    select 1
    from public.lessons as lesson
    join public.modules as module on module.id = lesson.module_id
    where module.course_id = target_course_id
  ) then
    readiness_blockers := readiness_blockers || jsonb_build_array(
      jsonb_build_object(
        'code', 'course_lesson_required',
        'target', 'curriculum'
      )
    );
  end if;

  for lesson_record in
    select lesson.id
    from public.lessons as lesson
    join public.modules as module on module.id = lesson.module_id
    where module.course_id = target_course_id
      and lesson.media_status <> 'ready'
    order by module.position, lesson.position, lesson.id
  loop
    readiness_blockers := readiness_blockers || jsonb_build_array(
      jsonb_build_object(
        'code', 'lesson_media_not_ready',
        'target', 'media',
        'entityId', lesson_record.id
      )
    );
  end loop;

  if jsonb_array_length(readiness_blockers) = 0 then
    update public.courses as course
    set status = 'in_review'
    where course.id = target_course_id
    returning course.* into submitted_course;
  end if;

  return query
  select
    submitted_course.id,
    submitted_course.status,
    readiness_blockers;
end;
$$;

revoke all on function public.submit_course_for_review(uuid) from public;
revoke all on function public.submit_course_for_review(uuid) from anon, authenticated;
grant execute on function public.submit_course_for_review(uuid) to authenticated;
