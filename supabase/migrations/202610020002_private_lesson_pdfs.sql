-- PDF objects are private. Only server routes using the service role manage or sign them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-pdfs', 'lesson-pdfs', false, 20971520, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 20971520,
  allowed_mime_types = array['application/pdf'];

create table public.lesson_resources (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (length(btrim(file_name)) between 1 and 180),
  byte_size integer not null check (byte_size between 1 and 20971520),
  updated_at timestamptz not null default now()
);

alter table public.lesson_resources enable row level security;

-- The existing playback RPC already exposes this boolean decision indirectly.
-- A direct RLS policy also needs callers to be able to execute the helper.
grant execute on function public.can_access_lesson(uuid) to anon, authenticated;

create policy lesson_resources_read_permitted on public.lesson_resources
for select to anon, authenticated
using (public.can_access_lesson(lesson_id));

revoke all on public.lesson_resources from anon, authenticated;
grant select on public.lesson_resources to anon, authenticated;
