begin;

select plan(10);

select throws_ok(
  $test$update public.profiles set full_name = ' ' where id = '10000000-0000-4000-8000-000000000001'$test$,
  '23514',
  null,
  'blank profile names are rejected'
);
select throws_ok(
  $test$
    insert into public.courses (slug, title, price_halalas, instructor_id)
    values ('negative-price', 'Invalid course', -1, '20000000-0000-4000-8000-000000000001')
  $test$,
  '23514',
  null,
  'negative course prices are rejected'
);
select throws_ok(
  $test$
    insert into public.courses (slug, title, price_halalas, currency, instructor_id)
    values ('wrong-currency', 'Invalid currency', 1000, 'USD', '20000000-0000-4000-8000-000000000001')
  $test$,
  '23514',
  null,
  'non-SAR course prices are rejected'
);
select throws_ok(
  $test$
    insert into public.modules (course_id, title, position)
    values ('40000000-0000-4000-8000-000000000001', 'Invalid module', 0)
  $test$,
  '23514',
  null,
  'module positions must be positive'
);
select throws_ok(
  $test$
    insert into public.lessons (module_id, title, position, duration_seconds)
    values ('50000000-0000-4000-8000-000000000001', 'Invalid lesson', 99, -1)
  $test$,
  '23514',
  null,
  'negative lesson durations are rejected'
);
select throws_ok(
  $test$
    insert into public.enrollments (user_id, course_id)
    values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001')
  $test$,
  '23505',
  null,
  'duplicate enrolments are rejected'
);
select throws_ok(
  $test$
    insert into public.orders (
      user_id, course_id, amount_halalas, moyasar_payment_id
    ) values (
      '10000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-000000000001',
      35000,
      'synthetic-payment-paid-001'
    )
  $test$,
  '23505',
  null,
  'duplicate payment identifiers are rejected'
);
select throws_ok(
  $test$delete from public.courses where id = '40000000-0000-4000-8000-000000000002'$test$,
  '23514',
  null,
  'courses cannot be physically deleted'
);
select throws_ok(
  $test$delete from public.orders where id = '70000000-0000-4000-8000-000000000002'$test$,
  '23514',
  null,
  'orders cannot be deleted'
);

insert into public.admin_audit_log (actor_id, action, subject)
values ('30000000-0000-4000-8000-000000000001', 'test.action', 'synthetic-subject');

select throws_ok(
  $test$update public.admin_audit_log set action = 'changed'$test$,
  '23514',
  null,
  'administrative audit records cannot be changed'
);

select * from finish();
rollback;
