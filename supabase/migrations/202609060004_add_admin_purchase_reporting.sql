-- Admin-only purchase history and revenue reports. The functions expose only
-- approved reporting fields and keep raw payment-provider payloads private.

create or replace function public.admin_purchase_history(
  search_query text default null,
  filter_status public.order_status default null,
  created_from timestamptz default null,
  created_before timestamptz default null,
  page_size integer default 20,
  page_offset integer default 0
)
returns table (
  order_id uuid,
  learner_name text,
  learner_email text,
  course_id uuid,
  course_title text,
  amount_halalas integer,
  currency text,
  order_status public.order_status,
  created_at timestamptz,
  paid_at timestamptz,
  refunded_at timestamptz,
  reversed_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator role required';
  end if;

  if page_size < 1 or page_size > 100 or page_offset < 0 then
    raise exception using errcode = '22023', message = 'Invalid pagination';
  end if;

  if created_from is not null and created_before is not null
    and created_from >= created_before then
    raise exception using errcode = '22023', message = 'Invalid date range';
  end if;

  return query
  select
    purchase.id,
    profile.full_name,
    account.email::text,
    course.id,
    course.title,
    purchase.amount_halalas,
    purchase.currency::text,
    purchase.status,
    purchase.created_at,
    purchase.paid_at,
    purchase.refunded_at,
    purchase.reversed_at,
    count(*) over ()
  from public.orders as purchase
  join public.profiles as profile on profile.id = purchase.user_id
  join auth.users as account on account.id = purchase.user_id
  join public.courses as course on course.id = purchase.course_id
  where (filter_status is null or purchase.status = filter_status)
    and (created_from is null or purchase.created_at >= created_from)
    and (created_before is null or purchase.created_at < created_before)
    and (
      nullif(btrim(search_query), '') is null
      or strpos(lower(purchase.id::text), lower(btrim(search_query))) > 0
      or strpos(lower(profile.full_name), lower(btrim(search_query))) > 0
      or strpos(lower(coalesce(account.email, '')), lower(btrim(search_query))) > 0
      or strpos(lower(course.title), lower(btrim(search_query))) > 0
    )
  order by purchase.created_at desc, purchase.id desc
  limit page_size
  offset page_offset;
end;
$$;

create or replace function public.admin_revenue_by_course(
  paid_from timestamptz default null,
  paid_before timestamptz default null
)
returns table (
  course_id uuid,
  course_title text,
  revenue_halalas bigint,
  paid_order_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator role required';
  end if;

  if paid_from is not null and paid_before is not null and paid_from >= paid_before then
    raise exception using errcode = '22023', message = 'Invalid date range';
  end if;

  return query
  select
    course.id,
    course.title,
    sum(purchase.amount_halalas)::bigint,
    count(*)::bigint
  from public.orders as purchase
  join public.courses as course on course.id = purchase.course_id
  where purchase.status = 'paid'
    and (paid_from is null or purchase.paid_at >= paid_from)
    and (paid_before is null or purchase.paid_at < paid_before)
  group by course.id, course.title
  order by sum(purchase.amount_halalas) desc, course.id;
end;
$$;

revoke all on function public.admin_purchase_history(text, public.order_status, timestamptz, timestamptz, integer, integer) from public;
revoke all on function public.admin_revenue_by_course(timestamptz, timestamptz) from public;
grant execute on function public.admin_purchase_history(text, public.order_status, timestamptz, timestamptz, integer, integer) to authenticated;
grant execute on function public.admin_revenue_by_course(timestamptz, timestamptz) to authenticated;
