-- Establish the database boundary for payment creation and confirmation.
-- Provider calls remain outside Postgres; only server-verified values reach
-- these service-role-only functions.

alter table public.orders
  add column reversed_at timestamptz;

alter table public.orders
  add constraint orders_status_timestamps_check check (
    (status <> 'paid' or paid_at is not null)
    and (status <> 'refunded' or refunded_at is not null)
    and (status <> 'reversed' or reversed_at is not null)
  );

create unique index orders_one_active_purchase_idx
  on public.orders (user_id, course_id)
  where status in ('pending', 'paid');

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique
    check (length(btrim(provider_event_id)) > 0),
  order_id uuid not null references public.orders (id),
  payment_id text not null
    check (length(btrim(payment_id)) > 0),
  event_type text not null
    check (length(btrim(event_type)) > 0),
  provider_status text not null
    check (length(btrim(provider_status)) > 0),
  raw_payload jsonb not null
    check (jsonb_typeof(raw_payload) = 'object'),
  received_at timestamptz not null default now()
);

create index payment_events_order_received_idx
  on public.payment_events (order_id, received_at desc);

alter table public.payment_events enable row level security;

revoke all privileges on table public.payment_events from anon, authenticated;

-- Provider payloads and internal failure details are not safe for browser
-- access. Learners and administrators receive only the order fields needed by
-- their browser sessions; later admin APIs use the server-only client.
revoke select on table public.orders from authenticated;
grant select (
  id,
  user_id,
  course_id,
  amount_halalas,
  currency,
  status,
  created_at,
  paid_at,
  refunded_at,
  reversed_at
) on table public.orders to authenticated;

create or replace function public.enforce_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.course_id is distinct from old.course_id
    or new.amount_halalas is distinct from old.amount_halalas
    or new.currency is distinct from old.currency
    or new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '23514',
      message = 'Order identity and price fields are immutable';
  end if;

  if old.moyasar_payment_id is not null
    and new.moyasar_payment_id is distinct from old.moyasar_payment_id then
    raise exception using
      errcode = '23514',
      message = 'Order payment identity is immutable';
  end if;

  if old.paid_at is not null and new.paid_at is distinct from old.paid_at then
    raise exception using
      errcode = '23514',
      message = 'Order payment timestamp is immutable';
  end if;

  if old.refunded_at is not null
    and new.refunded_at is distinct from old.refunded_at then
    raise exception using
      errcode = '23514',
      message = 'Order refund timestamp is immutable';
  end if;

  if old.reversed_at is not null
    and new.reversed_at is distinct from old.reversed_at then
    raise exception using
      errcode = '23514',
      message = 'Order reversal timestamp is immutable';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'pending' and new.status in ('paid', 'failed', 'refunded', 'reversed'))
    or (old.status = 'paid' and new.status in ('refunded', 'reversed'))
  ) then
    raise exception using
      errcode = '23514',
      message = 'Order status transition is not permitted';
  end if;

  if new.status = 'paid' and new.paid_at is null then
    raise exception using
      errcode = '23514',
      message = 'Paid orders require a payment timestamp';
  end if;

  if new.status = 'refunded' and new.refunded_at is null then
    raise exception using
      errcode = '23514',
      message = 'Refunded orders require a refund timestamp';
  end if;

  if new.status = 'reversed' and new.reversed_at is null then
    raise exception using
      errcode = '23514',
      message = 'Reversed orders require a reversal timestamp';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_order_update() from public;

create trigger orders_enforce_update
before update on public.orders
for each row execute function public.enforce_order_update();

create or replace function public.reject_payment_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '23514',
    message = 'Payment events are append-only';
end;
$$;

revoke all on function public.reject_payment_event_mutation() from public;

create trigger payment_events_reject_update
before update on public.payment_events
for each row execute function public.reject_payment_event_mutation();

create trigger payment_events_reject_delete
before delete on public.payment_events
for each row execute function public.reject_payment_event_mutation();

create or replace function public.create_pending_order(
  target_user uuid,
  target_course uuid
)
returns table (
  order_id uuid,
  amount_halalas integer,
  currency text,
  order_status public.order_status
)
language plpgsql
set search_path = ''
as $$
declare
  course_amount integer;
  course_currency text;
  existing_order public.orders%rowtype;
