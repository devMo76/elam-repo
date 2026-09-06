begin;
select plan(5);

select has_table('public', 'webhook_deliveries', 'webhook delivery table exists');
select row_security_active('public.webhook_deliveries', 'webhook delivery RLS is active');
select has_function('public', 'begin_webhook_delivery', array['webhook_provider', 'text', 'text', 'text', 'text'], 'begin function exists');
select has_function('public', 'finish_webhook_delivery', array['bigint', 'webhook_delivery_status', 'text'], 'finish function exists');
select col_is_unique('public', 'webhook_deliveries', array['provider', 'event_key'], 'provider event keys are idempotent');

select * from finish();
rollback;
