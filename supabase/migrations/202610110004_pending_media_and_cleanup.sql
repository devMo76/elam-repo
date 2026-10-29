-- Synthetic seeds and maintenance sessions may install already-live curricula.
-- Browser authoring inserts on published courses must always remain pending.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.guard_instructor_curriculum_write()'::regprocedure);
  definition := replace(definition, 'if tg_op = ''INSERT'' then',
    'if tg_op = ''INSERT'' and auth.uid() is not null then');
  execute definition;
end;
$$;

-- Trusted upload writes still need an atomic course-state check. Provider updates
-- to the same video ID (encoding readiness/duration) remain permitted after release.
create function public.guard_lesson_media_binding()
returns trigger language plpgsql set search_path = '' as $$
declare course record; target_id uuid;
begin
  if current_user in ('postgres', 'supabase_admin') then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_table_name = 'lessons' then
    if new.video_asset_id is not distinct from old.video_asset_id then return new; end if;
    target_id := new.id;
  else
    target_id := case when tg_op = 'DELETE' then old.lesson_id else new.lesson_id end;
  end if;
  select c.status, c.instructor_published_edits_allowed, l.is_pending into course from public.lessons l
  join public.modules m on m.id = l.module_id join public.courses c on c.id = m.course_id
  where l.id = target_id for update of c;
  if not found or not (course.status = 'draft' or
    (course.status = 'published' and course.is_pending and course.instructor_published_edits_allowed)) then
    raise exception using errcode = '42501', message = 'Existing live media cannot be replaced or removed';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function public.guard_lesson_media_binding() from public;
create trigger lessons_guard_media_binding before update of video_asset_id on public.lessons
for each row execute function public.guard_lesson_media_binding();
create trigger resources_guard_media_binding before insert or update or delete on public.lesson_resources
for each row execute function public.guard_lesson_media_binding();

drop policy module_owners_or_admins_delete_drafts on public.modules;
create policy module_owners_or_admins_delete_drafts on public.modules for delete to authenticated
using (exists (select 1 from public.courses c where c.id = course_id
  and (c.instructor_id = auth.uid() or public.is_admin())
  and (c.status = 'draft' or (c.status = 'published' and is_pending
    and (c.instructor_published_edits_allowed or public.is_admin())))));
drop policy lesson_owners_or_admins_delete_drafts on public.lessons;
create policy lesson_owners_or_admins_delete_drafts on public.lessons for delete to authenticated
using (exists (select 1 from public.modules m join public.courses c on c.id = m.course_id
  where m.id = module_id and (c.instructor_id = auth.uid() or public.is_admin())
    and (c.status = 'draft' or (c.status = 'published' and lessons.is_pending
      and (c.instructor_published_edits_allowed or public.is_admin())))));
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.delete_draft_course_module(uuid)'::regprocedure);
  definition := replace(definition, 'and course.status = ''draft''',
    'and (course.status = ''draft'' or (course.status = ''published'' and module.is_pending and (course.instructor_published_edits_allowed or public.is_admin())))');
  execute definition;
  definition := pg_get_functiondef('public.delete_draft_module_lesson(uuid)'::regprocedure);
  definition := replace(definition, 'and course.status = ''draft''',
    'and (course.status = ''draft'' or (course.status = ''published'' and lesson.is_pending and (course.instructor_published_edits_allowed or public.is_admin())))');
  execute definition;
end;
$$;
