begin;

select plan(37);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '90000000-0000-4000-8000-000000000051',
    'payment.one@example.invalid',
    '{"full_name":"Payment Learner One"}'::jsonb
  ),
  (
    '90000000-0000-4000-8000-000000000052',
    'payment.two@example.invalid',
    '{"full_name":"Payment Learner Two"}'::jsonb
  ),
  (
    '90000000-0000-4000-8000-000000000053',
    'payment.three@example.invalid',
    '{"full_name":"Payment Learner Three"}'::jsonb
  ),
  (
    '90000000-0000-4000-8000-000000000054',
    'payment.four@example.invalid',
    '{"full_name":"Payment Learner Four"}'::jsonb
  );

select ok(
  'reversed' = any(enum_range(null::public.order_status)::text[]),
  'reversed orders have a distinct status'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.create_pending_order(uuid,uuid)',
    'execute'
  ),
  false,
  'browser sessions cannot create pending orders through the trusted function'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.process_verified_moyasar_payment(uuid,text,text,text,text,integer,text,uuid,jsonb,text)',
    'execute'
  ),
  false,
  'browser sessions cannot process verified payments'
);
select is(
  has_table_privilege('authenticated', 'public.payment_events', 'select'),
  false,
  'browser sessions cannot read payment event history'
);
select is(
  has_column_privilege('authenticated', 'public.orders', 'status', 'select'),
  true,
  'learners can read safe order status data'
);
select is(
  has_column_privilege('authenticated', 'public.orders', 'raw_payload', 'select'),
  false,
  'learners cannot read raw provider payloads'
);

create temporary table payment_order_one as
select *
from public.create_pending_order(
  '90000000-0000-4000-8000-000000000051',
  '40000000-0000-4000-8000-000000000001'
);

