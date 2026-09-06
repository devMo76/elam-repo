-- Archived courses remain available to existing learners but are read-only for
-- instructors. Enforce this in RLS so direct REST calls cannot bypass the API.

drop policy course_owners_or_admins_update on public.courses;
create policy course_owners_or_admins_update
on public.courses
for update
to authenticated
using (
  public.is_admin()
  or (instructor_id = auth.uid() and status <> 'archived')
)
with check (
  public.is_admin()
  or (instructor_id = auth.uid() and status <> 'archived')
);

drop policy module_owners_or_admins_insert on public.modules;
create policy module_owners_or_admins_insert
on public.modules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.courses
    where courses.id = modules.course_id
      and (
        public.is_admin()
        or (courses.instructor_id = auth.uid() and courses.status <> 'archived')
      )
  )
);

drop policy module_owners_or_admins_update on public.modules;
create policy module_owners_or_admins_update
on public.modules
for update
to authenticated
using (
  exists (
    select 1
    from public.courses
    where courses.id = modules.course_id
      and (
        public.is_admin()
        or (courses.instructor_id = auth.uid() and courses.status <> 'archived')
      )
  )
)
with check (
  exists (
    select 1
    from public.courses
    where courses.id = modules.course_id
      and (
        public.is_admin()
        or (courses.instructor_id = auth.uid() and courses.status <> 'archived')
      )
  )
);

drop policy lesson_owners_or_admins_insert on public.lessons;
create policy lesson_owners_or_admins_insert
on public.lessons
for insert
to authenticated
with check (
  exists (
    select 1
    from public.modules
    join public.courses on courses.id = modules.course_id
    where modules.id = lessons.module_id
      and (
        public.is_admin()
        or (courses.instructor_id = auth.uid() and courses.status <> 'archived')
      )
  )
);

drop policy lesson_owners_or_admins_update on public.lessons;
create policy lesson_owners_or_admins_update
on public.lessons
for update
to authenticated
using (
  exists (
    select 1
    from public.modules
    join public.courses on courses.id = modules.course_id
    where modules.id = lessons.module_id
      and (
        public.is_admin()
        or (courses.instructor_id = auth.uid() and courses.status <> 'archived')
      )
  )
)
with check (
  exists (
    select 1
    from public.modules
    join public.courses on courses.id = modules.course_id
    where modules.id = lessons.module_id
      and (
        public.is_admin()
        or (courses.instructor_id = auth.uid() and courses.status <> 'archived')
      )
  )
);
