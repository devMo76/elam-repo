-- Every Supabase Auth identity receives one application profile. The role is
-- always learner at creation time; user-supplied metadata cannot elevate it.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  supplied_full_name text := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');
begin
  if supplied_full_name is null then
    raise exception using
      errcode = '23514',
      message = 'A non-empty full name is required to create a profile';
  end if;

  insert into public.profiles (id, full_name, role)
  values (new.id, supplied_full_name, 'learner');

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

create trigger auth_user_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();
