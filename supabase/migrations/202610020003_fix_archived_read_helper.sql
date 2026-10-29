-- Use the existing security-definer entitlement helper inside read policies.
-- Direct enrollment subqueries caused anon course reads to fail with a table
-- permission error even when the archived branch was not relevant.
grant execute on function public.is_enrolled(uuid) to anon;

drop policy if exists courses_read_permitted on public.courses;
create policy courses_read_permitted on public.courses for select to anon, authenticated
using (
  status = 'published' or instructor_id = auth.uid() or public.is_admin()
  or (status = 'archived' and public.is_enrolled(id))
);

drop policy if exists modules_read_permitted on public.modules;
create policy modules_read_permitted on public.modules for select to anon, authenticated
using (exists (
  select 1 from public.courses c where c.id = modules.course_id
    and (c.status = 'published' or c.instructor_id = auth.uid() or public.is_admin()
      or (c.status = 'archived' and public.is_enrolled(c.id)))
));

drop policy if exists lessons_read_permitted on public.lessons;
create policy lessons_read_permitted on public.lessons for select to anon, authenticated
using (exists (
  select 1 from public.modules m join public.courses c on c.id = m.course_id
  where m.id = lessons.module_id
    and (c.status = 'published' or c.instructor_id = auth.uid() or public.is_admin()
      or (c.status = 'archived' and public.is_enrolled(c.id)))
));
