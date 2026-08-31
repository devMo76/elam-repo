begin;

select plan(10);

do $$
begin
  perform set_config(
    'request.jwt.claim.sub',
    '20000000-0000-4000-8000-000000000001',
    true
  );
end;
$$;

set local role authenticated;

select throws_ok(
  $test$
    insert into public.courses (
      slug,
      title,
      price_halalas,
      status,
      instructor_id
    ) values (
      'bypass-publication-on-insert',
      'Invalid published course',
      1000,
      'published',
      '20000000-0000-4000-8000-000000000001'
    )
  $test$,
  '42501',
  'Initial course status not permitted',
  'an instructor cannot bypass review by inserting a published course'
);

select throws_ok(
  $test$
    update public.courses
    set status = 'published'
    where id = '40000000-0000-4000-8000-000000000002'
  $test$,
  '42501',
  'Course status transition not permitted',
  'an instructor cannot publish while direct publishing is disabled'
);

update public.courses
set published_at = now()
where id = '40000000-0000-4000-8000-000000000002';

select is(
  (select published_at from public.courses where id = '40000000-0000-4000-8000-000000000002'),
  null::timestamptz,
  'a caller cannot forge the publication timestamp'
);

select lives_ok(
  $test$
    update public.courses
    set status = 'in_review'
    where id = '40000000-0000-4000-8000-000000000002'
  $test$,
  'an instructor can submit an owned draft for review'
);

do $$
begin
  perform set_config(
    'request.jwt.claim.sub',
    '30000000-0000-4000-8000-000000000001',
    true
  );
end;
$$;

update public.platform_settings
set instructor_direct_publish = true
where id = 1;

do $$
begin
  perform set_config(
    'request.jwt.claim.sub',
    '20000000-0000-4000-8000-000000000001',
    true
  );
end;
$$;

select lives_ok(
  $test$
    update public.courses
    set status = 'published'
    where id = '40000000-0000-4000-8000-000000000002'
  $test$,
  'an instructor can publish when direct publishing is enabled'
);

select ok(
  (select published_at is not null from public.courses where id = '40000000-0000-4000-8000-000000000002'),
  'the first publication records its timestamp'
);

select throws_ok(
  $test$
    update public.courses
    set status = 'in_review'
    where id = '40000000-0000-4000-8000-000000000002'
  $test$,
  '42501',
  'Course status transition not permitted',
  'an instructor cannot unpublish through an unsupported state transition'
);

select throws_ok(
  $test$
    update public.courses
    set status = 'archived'
    where id = '40000000-0000-4000-8000-000000000002'
  $test$,
  '42501',
  'Course status transition not permitted',
  'an instructor cannot archive a course'
);

select throws_ok(
  $test$
    update public.courses
    set status = 'draft'
    where id = '40000000-0000-4000-8000-000000000004'
  $test$,
  '42501',
  'Course status transition not permitted',
  'an instructor cannot restore an archived course'
);

do $$
begin
  perform set_config(
    'request.jwt.claim.sub',
    '30000000-0000-4000-8000-000000000001',
    true
  );
end;
$$;

select lives_ok(
  $test$
    update public.courses
    set status = 'archived'
    where id = '40000000-0000-4000-8000-000000000002'
  $test$,
  'an administrator can archive a course'
);

reset role;
select * from finish();
rollback;
