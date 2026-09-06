create or replace function public.admin_user_directory(
  search_query text default null,
  filter_role public.user_role default null,
  page_size integer default 20,
  page_offset integer default 0
)
returns table (user_id uuid, full_name text, email text, user_role public.user_role, created_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception using errcode = '42501', message = 'Administrator role required'; end if;
  if page_size < 1 or page_size > 100 or page_offset < 0 then raise exception using errcode = '22023', message = 'Invalid pagination'; end if;
  return query
  select profile.id, profile.full_name, account.email::text, profile.role, profile.created_at, count(*) over ()
  from public.profiles profile join auth.users account on account.id = profile.id
  where (filter_role is null or profile.role = filter_role)
    and (nullif(btrim(search_query), '') is null
      or strpos(lower(profile.full_name), lower(btrim(search_query))) > 0
      or strpos(lower(coalesce(account.email, '')), lower(btrim(search_query))) > 0)
  order by profile.created_at desc, profile.id desc limit page_size offset page_offset;
end; $$;

create or replace function public.admin_audit_history(
  filter_action text default null,
  page_size integer default 20,
  page_offset integer default 0
)
returns table (audit_id bigint, actor_id uuid, actor_name text, action text, subject text, detail jsonb, created_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception using errcode = '42501', message = 'Administrator role required'; end if;
  if page_size < 1 or page_size > 100 or page_offset < 0 then raise exception using errcode = '22023', message = 'Invalid pagination'; end if;
  return query
  select audit.id, audit.actor_id, actor.full_name, audit.action, audit.subject, audit.detail, audit.created_at, count(*) over ()
  from public.admin_audit_log audit left join public.profiles actor on actor.id = audit.actor_id
  where filter_action is null or audit.action = filter_action
  order by audit.created_at desc, audit.id desc limit page_size offset page_offset;
end; $$;

revoke all on function public.admin_user_directory(text, public.user_role, integer, integer) from public;
revoke all on function public.admin_audit_history(text, integer, integer) from public;
grant execute on function public.admin_user_directory(text, public.user_role, integer, integer) to authenticated;
grant execute on function public.admin_audit_history(text, integer, integer) to authenticated;
