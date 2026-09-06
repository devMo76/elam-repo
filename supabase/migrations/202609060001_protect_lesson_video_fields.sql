-- Video provider identifiers and processing state are controlled only by the
-- trusted upload and webhook services, never by browser sessions.

grant update (title, is_free_preview) on table public.lessons to authenticated;

create or replace function public.protect_lesson_video_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null
    and (
      new.video_asset_id is distinct from old.video_asset_id
      or new.duration_seconds is distinct from old.duration_seconds
      or new.media_status is distinct from old.media_status
    ) then
    raise exception using
      errcode = '42501',
      message = 'Lesson video fields are managed by the video service';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_lesson_video_fields() from public;

create trigger lessons_protect_video_fields
before update of video_asset_id, duration_seconds, media_status on public.lessons
for each row execute function public.protect_lesson_video_fields();

-- Moving existing children between parents can create duplicate or broken
-- positions. The supported operation is explicit creation and ordering.
create or replace function public.reject_module_reparent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.course_id is distinct from old.course_id then
    raise exception using errcode = '23514', message = 'Modules cannot be moved between courses';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_module_reparent() from public;

create trigger modules_reject_reparent
before update of course_id on public.modules
for each row execute function public.reject_module_reparent();

create or replace function public.reject_lesson_reparent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.module_id is distinct from old.module_id then
    raise exception using errcode = '23514', message = 'Lessons cannot be moved between modules';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_lesson_reparent() from public;

create trigger lessons_reject_reparent
before update of module_id on public.lessons
for each row execute function public.reject_lesson_reparent();
