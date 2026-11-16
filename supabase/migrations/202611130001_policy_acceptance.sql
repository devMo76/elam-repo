-- Never backfill acceptance: existing users must make an affirmative choice.
create function public.current_policy_version()
returns text language sql immutable set search_path = ''
as $$ select '2026-11-13.1'::text $$;

create table public.policy_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  source text not null check (source in ('registration', 'existing_account')),
  primary key (user_id, policy_version)
);
alter table public.policy_acceptances enable row level security;
revoke all on public.policy_acceptances from anon, authenticated;
grant select on public.policy_acceptances to authenticated;
create policy "Users read their own policy acceptance"
on public.policy_acceptances for select to authenticated
using (user_id = (select auth.uid()));

create function public.has_current_policy_acceptance()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.policy_acceptances
    where user_id = (select auth.uid())
      and policy_version = public.current_policy_version()
  )
$$;

create function public.accept_current_policy(requested_version text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if requested_version is distinct from public.current_policy_version() then
    raise exception 'Policy version is outdated' using errcode = '22023';
  end if;
  insert into public.policy_acceptances(user_id, policy_version, source)
  values (auth.uid(), requested_version, 'existing_account')
  on conflict (user_id, policy_version) do nothing;
end;
$$;

create function public.record_signup_policy_acceptance()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- Only an explicit choice made at creation time counts. Later metadata edits
  -- cannot add, remove or overwrite acceptance records.
  if new.raw_user_meta_data #> '{policy_acceptance,accepted}' = 'true'::jsonb
    and new.raw_user_meta_data #>> '{policy_acceptance,version}' = public.current_policy_version() then
    insert into public.policy_acceptances(user_id, policy_version, source)
    values (new.id, public.current_policy_version(), 'registration');
  end if;
  return new;
end;
$$;
create trigger auth_user_record_policy_acceptance
after insert on auth.users for each row
execute function public.record_signup_policy_acceptance();

revoke all on function public.current_policy_version() from public, anon;
revoke all on function public.has_current_policy_acceptance() from public, anon;
revoke all on function public.accept_current_policy(text) from public, anon;
revoke all on function public.record_signup_policy_acceptance() from public, anon, authenticated;
grant execute on function public.current_policy_version() to authenticated;
grant execute on function public.has_current_policy_acceptance() to authenticated;
grant execute on function public.accept_current_policy(text) to authenticated;
