-- Deterministic synthetic data for local development and automated tests.
-- These identities have reserved example.invalid addresses and no usable
-- passwords. Never add production data, secrets, or playable paid-media URLs.

insert into auth.users (
  id,
  email,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'learner.one@example.invalid',
    '{"full_name":"Learner One"}'::jsonb,
    '2026-01-01 08:00:00+00',
    '2026-01-01 08:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'learner.two@example.invalid',
    '{"full_name":"Learner Two"}'::jsonb,
    '2026-01-01 08:01:00+00',
    '2026-01-01 08:01:00+00'
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    'instructor@example.invalid',
    '{"full_name":"Instructor Example"}'::jsonb,
    '2026-01-01 08:02:00+00',
    '2026-01-01 08:02:00+00'
  ),
  (
    '30000000-0000-4000-8000-000000000001',
    'admin@example.invalid',
    '{"full_name":"Administrator Example"}'::jsonb,
    '2026-01-01 08:03:00+00',
    '2026-01-01 08:03:00+00'
  );

insert into public.profiles (
  id,
  full_name,
  role,
  headline,
  bio,
  created_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Learner One',
    'learner',
    null,
    null,
    '2026-01-01 08:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Learner Two',
    'learner',
    null,
    null,
    '2026-01-01 08:01:00+00'
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    'Instructor Example',
    'instructor',
    'Electrical Engineering student instructor',
    'Synthetic instructor profile used only for development and testing.',
    '2026-01-01 08:02:00+00'
  ),
  (
    '30000000-0000-4000-8000-000000000001',
    'Administrator Example',
    'admin',
    null,
    null,
    '2026-01-01 08:03:00+00'
  );

insert into public.courses (
  id,
  slug,
  department,
  course_code,
  title,
  subtitle,
  description,
  price_halalas,
  currency,
  status,
  instructor_id,
  created_at,
  published_at
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    'signals-and-systems-ee301',
    'EE',
    'EE301',
    'Signals and Systems',
    'A structured introduction to continuous and discrete signals.',
    'Synthetic published course used to verify catalogue and enrolment flows.',
    35000,
    'SAR',
    'published',
    '20000000-0000-4000-8000-000000000001',
    '2026-01-02 08:00:00+00',
    '2026-01-10 08:00:00+00'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    'electric-circuits-ee201',
    'EE',
    'EE201',
    'Electric Circuits',
    'Circuit analysis foundations.',
    'Synthetic draft course for instructor authoring tests.',
    28000,
    'SAR',
    'draft',
    '20000000-0000-4000-8000-000000000001',
    '2026-01-03 08:00:00+00',
    null
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    'digital-communications-ee401',
    'EE',
    'EE401',
    'Digital Communications',
    'Digital modulation and communication systems.',
    'Synthetic course awaiting administrative review.',
    42000,
    'SAR',
    'in_review',
    '20000000-0000-4000-8000-000000000001',
    '2026-01-04 08:00:00+00',
    null
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    'engineering-mechanics-me201',
    'ME',
    'ME201',
    'Engineering Mechanics',
    'Statics and equilibrium fundamentals.',
    'Synthetic archived course proving that the schema supports other departments.',
    30000,
    'SAR',
    'archived',
    '20000000-0000-4000-8000-000000000001',
    '2026-01-05 08:00:00+00',
    '2026-01-08 08:00:00+00'
  );

insert into public.modules (id, course_id, title, position)
values
  (
    '50000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'Signal Foundations',
    1
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000001',
    'System Analysis',
    2
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    '40000000-0000-4000-8000-000000000002',
    'Circuit Fundamentals',
    1
  ),
  (
    '50000000-0000-4000-8000-000000000004',
    '40000000-0000-4000-8000-000000000003',
    'Digital Modulation',
    1
  );

insert into public.lessons (
  id,
  module_id,
  title,
  position,
  video_asset_id,
  duration_seconds,
  is_free_preview,
  media_status,
  created_at
)
values
  (
    '60000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    'What Is a Signal?',
    1,
    'synthetic-ready-preview-asset',
    720,
    true,
    'ready',
    '2026-01-02 09:00:00+00'
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000001',
    'Signal Transformations',
    2,
    'synthetic-ready-paid-asset',
    1080,
    false,
    'ready',
    '2026-01-02 09:01:00+00'
  ),
  (
    '60000000-0000-4000-8000-000000000003',
    '50000000-0000-4000-8000-000000000002',
    'Linear Time-Invariant Systems',
    1,
    'synthetic-processing-asset',
    null,
    false,
    'processing',
    '2026-01-02 09:02:00+00'
  ),
  (
    '60000000-0000-4000-8000-000000000004',
    '50000000-0000-4000-8000-000000000003',
    'Voltage and Current',
    1,
    null,
    null,
    true,
    'absent',
    '2026-01-03 09:00:00+00'
  ),
  (
    '60000000-0000-4000-8000-000000000005',
    '50000000-0000-4000-8000-000000000004',
    'Binary Phase Shift Keying',
    1,
    'synthetic-failed-asset',
    null,
    false,
    'failed',
    '2026-01-04 09:00:00+00'
  );

insert into public.orders (
  id,
  user_id,
  course_id,
  amount_halalas,
  currency,
  status,
  moyasar_payment_id,
  failure_reason,
  raw_payload,
  created_at,
  paid_at
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    35000,
    'SAR',
    'paid',
    'synthetic-payment-paid-001',
    null,
    '{"source":"synthetic-seed","status":"paid"}'::jsonb,
    '2026-01-11 08:00:00+00',
    '2026-01-11 08:02:00+00'
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000001',
    35000,
    'SAR',
    'pending',
    null,
    null,
    '{"source":"synthetic-seed","status":"pending"}'::jsonb,
    '2026-01-12 08:00:00+00',
    null
  ),
  (
    '70000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000004',
    30000,
    'SAR',
    'failed',
    'synthetic-payment-failed-001',
    'Synthetic declined payment',
    '{"source":"synthetic-seed","status":"failed"}'::jsonb,
    '2026-01-13 08:00:00+00',
    null
  );

insert into public.enrollments (
  id,
  user_id,
  course_id,
  order_id,
  granted_at,
  expires_at
)
values (
  '80000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '2026-01-11 08:02:00+00',
  null
);

insert into public.lesson_progress (
  user_id,
  lesson_id,
  last_position_seconds,
  completed_at,
  updated_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    720,
    '2026-01-14 08:00:00+00',
    '2026-01-14 08:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000002',
    245,
    null,
    '2026-01-14 08:05:00+00'
  );