begin
  select courses.price_halalas, courses.currency::text
  into course_amount, course_currency
  from public.courses
  where courses.id = target_course
    and courses.status = 'published'
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Course is not available for purchase';
  end if;

  if exists (
    select 1
    from public.enrollments
    where enrollments.user_id = target_user
      and enrollments.course_id = target_course
      and (enrollments.expires_at is null or enrollments.expires_at > now())
  ) then
    raise exception using
      errcode = '23505',
      message = 'Learner is already enrolled';
  end if;

  select orders.*
  into existing_order
  from public.orders
  where orders.user_id = target_user
    and orders.course_id = target_course
    and orders.status in ('pending', 'paid')
  order by orders.created_at desc
  limit 1;

  if found then
    if existing_order.status = 'paid' then
      raise exception using
        errcode = '23505',
        message = 'Learner already owns this course';
    end if;

    order_id := existing_order.id;
    amount_halalas := existing_order.amount_halalas;
    currency := existing_order.currency::text;
    order_status := existing_order.status;
    return next;
    return;
  end if;

  begin
    insert into public.orders (
      user_id,
      course_id,
      amount_halalas,
      currency
    ) values (
      target_user,
      target_course,
      course_amount,
      course_currency
    )
    returning orders.* into existing_order;
  exception
    when unique_violation then
      select orders.*
      into existing_order
      from public.orders
      where orders.user_id = target_user
        and orders.course_id = target_course
        and orders.status in ('pending', 'paid')
      order by orders.created_at desc
      limit 1;

      if not found then
        raise;
      end if;

      if existing_order.status = 'paid' then
        raise exception using
          errcode = '23505',
          message = 'Learner already owns this course';
      end if;
  end;

  order_id := existing_order.id;
  amount_halalas := existing_order.amount_halalas;
  currency := existing_order.currency::text;
  order_status := existing_order.status;
  return next;
end;
$$;

