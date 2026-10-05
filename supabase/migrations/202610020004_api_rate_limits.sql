-- Shared request limits survive Vercel function instances and restarts.
-- Only server-side service-role code can consume or prune buckets.
create table public.api_rate_limit_buckets (
  action text not null check (action ~ '^[a-z_.]{1,60}$'),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  hits integer not null check (hits > 0),
  primary key (action, key_hash, window_start)
);
create index api_rate_limit_buckets_window_idx on public.api_rate_limit_buckets (window_start);
alter table public.api_rate_limit_buckets enable row level security;
revoke all on public.api_rate_limit_buckets from anon, authenticated;

create function public.consume_api_rate_limit(
  target_action text,
  target_key_hash text,
  target_window_seconds integer,
  target_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  bucket_start timestamptz;
  current_hits integer;
begin
  if target_action !~ '^[a-z_.]{1,60}$'
    or target_key_hash !~ '^[0-9a-f]{64}$'
    or target_window_seconds not between 30 and 3600
    or target_limit not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Invalid rate-limit configuration';
  end if;

  bucket_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / target_window_seconds) * target_window_seconds
  );
  insert into public.api_rate_limit_buckets (action, key_hash, window_start, hits)
  values (target_action, target_key_hash, bucket_start, 1)
  on conflict (action, key_hash, window_start)
  do update set hits = public.api_rate_limit_buckets.hits + 1
  returning hits into current_hits;

  return current_hits <= target_limit;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;

create function public.prune_api_rate_limits()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare removed bigint;
begin
  delete from public.api_rate_limit_buckets where window_start < now() - interval '2 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.prune_api_rate_limits() from public, anon, authenticated;
grant execute on function public.prune_api_rate_limits() to service_role;
