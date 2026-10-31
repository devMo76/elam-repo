-- Scope: course details only. Curriculum and service-role media enforcement
-- follow separately; published additions remain disabled until visibility exists.
create function public.enforce_instructor_course_detail_edits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Trusted seed/maintenance/service writes retain their existing path. Browser
  -- writes still require row privileges/RLS and a real instructor or admin actor.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if public.app_role() is distinct from 'instructor' or old.instructor_id <> auth.uid() then
    raise exception using errcode = '42501', message = 'Instructor course ownership required';
  end if;

  -- Only known authoring fields are mutable. Status/timestamps and the permission
  -- flag have their own existing protected triggers; do not duplicate their rules.
  if (to_jsonb(new) - array['department', 'course_code', 'title', 'subtitle',
      'description', 'cover_url', 'price_halalas', 'slug', 'status', 'published_at',
      'instructor_published_edits_allowed']) is distinct from
     (to_jsonb(old) - array['department', 'course_code', 'title', 'subtitle',
      'description', 'cover_url', 'price_halalas', 'slug', 'status', 'published_at',
      'instructor_published_edits_allowed']) then
    raise exception using errcode = '42501', message = 'Course identity fields are immutable for instructors';
  end if;

  -- Otherwise an instructor could unpublish, edit destructively as a draft, then
  -- republish. Admin unpublishing remains available through its existing path.
  if old.status = 'published' and new.status = 'draft' then
    raise exception using errcode = '42501', message = 'Only administrators can return a published course to draft';
  end if;

  if old.status <> 'draft' and
    (new.slug is distinct from old.slug or new.price_halalas is distinct from old.price_halalas) then
    raise exception using errcode = '42501', message = 'Course price and URL are locked after draft';
  end if;

  if row(new.department, new.course_code, new.title, new.subtitle, new.description, new.cover_url)
    is distinct from row(old.department, old.course_code, old.title, old.subtitle, old.description, old.cover_url)
    and not (old.status = 'draft' or
      (old.status = 'published' and old.instructor_published_edits_allowed)) then
    raise exception using errcode = '42501', message = 'Course details are locked in this state';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_instructor_course_detail_edits() from public;
create trigger courses_enforce_instructor_detail_edits
before update on public.courses
for each row execute function public.enforce_instructor_course_detail_edits();