revoke all on function public.create_pending_order(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.create_pending_order(uuid, uuid)
to service_role;

create or replace function public.process_verified_moyasar_payment(
  target_order uuid,
  provider_event_id text,
  provider_payment_id text,
  event_type text,
  provider_status text,
  provider_amount integer,
  provider_currency text,
  provider_order_id uuid,
  provider_payload jsonb,
  failure_detail text
)
returns table (
  order_status public.order_status,
  enrollment_id uuid,
  state_changed boolean
)
language plpgsql
set search_path = ''
as $$
declare
  locked_order public.orders%rowtype;
  normalized_status text := lower(btrim(provider_status));
  event_inserted boolean;
begin
  if provider_event_id is null
    or length(btrim(provider_event_id)) = 0
    or provider_payment_id is null
    or length(btrim(provider_payment_id)) = 0
    or event_type is null
    or length(btrim(event_type)) = 0
    or provider_status is null
    or provider_amount is null
    or provider_amount < 0
    or provider_currency is null
    or provider_order_id is null
    or provider_payload is null
    or jsonb_typeof(provider_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'Verified payment data is invalid';
  end if;

  if normalized_status not in (
    'initiated',
    'paid',
    'failed',
    'authorized',
    'captured',
    'refunded',
    'voided',
    'verified'
  ) then
    raise exception using
      errcode = '22023',
      message = 'Verified payment status is not supported';
  end if;

  select orders.*
  into locked_order
  from public.orders
  where orders.id = target_order
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Order was not found';
  end if;

  if provider_order_id is distinct from locked_order.id then
    raise exception using
      errcode = '22023',
      message = 'Payment metadata does not match the order';
  end if;

  if locked_order.moyasar_payment_id is not null
    and locked_order.moyasar_payment_id <> provider_payment_id then
    raise exception using
      errcode = '22023',
      message = 'Payment identity does not match the order';
  end if;

  insert into public.payment_events (
    provider_event_id,
    order_id,
    payment_id,
    event_type,
    provider_status,
    raw_payload
  ) values (
    provider_event_id,
    locked_order.id,
    provider_payment_id,
    event_type,
    normalized_status,
    provider_payload
  )
  on conflict on constraint payment_events_provider_event_id_key do nothing;

  event_inserted := found;

  if not event_inserted and not exists (
    select 1
    from public.payment_events
    where payment_events.provider_event_id = process_verified_moyasar_payment.provider_event_id
      and payment_events.order_id = locked_order.id
      and payment_events.payment_id = provider_payment_id
      and payment_events.event_type = process_verified_moyasar_payment.event_type
      and payment_events.provider_status = normalized_status
  ) then
    raise exception using
      errcode = '23505',
      message = 'Provider event identity is already in use';
  end if;

  state_changed := false;
  enrollment_id := null;

  if provider_amount <> locked_order.amount_halalas
    or upper(btrim(provider_currency)) <> locked_order.currency then
    if locked_order.status = 'pending' then
      update public.orders
      set
        status = 'failed',
        moyasar_payment_id = provider_payment_id,
        failure_reason = 'Payment amount or currency did not match the order',
        raw_payload = provider_payload
      where id = locked_order.id
      returning status into order_status;

      state_changed := true;
    else
      order_status := locked_order.status;
    end if;

    return next;
    return;
  end if;

  if normalized_status = 'paid' then
    if locked_order.status = 'pending' then
      update public.orders
      set
        status = 'paid',
        moyasar_payment_id = provider_payment_id,
        failure_reason = null,
        raw_payload = provider_payload,
        paid_at = now()
      where id = locked_order.id
      returning status into order_status;

      state_changed := true;
    elsif locked_order.status = 'paid' then
      update public.orders
      set raw_payload = provider_payload
      where id = locked_order.id;

      order_status := locked_order.status;
    else
      raise exception using
        errcode = '23514',
        message = 'A terminal order cannot become paid';
    end if;

    insert into public.enrollments (user_id, course_id, order_id)
    values (locked_order.user_id, locked_order.course_id, locked_order.id)
    on conflict (user_id, course_id) do update
    set
      order_id = excluded.order_id,
      granted_at = case
        when public.enrollments.expires_at is null
          then public.enrollments.granted_at
        else now()
      end,
      expires_at = null
    returning id into enrollment_id;

    return next;
    return;
  end if;

  if normalized_status = 'failed' then
    if locked_order.status = 'pending' then
      update public.orders
      set
        status = 'failed',
        moyasar_payment_id = provider_payment_id,
        failure_reason = coalesce(
          nullif(btrim(failure_detail), ''),
          'Payment provider reported failure'
        ),
        raw_payload = provider_payload
      where id = locked_order.id
      returning status into order_status;

      state_changed := true;
    else
      order_status := locked_order.status;
    end if;

    return next;
    return;
  end if;

  if normalized_status in ('refunded', 'voided') then
    if locked_order.status in ('pending', 'paid') then
      update public.orders
      set
        status = case
          when normalized_status = 'refunded' then 'refunded'::public.order_status
          else 'reversed'::public.order_status
        end,
        moyasar_payment_id = provider_payment_id,
        raw_payload = provider_payload,
        refunded_at = case
          when normalized_status = 'refunded' then now()
          else refunded_at
        end,
        reversed_at = case
          when normalized_status = 'voided' then now()
          else reversed_at
        end
      where id = locked_order.id
      returning status into order_status;

      state_changed := true;
    else
      order_status := locked_order.status;
    end if;

    update public.enrollments
    set expires_at = coalesce(expires_at, now())
    where order_id = locked_order.id;

    select enrollments.id
    into enrollment_id
    from public.enrollments
    where enrollments.order_id = locked_order.id;

    return next;
    return;
  end if;

  if locked_order.status = 'pending' then
    update public.orders
    set
      moyasar_payment_id = provider_payment_id,
      raw_payload = provider_payload
    where id = locked_order.id;
  end if;

  order_status := locked_order.status;
  return next;
end;
$$;

revoke all on function public.process_verified_moyasar_payment(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  text,
  uuid,
  jsonb,
  text
) from public, anon, authenticated;
grant execute on function public.process_verified_moyasar_payment(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  text,
  uuid,
  jsonb,
  text
) to service_role;
