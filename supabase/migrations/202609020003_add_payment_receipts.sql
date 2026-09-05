-- Keep receipt delivery separate from the payment transaction. A provider or
-- email outage must never undo a paid order or its enrolment.

create type public.receipt_status as enum ('pending', 'sent', 'failed');

create table public.payment_receipts (
  order_id uuid primary key references public.orders (id),
  status public.receipt_status not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  provider_email_id text unique,
  sent_at timestamptz,
  last_error_code text check (
    last_error_code is null
    or (
      length(btrim(last_error_code)) > 0
      and length(last_error_code) <= 100
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_receipts_sent_state_check check (
    (status = 'sent' and provider_email_id is not null and sent_at is not null)
    or (status <> 'sent' and provider_email_id is null and sent_at is null)
  )
);

create index payment_receipts_retry_idx
  on public.payment_receipts (status, updated_at)
  where status <> 'sent';

alter table public.payment_receipts enable row level security;

revoke all privileges on table public.payment_receipts from anon, authenticated;

create trigger payment_receipts_set_updated_at
before update on public.payment_receipts
for each row execute function public.set_updated_at();

-- A short lease prevents the callback and webhook from sending at the same
-- time. Failed attempts can be claimed again by a later trusted request.
create or replace function public.claim_payment_receipt(target_order uuid)
returns table (
  should_send boolean,
  receipt_status public.receipt_status,
  attempt_count integer
)
language plpgsql
set search_path = ''
as $$
declare
  current_order_status public.order_status;
  receipt_record public.payment_receipts%rowtype;
begin
  select orders.status
  into current_order_status
  from public.orders
  where orders.id = target_order
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Order was not found';
  end if;

  if current_order_status <> 'paid' then
    raise exception using
      errcode = '55000',
      message = 'Only paid orders can receive a receipt';
  end if;

  insert into public.payment_receipts (order_id)
  values (target_order)
  on conflict (order_id) do nothing;

  select payment_receipts.*
  into receipt_record
  from public.payment_receipts
  where payment_receipts.order_id = target_order
  for update;

  if receipt_record.status = 'sent' then
    should_send := false;
    receipt_status := receipt_record.status;
    attempt_count := receipt_record.attempt_count;
    return next;
    return;
  end if;

  if receipt_record.status = 'pending'
    and receipt_record.last_attempt_at is not null
    and receipt_record.last_attempt_at > now() - interval '5 minutes' then
    should_send := false;
    receipt_status := receipt_record.status;
    attempt_count := receipt_record.attempt_count;
    return next;
    return;
  end if;

  update public.payment_receipts
  set
    status = 'pending',
    attempt_count = payment_receipts.attempt_count + 1,
    last_attempt_at = now(),
    last_error_code = null
  where order_id = target_order
  returning
    payment_receipts.status,
    payment_receipts.attempt_count
  into receipt_status, attempt_count;

  should_send := true;
  return next;
end;
$$;

revoke all on function public.claim_payment_receipt(uuid)
from public, anon, authenticated;
grant execute on function public.claim_payment_receipt(uuid)
to service_role;

create or replace function public.complete_payment_receipt(
  target_order uuid,
  email_id text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  receipt_record public.payment_receipts%rowtype;
begin
  if email_id is null or length(btrim(email_id)) = 0 then
    raise exception using
      errcode = '22023',
      message = 'Provider email identity is required';
  end if;

  select payment_receipts.*
  into receipt_record
  from public.payment_receipts
  where payment_receipts.order_id = target_order
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Receipt was not found';
  end if;

  if receipt_record.status = 'sent' then
    if receipt_record.provider_email_id <> btrim(email_id) then
      raise exception using
        errcode = '23514',
        message = 'Receipt provider identity is immutable';
    end if;

    return;
  end if;

  update public.payment_receipts
  set
    status = 'sent',
    provider_email_id = btrim(email_id),
    sent_at = now(),
    last_error_code = null
  where order_id = target_order;
end;
$$;

revoke all on function public.complete_payment_receipt(uuid, text)
from public, anon, authenticated;
grant execute on function public.complete_payment_receipt(uuid, text)
to service_role;

create or replace function public.record_payment_receipt_failure(
  target_order uuid,
  error_code text
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if error_code is null
    or length(btrim(error_code)) = 0
    or length(error_code) > 100 then
    raise exception using
      errcode = '22023',
      message = 'A safe receipt error code is required';
  end if;

  update public.payment_receipts
  set
    status = 'failed',
    last_error_code = btrim(error_code)
  where order_id = target_order
    and status <> 'sent';

  if not found and not exists (
    select 1
    from public.payment_receipts
    where payment_receipts.order_id = target_order
      and payment_receipts.status = 'sent'
  ) then
    raise exception using
      errcode = 'P0002',
      message = 'Receipt was not found';
  end if;
end;
$$;

revoke all on function public.record_payment_receipt_failure(uuid, text)
from public, anon, authenticated;
grant execute on function public.record_payment_receipt_failure(uuid, text)
to service_role;
