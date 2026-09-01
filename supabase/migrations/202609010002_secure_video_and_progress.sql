-- Media state is provider-controlled. Browser clients may author lesson
-- metadata, but cannot forge provider identifiers, durations, or readiness.

create unique index lessons_video_asset_id_key
  on public.lessons (video_asset_id)
  where video_asset_id is not null;

revoke insert, update on table public.lessons from authenticated;

grant insert (module_id, title, position, is_free_preview)
on table public.lessons to authenticated;

grant update (module_id, title, position, is_free_preview)
on table public.lessons to authenticated;

-- Optimistic revisions make delayed or concurrent progress writes explicit
-- instead of allowing an older request to silently overwrite newer progress.

alter table public.lesson_progress
add column revision bigint not null default 0 check (revision >= 0);

revoke insert, update, delete on table public.lesson_progress from authenticated;

create or replace function public.can_access_lesson(target_lesson uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lessons
    join public.modules on modules.id = lessons.module_id
    join public.courses on courses.id = modules.course_id
    where lessons.id = target_lesson
      and (
        (courses.status = 'published' and lessons.is_free_preview)
        or (
          auth.uid() is not null
          and (
            courses.instructor_id = auth.uid()
            or public.is_admin()
            or (
              courses.status in ('published', 'archived')
              and public.is_enrolled(courses.id)
            )
          )
        )
      )
  )
$$;

revoke all on function public.can_access_lesson(uuid) from public;

create or replace function public.get_lesson_playback_access(target_lesson uuid)
returns table (
  video_asset_id text,
  duration_seconds integer,
  media_status public.media_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select lessons.video_asset_id, lessons.duration_seconds, lessons.media_status
  from public.lessons
  where lessons.id = target_lesson
    and public.can_access_lesson(lessons.id)
$$;

revoke all on function public.get_lesson_playback_access(uuid) from public;
grant execute on function public.get_lesson_playback_access(uuid)
to anon, authenticated;

create or replace function public.record_lesson_progress(
  target_lesson uuid,
  target_position_seconds integer,
  expected_revision bigint,
  mark_complete boolean default false
)
returns table (
  position_seconds integer,
  completed_at timestamptz,
  revision bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  lesson_duration integer;
  lesson_media_status public.media_status;
  existing_progress public.lesson_progress%rowtype;
  should_complete boolean;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Sign-in is required';
  end if;

  if target_position_seconds < 0 or expected_revision < 0 then
    raise exception using errcode = '22023', message = 'Invalid progress value';
  end if;

  if not public.can_access_lesson(target_lesson) then
    raise exception using errcode = '42501', message = 'Lesson access denied';
  end if;

  select lessons.duration_seconds, lessons.media_status
  into lesson_duration, lesson_media_status
  from public.lessons
  where lessons.id = target_lesson;

  if lesson_media_status <> 'ready' or lesson_duration is null then
    raise exception using errcode = '55000', message = 'Lesson media is not ready';
  end if;

  if target_position_seconds > lesson_duration + 5 then
    raise exception using errcode = '22023', message = 'Position exceeds lesson duration';
  end if;

  target_position_seconds := least(target_position_seconds, lesson_duration);
  should_complete := mark_complete
    or (
      lesson_duration > 0
      and target_position_seconds::numeric / lesson_duration >= 0.90
    );

  select *
  into existing_progress
  from public.lesson_progress
  where user_id = actor_id and lesson_id = target_lesson
  for update;

  if not found then
    if expected_revision <> 0 then
      raise exception using errcode = '40001', message = 'Progress revision conflict';
    end if;

    insert into public.lesson_progress (
      user_id,
      lesson_id,
      last_position_seconds,
      completed_at,
      revision
    ) values (
      actor_id,
      target_lesson,
      target_position_seconds,
      case when should_complete then now() else null end,
      1
    )
    returning
      last_position_seconds,
      lesson_progress.completed_at,
      lesson_progress.revision
    into position_seconds, completed_at, revision;

    return next;
    return;
  end if;

  -- An identical retry of the immediately previous write is idempotent.
  if existing_progress.revision = expected_revision + 1
    and existing_progress.last_position_seconds = target_position_seconds
    and (not mark_complete or existing_progress.completed_at is not null) then
    position_seconds := existing_progress.last_position_seconds;
    completed_at := existing_progress.completed_at;
    revision := existing_progress.revision;
    return next;
    return;
  end if;

  if existing_progress.revision <> expected_revision then
    raise exception using errcode = '40001', message = 'Progress revision conflict';
  end if;

  update public.lesson_progress
  set
    last_position_seconds = target_position_seconds,
    completed_at = case
      when existing_progress.completed_at is not null then existing_progress.completed_at
      when should_complete then now()
      else null
    end,
    revision = existing_progress.revision + 1
  where user_id = actor_id and lesson_id = target_lesson
  returning
    last_position_seconds,
    lesson_progress.completed_at,
    lesson_progress.revision
  into position_seconds, completed_at, revision;

  return next;
end;
$$;

revoke all on function public.record_lesson_progress(uuid, integer, bigint, boolean)
from public;
grant execute on function public.record_lesson_progress(uuid, integer, bigint, boolean)
to authenticated;

create or replace function public.get_learner_course_progress()
returns table (
  course_id uuid,
  slug text,
  title text,
  cover_url text,
  status public.course_status,
  lesson_count bigint,
  completed_lesson_count bigint,
  completion_percentage integer,
  last_activity_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    courses.id,
    courses.slug,
    courses.title,
    courses.cover_url,
    courses.status,
    count(lessons.id),
    count(lesson_progress.lesson_id) filter (
      where lesson_progress.completed_at is not null
    ),
    coalesce(
      round(
        100.0
        * count(lesson_progress.lesson_id) filter (
            where lesson_progress.completed_at is not null
          )
        / nullif(count(lessons.id), 0)
      )::integer,
      0
    ),
    max(lesson_progress.updated_at)
  from public.enrollments
  join public.courses on courses.id = enrollments.course_id
  left join public.modules on modules.course_id = courses.id
  left join public.lessons on lessons.module_id = modules.id
  left join public.lesson_progress
    on lesson_progress.lesson_id = lessons.id
    and lesson_progress.user_id = auth.uid()
  where enrollments.user_id = auth.uid()
    and (enrollments.expires_at is null or enrollments.expires_at > now())
    and courses.status in ('published', 'archived')
  group by courses.id
  order by max(lesson_progress.updated_at) desc nulls last, courses.title
$$;

revoke all on function public.get_learner_course_progress() from public;
grant execute on function public.get_learner_course_progress() to authenticated;
