-- REVIEW ONLY — DO NOT EXECUTE WITHOUT OWNER APPROVAL.
-- Cross-content tags/relationships proposal for the Admin CMS master task.
-- This file is intentionally outside supabase/migrations so normal deploys
-- cannot apply it accidentally.

begin;

create table public.editorial_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9-]*$'),
  label text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.editorial_content_tags (
  content_type text not null check (content_type in ('article','report','alert','campaign','infrastructure')),
  content_id uuid not null,
  tag_id uuid not null references public.editorial_tags(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (content_type, content_id, tag_id)
);

create table public.editorial_content_relationships (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('article','report','alert','campaign','infrastructure')),
  source_id uuid not null,
  target_type text not null check (target_type in ('article','report','alert','campaign','infrastructure')),
  target_id uuid not null,
  relationship_type text not null check (relationship_type in ('related','derived_from','follows_up','covers')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (source_type, source_id, target_type, target_id, relationship_type),
  check (not (source_type = target_type and source_id = target_id))
);

create index editorial_content_tags_lookup on public.editorial_content_tags(content_type, content_id);
create index editorial_content_tags_reverse on public.editorial_content_tags(tag_id, content_type);
create index editorial_relationships_source on public.editorial_content_relationships(source_type, source_id);
create index editorial_relationships_target on public.editorial_content_relationships(target_type, target_id);

alter table public.editorial_tags enable row level security;
alter table public.editorial_content_tags enable row level security;
alter table public.editorial_content_relationships enable row level security;

-- Editors manage the vocabulary and assignments. Public discovery must use a
-- server-owned published-content function rather than exposing raw IDs.
create policy editorial_tags_read_authenticated on public.editorial_tags
  for select to authenticated using (true);
create policy editorial_tags_manage_editor on public.editorial_tags
  for all to authenticated
  using (public.has_min_role(auth.uid(), 'editor'))
  with check (public.has_min_role(auth.uid(), 'editor'));

create policy editorial_content_tags_manage_editor on public.editorial_content_tags
  for all to authenticated
  using (public.has_min_role(auth.uid(), 'editor'))
  with check (public.has_min_role(auth.uid(), 'editor'));

create policy editorial_relationships_manage_editor on public.editorial_content_relationships
  for all to authenticated
  using (public.has_min_role(auth.uid(), 'editor'))
  with check (public.has_min_role(auth.uid(), 'editor'));

-- Expected follow-up RPCs, to be implemented and security-reviewed together:
-- 1. create_related_draft(source_type, source_id, target_type): verifies the
--    caller can edit the source, checks duplicate links, invokes the existing
--    server Editorial AI service, and returns an unsaved target draft.
-- 2. save_related_draft(...): verifies target permissions, persists the target
--    record without publishing, then creates derived_from relationship in the
--    same transaction.
-- 3. public_related_content(content_type, content_id): SECURITY DEFINER,
--    validates that both records are published/approved before returning
--    canonical links; it must never expose private or abandoned drafts.
-- 4. assign_editorial_tags(...): canonicalizes slugs and validates content
--    ownership/role before inserting assignments.

rollback;
