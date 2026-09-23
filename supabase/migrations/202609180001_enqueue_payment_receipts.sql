-- Record receipt work in the same transaction that marks an order paid. The
-- HTTP request can then return without relying on the email provider.

create or replace function public.enqueue_paid_order_receipt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'paid'
    and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    insert into public.payment_receipts (order_id)
    values (new.id)
    on conflict (order_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.enqueue_paid_order_receipt() from public;

create trigger orders_enqueue_paid_receipt
after insert or update of status on public.orders
for each row execute function public.enqueue_paid_order_receipt();

-- Cover paid orders created before this migration without creating duplicates.
insert into public.payment_receipts (order_id)
select orders.id
from public.orders
where orders.status = 'paid'
on conflict (order_id) do nothing;
