create type public.webhook_provider as enum ('moyasar', 'bunny');
create type public.webhook_delivery_status as enum ('received', 'completed', 'failed');

create table public.webhook_deliveries (
  id bigint generated always as identity primary key,
  provider public.webhook_provider not null,
  event_key text not null check (char_length(event_key) between 1 and 200),
  event_type text not null check (char_length(event_type) between 1 and 100),
  resource_id text check (resource_id is null or char_length(resource_id) <= 200),
  status public.webhook_delivery_status not null default 'received',
  attempt_count integer not null default 1 check (attempt_count > 0),
  request_id text check (request_id is null or char_length(request_id) <= 100),
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 100),
  first_received_at timestamptz not null default now(),
  last_received_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (provider, event_key)
);

create index webhook_deliveries_status_received_idx
  on public.webhook_deliveries (status, last_received_at desc);

alter table public.webhook_deliveries enable row level security;

create policy "Admins can inspect webhook deliveries"
  on public.webhook_deliveries for select to authenticated
  using (public.is_admin());

create or replace function public.begin_webhook_delivery(
  target_provider public.webhook_provider,
  target_event_key text,
  target_event_type text,
  target_resource_id text,
  target_request_id text
)
returns table (delivery_id bigint, delivery_attempt_count integer)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;

  return query
  insert into public.webhook_deliveries as delivery
    (provider, event_key, event_type, resource_id, request_id)
  values
    (target_provider, target_event_key, target_event_type, target_resource_id, target_request_id)
  on conflict (provider, event_key) do update set
    event_type = excluded.event_type,
    resource_id = excluded.resource_id,
    request_id = excluded.request_id,
    status = 'received',
    attempt_count = delivery.attempt_count + 1,
    last_error_code = null,
    last_received_at = now(),
    completed_at = null
  returning delivery.id, delivery.attempt_count;
end; $$;

create or replace function public.finish_webhook_delivery(
  target_delivery_id bigint,
  target_status public.webhook_delivery_status,
  target_error_code text default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;
  if target_status not in ('completed', 'failed') then
    raise exception using errcode = '22023', message = 'Invalid final webhook status';
  end if;

  update public.webhook_deliveries set
    status = target_status,
    last_error_code = case when target_status = 'failed' then target_error_code else null end,
    completed_at = case when target_status = 'completed' then now() else null end
  where id = target_delivery_id;
end; $$;

revoke all on table public.webhook_deliveries from public, anon, authenticated;
grant select on table public.webhook_deliveries to authenticated;
revoke all on function public.begin_webhook_delivery(public.webhook_provider, text, text, text, text) from public;
revoke all on function public.finish_webhook_delivery(bigint, public.webhook_delivery_status, text) from public;
grant execute on function public.begin_webhook_delivery(public.webhook_provider, text, text, text, text) to service_role;
grant execute on function public.finish_webhook_delivery(bigint, public.webhook_delivery_status, text) to service_role;
