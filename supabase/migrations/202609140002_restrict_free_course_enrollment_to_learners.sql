-- The free-course RPC is callable by authenticated browser sessions. Enforce
-- the application role inside the security-definer boundary as well as in the
-- Next.js route, so an instructor or administrator cannot bypass the route.

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
    from public.profiles
    where id = auth.uid()
      and role = 'learner'
  ) then
    raise exception using
      errcode = '42501',
      message = 'A learner account is required to claim a free course';
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
