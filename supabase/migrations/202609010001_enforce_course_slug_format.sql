-- Course slugs are public URL identifiers. Keep them predictable and safe to
-- pass through route parameters while retaining the existing uniqueness rule.

alter table public.courses
add constraint courses_slug_format_check
check (
  length(slug) <= 120
  and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
);
