begin;

select plan(4);

update public.modules
set position = case
  when id = '50000000-0000-4000-8000-000000000001' then 2
  when id = '50000000-0000-4000-8000-000000000002' then 1
end
where id in (
  '50000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000002'
);

set constraints modules_course_position_key immediate;

select is(
  (select position from public.modules where id = '50000000-0000-4000-8000-000000000001'),
  2,
  'the first module moves to position two'
);
select is(
  (select position from public.modules where id = '50000000-0000-4000-8000-000000000002'),
  1,
  'the second module moves to position one'
);
select throws_ok(
  $test$
    update public.modules
    set position = 2
    where id = '50000000-0000-4000-8000-000000000002'
  $test$,
  '23505',
  null,
  'an invalid reorder is rejected atomically'
);
select is(
  (select position from public.modules where id = '50000000-0000-4000-8000-000000000002'),
  1,
  'the rejected reorder leaves the previous position unchanged'
);

select * from finish();
rollback;
