-- A free course is still an explicit library item. Keep its enrolment grant in
-- the database so the browser cannot claim paid, draft, or archived courses.

create or replace function public.claim_free_course(target_course uuid)
returns table (
  course_id uuid,
  granted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using
      errcode = '28000',
      message = 'Sign-in is required to claim a free course';
  end if;

  if not exists (
    select 1
    from public.courses
    where id = target_course
      and status = 'published'
      and price_halalas = 0
  ) then
    raise exception using
      errcode = 'P0002',
      message = 'The free course is not available';
  end if;

  insert into public.enrollments (user_id, course_id)
  values (auth.uid(), target_course)
  on conflict (user_id, course_id) do nothing;

  return query
  select enrollments.course_id, enrollments.granted_at
  from public.enrollments
  where enrollments.user_id = auth.uid()
    and enrollments.course_id = target_course;
end;
$$;

revoke all on function public.claim_free_course(uuid) from public;
grant execute on function public.claim_free_course(uuid) to authenticated;
