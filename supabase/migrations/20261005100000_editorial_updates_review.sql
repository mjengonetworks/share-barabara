-- Task 47 backlog follow-up: one editorial chronology for public Alerts and Reports.
-- Review-only: apply through the normal Supabase migration workflow after review.
create table if not exists public.editorial_updates (
  id uuid primary key default gen_random_uuid(),
  parent_type text not null check (parent_type in ('alert', 'report')),
  parent_id uuid not null,
  title text,
  body text not null check (length(trim(body)) > 0),
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  status text not null default 'draft' check (status in ('draft', 'published')),
  author_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists editorial_updates_parent_published_idx
  on public.editorial_updates (parent_type, parent_id, published_at desc)
  where status = 'published';
create index if not exists editorial_updates_author_idx
  on public.editorial_updates (author_id, updated_at desc);

create or replace function public.touch_editorial_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at = coalesce(new.published_at, now());
  elsif new.status <> 'published' then
    new.published_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists editorial_updates_touch on public.editorial_updates;
create trigger editorial_updates_touch
before update on public.editorial_updates
for each row execute function public.touch_editorial_update();

alter table public.editorial_updates enable row level security;
drop policy if exists "published editorial updates are public" on public.editorial_updates;
create policy "published editorial updates are public"
on public.editorial_updates for select
using (status = 'published');
drop policy if exists "staff can read all editorial updates" on public.editorial_updates;
create policy "staff can read all editorial updates"
on public.editorial_updates for select to authenticated
using (public.has_min_role('editor'));
drop policy if exists "staff can create editorial updates" on public.editorial_updates;
create policy "staff can create editorial updates"
on public.editorial_updates for insert to authenticated
with check (public.has_min_role('editor') and author_id = (select auth.uid()));
drop policy if exists "staff can edit editorial updates" on public.editorial_updates;
create policy "staff can edit editorial updates"
on public.editorial_updates for update to authenticated
using (public.has_min_role('editor'))
with check (public.has_min_role('editor'));
drop policy if exists "staff can delete editorial updates" on public.editorial_updates;
create policy "staff can delete editorial updates"
on public.editorial_updates for delete to authenticated
using (public.has_min_role('editor'));

grant select on public.editorial_updates to anon, authenticated;
grant insert, update, delete on public.editorial_updates to authenticated;
