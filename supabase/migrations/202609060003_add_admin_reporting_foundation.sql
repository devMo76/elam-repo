-- Admin-only platform summary used by the administration dashboard.
-- SECURITY DEFINER permits aggregate access without exposing underlying order,
-- enrollment, or course rows to other application roles.

create index orders_paid_at_idx
  on public.orders (paid_at desc)
  where status = 'paid';

create index admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc, id desc);

create or replace function public.admin_dashboard_summary()
returns table (
  total_revenue_halalas bigint,
  enrollment_count bigint,
  active_course_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Administrator role required';
  end if;

  return query
  select
    coalesce((
      select sum(payment.amount_halalas)::bigint
      from public.orders as payment
      where payment.status = 'paid'
    ), 0::bigint),
    (select count(*) from public.enrollments),
    (
      select count(*)
      from public.courses as course
      where course.status = 'published'
    );
end;
$$;

revoke all on function public.admin_dashboard_summary() from public;
revoke all on function public.admin_dashboard_summary() from anon, authenticated;
grant execute on function public.admin_dashboard_summary() to authenticated;
