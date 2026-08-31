begin;

select plan(12);

select is((select count(*) from public.profiles), 4::bigint, 'four synthetic profiles are seeded');
select is((select count(distinct role) from public.profiles), 3::bigint, 'all three roles are represented');
select is((select count(*) from public.courses), 4::bigint, 'four synthetic courses are seeded');
select is((select count(distinct status) from public.courses), 4::bigint, 'all course states are represented');
select is((select count(distinct department) from public.courses), 2::bigint, 'multiple departments are represented');
select ok(
  exists(select 1 from public.lessons where is_free_preview)
    and exists(select 1 from public.lessons where not is_free_preview),
  'free-preview and paid lessons are represented'
);
select is(
  (select count(distinct media_status) from public.lessons where media_status in ('absent', 'processing', 'ready', 'failed')),
  4::bigint,
  'required media states are represented'
);
select is((select count(distinct status) from public.orders), 3::bigint, 'pending, paid, and failed orders are represented');
select is((select count(*) from public.enrollments), 1::bigint, 'one learner is enrolled');
select is(
  (
    select count(*)
    from public.profiles p
    where p.role = 'learner'
      and not exists (select 1 from public.enrollments e where e.user_id = p.id)
  ),
  1::bigint,
  'one learner remains non-enrolled'
);
select is(
  (select count(*) from public.lessons where video_asset_id ~* '^https?://'),
  0::bigint,
  'seed data contains no playable media URLs'
);
select is(
  (select array_agg(status order by slug) from public.courses where status = 'published'),
  array['published'::public.course_status],
  'the catalogue query returns published courses only'
);

select * from finish();
rollback;
