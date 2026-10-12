-- Cascaded child deletion must inherit the already-checked parent delete. Row
-- identities and pending visibility are never browser-editable, including drafts.
create or replace function public.guard_instructor_curriculum_write()
returns trigger language plpgsql set search_path = '' as $$
declare parent_id uuid; course public.courses;
begin
  if tg_op = 'DELETE' and current_user in ('postgres', 'supabase_admin') and auth.uid() is null then return old; end if;
  if tg_op = 'UPDATE' and auth.uid() is not null then
    if new.id is distinct from old.id then
      raise exception using errcode='42501', message='Curriculum identity is immutable';
    end if;
    if new.is_pending is distinct from old.is_pending and current_user='authenticated' then
      raise exception using errcode='42501', message='Use the release operation to publish additions';
    end if;
  end if;
  if tg_table_name='modules' then
    parent_id := case when tg_op='DELETE' then old.course_id else new.course_id end;
  else
    select course_id into parent_id from public.modules
    where id=case when tg_op='DELETE' then old.module_id else new.module_id end;
    -- The module DELETE already passed this trigger and RLS. No direct lesson
    -- delete can reach this case: its FK guarantees that its parent exists.
    if tg_op='DELETE' and parent_id is null and pg_trigger_depth()>1 then return old; end if;
  end if;
  select * into course from public.courses where id=parent_id for update;
  if not found then raise exception using errcode='42501', message='Course is not available for authoring'; end if;
  if tg_op='INSERT' and auth.uid() is not null then new.is_pending := course.status='published'; end if;
  if auth.uid() is null or public.is_admin() then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if public.app_role() is distinct from 'instructor' or course.instructor_id<>auth.uid() then
    raise exception using errcode='42501', message='Instructor course ownership required';
  end if;
  if course.status='draft' then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if course.status<>'published' or not course.instructor_published_edits_allowed then
    raise exception using errcode='42501', message='Course curriculum is locked';
  end if;
  if tg_op='UPDATE' and not old.is_pending and new is distinct from old then
    raise exception using errcode='42501', message='Existing published curriculum is immutable';
  elsif tg_op='DELETE' and not old.is_pending then
    raise exception using errcode='42501', message='Existing published curriculum is immutable';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;
