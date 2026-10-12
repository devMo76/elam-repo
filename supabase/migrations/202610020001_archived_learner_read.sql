-- Existing, unexpired enrolments retain curriculum read access after archival.
-- Catalogue queries continue to filter explicitly to published courses.
drop policy if exists courses_read_permitted on public.courses;
create policy courses_read_permitted on public.courses for select to anon, authenticated
using (
  status = 'published' or instructor_id = auth.uid() or public.is_admin()
  or (status = 'archived' and exists (
    select 1 from public.enrollments e
    where e.course_id = courses.id and e.user_id = auth.uid()
      and (e.expires_at is null or e.expires_at > now())
  ))
);

drop policy if exists modules_read_permitted on public.modules;
create policy modules_read_permitted on public.modules for select to anon, authenticated
using (exists (
  select 1 from public.courses c where c.id = modules.course_id
    and (c.status = 'published' or c.instructor_id = auth.uid() or public.is_admin()
      or (c.status = 'archived' and exists (
        select 1 from public.enrollments e
        where e.course_id = c.id and e.user_id = auth.uid()
          and (e.expires_at is null or e.expires_at > now())
      )))
));

drop policy if exists lessons_read_permitted on public.lessons;
create policy lessons_read_permitted on public.lessons for select to anon, authenticated
using (exists (
  select 1 from public.modules m join public.courses c on c.id = m.course_id
  where m.id = lessons.module_id
    and (c.status = 'published' or c.instructor_id = auth.uid() or public.is_admin()
      or (c.status = 'archived' and exists (
        select 1 from public.enrollments e
        where e.course_id = c.id and e.user_id = auth.uid()
          and (e.expires_at is null or e.expires_at > now())
      )))
));