select is(
  (select amount_halalas from payment_order_one),
  35000,
  'pending orders use the database course price'
);
select is(
  (select currency from payment_order_one),
  'SAR',
  'pending orders use the database course currency'
);
select is(
  (select order_status from payment_order_one),
  'pending'::public.order_status,
  'new orders start pending'
);
select is(
  (
    select order_id
    from public.create_pending_order(
      '90000000-0000-4000-8000-000000000051',
      '40000000-0000-4000-8000-000000000001'
    )
  ),
  (select order_id from payment_order_one),
  'repeated checkout returns the same pending order'
);
select is(
  (
    select count(*)
    from public.orders
    where user_id = '90000000-0000-4000-8000-000000000051'
      and course_id = '40000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'repeated checkout creates one order'
);
select throws_ok(
  $test$
    select *
    from public.create_pending_order(
      '10000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001'
    )
  $test$,
  '23505',
  'Learner is already enrolled',
  'already-enrolled learners cannot purchase again'
);
select throws_ok(
  $test$
    select *
    from public.create_pending_order(
      '90000000-0000-4000-8000-000000000051',
      '40000000-0000-4000-8000-000000000002'
    )
  $test$,
  'P0002',
  'Course is not available for purchase',
  'unpublished courses cannot be purchased'
);

create temporary table paid_result as
select *
from public.process_verified_moyasar_payment(
  (select order_id from payment_order_one),
  'event-paid-one',
  'payment-paid-one',
  'payment_paid',
  'paid',
  35000,
  'SAR',
  (select order_id from payment_order_one),
  '{"id":"payment-paid-one","status":"paid"}'::jsonb,
  null
);

select is(
  (select order_status from paid_result),
  'paid'::public.order_status,
  'a matching verified payment marks the order paid'
);
select is(
  (select state_changed from paid_result),
  true,
  'the first paid confirmation changes state'
);
select is(
  (
    select count(*)
    from public.enrollments
    where user_id = '90000000-0000-4000-8000-000000000051'
      and course_id = '40000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'a paid order grants exactly one enrolment'
);

create temporary table replay_result as
select *
from public.process_verified_moyasar_payment(
  (select order_id from payment_order_one),
  'event-paid-one',
  'payment-paid-one',
  'payment_paid',
  'paid',
  35000,
  'SAR',
  (select order_id from payment_order_one),
  '{"id":"payment-paid-one","status":"paid"}'::jsonb,
  null
);

select is(
  (select state_changed from replay_result),
  false,
  'replaying the same event is idempotent'
);
select is(
  (select count(*) from public.payment_events where provider_event_id = 'event-paid-one'),
  1::bigint,
  'replaying the same event stores one event record'
);

select lives_ok(
  $test$
    select *
    from public.process_verified_moyasar_payment(
      (select order_id from payment_order_one),
      'callback-paid-one',
      'payment-paid-one',
      'payment_callback',
      'paid',
      35000,
      'SAR',
      (select order_id from payment_order_one),
      '{"id":"payment-paid-one","status":"paid"}'::jsonb,
      null
    )
  $test$,
  'callback and webhook confirmation can safely arrive in either order'
);
select is(
  (
    select count(*)
    from public.enrollments
    where user_id = '90000000-0000-4000-8000-000000000051'
      and course_id = '40000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'separate confirmation paths still create one enrolment'
);

create temporary table payment_order_two as
select *
from public.create_pending_order(
  '90000000-0000-4000-8000-000000000052',
  '40000000-0000-4000-8000-000000000001'
);

select lives_ok(
  $test$
    select *
    from public.process_verified_moyasar_payment(
      (select order_id from payment_order_two),
      'event-tampered-two',
      'payment-tampered-two',
      'payment_paid',
      'paid',
      1,
      'SAR',
      (select order_id from payment_order_two),
      '{"id":"payment-tampered-two","status":"paid","amount":1}'::jsonb,
      null
    )
  $test$,
  'a real but mismatched payment is recorded without granting access'
);
select is(
  (
    select status
    from public.orders
    where id = (select order_id from payment_order_two)
  ),
  'failed'::public.order_status,
  'a mismatched amount fails the pending order'
);
select is(
  (
    select count(*)
    from public.enrollments
    where user_id = '90000000-0000-4000-8000-000000000052'
  ),
  0::bigint,
  'a mismatched amount grants no enrolment'
);

create temporary table payment_order_three as
select *
from public.create_pending_order(
  '90000000-0000-4000-8000-000000000053',
  '40000000-0000-4000-8000-000000000001'
);

select throws_ok(
  $test$
    select *
    from public.process_verified_moyasar_payment(
      (select order_id from payment_order_three),
      'event-wrong-metadata',
      'payment-wrong-metadata',
      'payment_paid',
      'paid',
      35000,
      'SAR',
      (select order_id from payment_order_two),
      '{"id":"payment-wrong-metadata","status":"paid"}'::jsonb,
      null
    )
  $test$,
  '22023',
  'Payment metadata does not match the order',
  'mismatched provider metadata grants no access'
);
select throws_ok(
  $test$
    insert into public.orders (user_id, course_id, amount_halalas, currency)
    values (
      '90000000-0000-4000-8000-000000000053',
      '40000000-0000-4000-8000-000000000001',
      35000,
      'SAR'
    )
  $test$,
  '23505',
  null,
  'the unique active-purchase index blocks concurrent duplicate orders'
);

select lives_ok(
  $test$
    select *
    from public.process_verified_moyasar_payment(
      (select order_id from payment_order_one),
      'event-refunded-one',
      'payment-paid-one',
      'payment_refunded',
      'refunded',
      35000,
      'SAR',
      (select order_id from payment_order_one),
      '{"id":"payment-paid-one","status":"refunded"}'::jsonb,
      null
    )
  $test$,
  'an externally verified refund is recorded'
);
select is(
  (
    select status
    from public.orders
    where id = (select order_id from payment_order_one)
  ),
  'refunded'::public.order_status,
  'the refunded order keeps a terminal status'
);
select ok(
  (
    select expires_at is not null
    from public.enrollments
    where order_id = (select order_id from payment_order_one)
  ),
  'a verified refund expires course access without deleting history'
);
create temporary table payment_order_four as
select *
from public.create_pending_order(
  '90000000-0000-4000-8000-000000000054',
  '40000000-0000-4000-8000-000000000001'
);

create temporary table reversal_paid_result as
select *
from public.process_verified_moyasar_payment(
  (select order_id from payment_order_four),
  'event-paid-four',
  'payment-paid-four',
  'payment_paid',
  'paid',
  35000,
  'SAR',
  (select order_id from payment_order_four),
  '{"id":"payment-paid-four","status":"paid"}'::jsonb,
  null
);

select is(
  (select order_status from reversal_paid_result),
  'paid'::public.order_status,
  'the reversal test starts with a paid order'
);

create temporary table reversal_result as
select *
from public.process_verified_moyasar_payment(
  (select order_id from payment_order_four),
  'event-voided-four',
  'payment-paid-four',
  'payment_voided',
  'voided',
  35000,
  'SAR',
  (select order_id from payment_order_four),
  '{"id":"payment-paid-four","status":"voided"}'::jsonb,
  null
);

select is(
  (select order_status from reversal_result),
  'reversed'::public.order_status,
  'an externally verified void marks the order reversed'
);
select ok(
  (
    select reversed_at is not null
    from public.orders
    where id = (select order_id from payment_order_four)
  ),
  'a reversed order records when it was reversed'
);
select ok(
  (
    select expires_at is not null
    from public.enrollments
    where order_id = (select order_id from payment_order_four)
  ),
  'a verified reversal expires course access without deleting history'
);
select throws_ok(
  format(
    $test$
      select *
      from public.process_verified_moyasar_payment(
        %L,
        'event-invalid-status',
        'payment-invalid-status',
        'payment_updated',
        null,
        35000,
        'SAR',
        %L,
        '{"id":"payment-invalid-status"}'::jsonb,
        null
      )
    $test$,
    (select order_id from payment_order_three),
    (select order_id from payment_order_three)
  ),
  '22023',
  'Verified payment data is invalid',
  'missing verified payment fields are rejected'
);
select throws_ok(
  $test$
    update public.orders
    set amount_halalas = 1
    where id = (select order_id from payment_order_one)
  $test$,
  '23514',
  'Order identity and price fields are immutable',
  'stored order prices cannot be changed'
);
select throws_ok(
  $test$
    update public.orders
    set status = 'pending'
    where id = (select order_id from payment_order_one)
  $test$,
  '23514',
  'Order status transition is not permitted',
  'terminal order states cannot move backwards'
);
select throws_ok(
  $test$
    update public.payment_events
    set provider_status = 'failed'
    where provider_event_id = 'event-paid-one'
  $test$,
  '23514',
  'Payment events are append-only',
  'payment event history cannot be changed'
);
select throws_ok(
  $test$
    delete from public.payment_events
    where provider_event_id = 'event-paid-one'
  $test$,
  '23514',
  'Payment events are append-only',
  'payment event history cannot be deleted'
);

select * from finish();
rollback;
