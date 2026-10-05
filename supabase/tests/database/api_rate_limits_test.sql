begin;

select plan(6);

select has_table('public', 'api_rate_limit_buckets', 'shared rate-limit storage exists');

select ok(
  not has_table_privilege('authenticated', 'public.api_rate_limit_buckets', 'SELECT'),
  'authenticated clients cannot inspect limit buckets'
);

select ok(
  not has_function_privilege('authenticated', 'public.consume_api_rate_limit(text,text,integer,integer)', 'EXECUTE'),
  'authenticated clients cannot consume arbitrary buckets'
);

select ok(
  has_function_privilege('service_role', 'public.consume_api_rate_limit(text,text,integer,integer)', 'EXECUTE'),
  'service-role code can consume buckets'
);

select is(
  public.consume_api_rate_limit('test.rate', repeat('a', 64), 60, 1),
  true,
  'first request is permitted'
);

select is(
  public.consume_api_rate_limit('test.rate', repeat('a', 64), 60, 1),
  false,
  'second request is denied in the same window'
);

select * from finish();
rollback;
