-- Keep provider reversals distinct from refunds while preserving the existing
-- order status vocabulary used by earlier migrations.

alter type public.order_status add value if not exists 'reversed' after 'refunded';
