\set ON_ERROR_STOP on
\set QUIET on

-- Cross-content database verification harness.
--
-- This file deliberately does NOT apply migrations. Run it only after the
-- ordinary project migrations and
-- supabase/migrations/20261027120000_cross_content_editorial_relationships.sql
-- have been applied to an isolated, non-production Supabase database.
-- Every fixture is created inside one transaction and rolled back at the end.
-- Run as the local Supabase postgres/service role so the harness can create
-- isolated auth users and role fixtures, while SET ROLE exercises RLS.

BEGIN;

CREATE TEMP TABLE _cross_content_ids (
  anonymous_id UUID NOT NULL,
  ordinary_id UUID NOT NULL,
  editor_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  article_id UUID NOT NULL,
  published_report_id UUID NOT NULL,
  draft_report_id UUID NOT NULL,
  alert_id UUID NOT NULL,
  tag_id UUID
) ON COMMIT DROP;

INSERT INTO _cross_content_ids VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000104',
  NULL
);

-- -------------------------------------------------------------------------
-- 1. Migration prerequisites and object inventory
-- -------------------------------------------------------------------------

DO $$
DECLARE missing TEXT[];
BEGIN
  SELECT array_agg(x.name ORDER BY x.name)
    INTO missing
  FROM (VALUES
    ('editorial_conversion_targets'),
    ('editorial_tags'),
    ('editorial_content_tags'),
    ('editorial_content_relationships'),
    ('editorial_related_drafts'),
    ('editorial_generation_events')
  ) AS x(name)
  WHERE to_regclass('public.' || x.name) IS NULL;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'cross-content migration objects missing: %', missing;
  END IF;
  IF to_regprocedure('public.has_min_role(uuid,public.app_role)') IS NULL
     OR to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'role helper prerequisites are missing';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='editorial_content_tags_reference_trg')
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='editorial_relationships_reference_trg') THEN
    RAISE EXCEPTION 'cross-content reference triggers are missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='editorial_related_drafts_open_uq')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='editorial_relationships_source_idx') THEN
    RAISE EXCEPTION 'cross-content indexes are missing';
  END IF;
END $$;

-- Confirm the expected conversion allow-list and all new tables have RLS.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.editorial_conversion_targets WHERE enabled) < 8 THEN
    RAISE EXCEPTION 'conversion allow-list is incomplete';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND c.relname IN ('editorial_conversion_targets','editorial_tags','editorial_content_tags',
                        'editorial_content_relationships','editorial_related_drafts','editorial_generation_events')
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'one or more cross-content tables do not have RLS enabled';
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 2. Isolated auth/content fixtures
-- -------------------------------------------------------------------------

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'cross-content-' || id::text || '@local.test', crypt('local-test-password', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
FROM (
  SELECT anonymous_id AS id FROM _cross_content_ids
  UNION ALL SELECT ordinary_id FROM _cross_content_ids
  UNION ALL SELECT editor_id FROM _cross_content_ids
  UNION ALL SELECT admin_id FROM _cross_content_ids
) u;

INSERT INTO public.user_roles(user_id, role)
SELECT editor_id, 'editor'::public.app_role FROM _cross_content_ids
UNION ALL
SELECT admin_id, 'admin'::public.app_role FROM _cross_content_ids;

-- Existing-data preservation sentinel: the migration must not alter this row.
INSERT INTO public.news(id, slug, title, summary, body, category, source, featured, status, published_at, author_id)
SELECT article_id, 'cross-content-preservation-sentinel', 'Preserve this article',
  'Original summary', 'Original body', 'Road safety', 'local fixture', false, 'published', now(), editor_id
FROM _cross_content_ids;

INSERT INTO public.accident_reports(id, user_id, title, description, county, road, occurred_at,
  vehicles_involved, casualties, fatalities, severity, status)
SELECT published_report_id, editor_id, 'Published test report', 'Verified published report', 'Nairobi',
  'Test Road', now(), 1, 2, 1, 'moderate', 'approved' FROM _cross_content_ids
UNION ALL
SELECT draft_report_id, editor_id, 'Unpublished test report', 'Private draft report', 'Nairobi',
  'Draft Road', now(), 1, NULL, NULL, 'moderate', 'pending' FROM _cross_content_ids;

INSERT INTO public.alerts(id, user_id, title, description, county, road, hazard_type, severity, status)
SELECT alert_id, editor_id, 'Test alert', 'Test alert description', 'Nairobi', 'Test Road',
  'other', 'medium', 'active' FROM _cross_content_ids;

-- Preserve the exact sentinel values for the end-of-test assertion.
CREATE TEMP TABLE _sentinel AS
SELECT id, title, summary, body, status, author_id FROM public.news
WHERE id=(SELECT article_id FROM _cross_content_ids);

-- -------------------------------------------------------------------------
-- 3. Anonymous and ordinary-user boundaries
-- -------------------------------------------------------------------------

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.editorial_tags) <> 0
     OR (SELECT count(*) FROM public.editorial_content_relationships) <> 0 THEN
    RAISE EXCEPTION 'anonymous user can read private cross-content tables';
  END IF;
  IF EXISTS (SELECT 1 FROM public.editorial_public_related_content(
      'article',(SELECT article_id FROM _cross_content_ids),12)) THEN
    RAISE EXCEPTION 'public related-content RPC exposed an unlinked fixture';
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', ordinary_id::text, true)
FROM _cross_content_ids;
DO $$
BEGIN
  BEGIN
    PERFORM public.editorial_assign_tag('report',(SELECT published_report_id FROM _cross_content_ids),gen_random_uuid());
    RAISE EXCEPTION 'ordinary user was allowed to assign a tag';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'ordinary user was allowed to assign a tag' THEN RAISE; END IF;
  END;
  IF (SELECT count(*) FROM public.editorial_related_drafts) <> 0 THEN
    RAISE EXCEPTION 'ordinary user can read another users drafts';
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 4. Editor tag, draft, relationship and audit behavior
-- -------------------------------------------------------------------------

SELECT set_config('request.jwt.claim.sub', editor_id::text, true)
FROM _cross_content_ids;

INSERT INTO public.editorial_tags(slug,label,created_by)
SELECT 'road-safety-test','Road Safety Test',editor_id FROM _cross_content_ids
RETURNING id;

UPDATE _cross_content_ids SET tag_id=(SELECT id FROM public.editorial_tags WHERE slug='road-safety-test');

SELECT public.editorial_assign_tag('report',(SELECT published_report_id FROM _cross_content_ids),
  (SELECT tag_id FROM _cross_content_ids));
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.editorial_content_tags
    WHERE content_type='report' AND content_id=(SELECT published_report_id FROM _cross_content_ids)
      AND tag_id=(SELECT tag_id FROM _cross_content_ids)) THEN
    RAISE EXCEPTION 'tag assignment did not persist';
  END IF;
END $$;

SELECT public.editorial_remove_tag('report',(SELECT published_report_id FROM _cross_content_ids),
  (SELECT tag_id FROM _cross_content_ids));
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.editorial_content_tags
    WHERE content_type='report' AND content_id=(SELECT published_report_id FROM _cross_content_ids)
      AND tag_id=(SELECT tag_id FROM _cross_content_ids)) THEN
    RAISE EXCEPTION 'tag removal did not persist';
  END IF;
END $$;

-- A generated conversion is persisted as an open draft, never as content.
SELECT public.editorial_register_related_draft(
  'report',(SELECT published_report_id FROM _cross_content_ids),'article',
  '00000000-0000-0000-0000-000000001001','grok','test-v1',
  '{"title":"Published test report","description":"Verified published report"}'::jsonb,
  'source-hash-1','{"title":"Generated draft","body":"Editable draft only"}'::jsonb);

DO $$
BEGIN
  IF (SELECT count(*) FROM public.news WHERE title='Generated draft') <> 0 THEN
    RAISE EXCEPTION 'generation created or published a news row';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.editorial_related_drafts
    WHERE source_type='report' AND target_type='article' AND status='open'
      AND source_snapshot_hash='source-hash-1') THEN
    RAISE EXCEPTION 'open related draft was not stored';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.editorial_generation_events
    WHERE source_snapshot_hash='source-hash-1' AND outcome='succeeded') THEN
    RAISE EXCEPTION 'generation audit event was not stored';
  END IF;
END $$;

-- Same source/hash is idempotent even with a new request id.
SELECT public.editorial_register_related_draft(
  'report',(SELECT published_report_id FROM _cross_content_ids),'article',
  '00000000-0000-0000-0000-000000001002','grok','test-v1',
  '{"title":"Published test report","description":"Verified published report"}'::jsonb,
  'source-hash-1','{"title":"Updated draft","body":"Still editable"}'::jsonb);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.editorial_related_drafts
    WHERE source_snapshot_hash='source-hash-1' AND status='open') <> 1 THEN
    RAISE EXCEPTION 'duplicate open draft was created';
  END IF;
END $$;

-- Linking to a public target is allowed; exact duplicates are ignored.
SELECT public.editorial_link_content(
  'report',(SELECT published_report_id FROM _cross_content_ids),'article',
  (SELECT article_id FROM _cross_content_ids),'derived_from',
  '00000000-0000-0000-0000-000000001001','grok','test-v1','source-hash-1');
SELECT public.editorial_link_content(
  'report',(SELECT published_report_id FROM _cross_content_ids),'article',
  (SELECT article_id FROM _cross_content_ids),'derived_from',
  '00000000-0000-0000-0000-000000001001','grok','test-v1','source-hash-1');
DO $$
BEGIN
  IF (SELECT count(*) FROM public.editorial_content_relationships
    WHERE source_type='report' AND source_id=(SELECT published_report_id FROM _cross_content_ids)
      AND target_type='article' AND target_id=(SELECT article_id FROM _cross_content_ids)
      AND relationship_type='derived_from') <> 1 THEN
    RAISE EXCEPTION 'duplicate relationship was created';
  END IF;
END $$;

-- Bidirectional public discovery returns the linked article/report.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.editorial_public_related_content(
    'article',(SELECT article_id FROM _cross_content_ids),12)) <> 1 THEN
    RAISE EXCEPTION 'expected one bidirectional public relationship';
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 5. Unpublished filtering and cross-account protection
-- -------------------------------------------------------------------------

SELECT public.editorial_link_content(
  'report',(SELECT published_report_id FROM _cross_content_ids),'report',
  (SELECT draft_report_id FROM _cross_content_ids),'related',NULL,NULL,NULL,NULL);

DO $$
BEGIN
  IF (SELECT count(*) FROM public.editorial_public_related_content(
    'report',(SELECT published_report_id FROM _cross_content_ids),12)) <> 1 THEN
    RAISE EXCEPTION 'unpublished target was exposed publicly';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', ordinary_id::text, true)
FROM _cross_content_ids;
DO $$
BEGIN
  BEGIN
    PERFORM public.editorial_link_content('report',(SELECT published_report_id FROM _cross_content_ids),
      'article',(SELECT article_id FROM _cross_content_ids),'related',NULL,NULL,NULL,NULL);
    RAISE EXCEPTION 'cross-account ordinary user linked content';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'cross-account ordinary user linked content' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.editorial_register_related_draft('report',(SELECT published_report_id FROM _cross_content_ids),
      'article','00000000-0000-0000-0000-000000001003','groq','test-v1','{}'::jsonb,'other-hash','{}'::jsonb);
    RAISE EXCEPTION 'cross-account ordinary user generated a draft';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'cross-account ordinary user generated a draft' THEN RAISE; END IF;
  END;
END $$;

-- Admin can read the audit and relationship records but still cannot publish
-- through these RPCs; publication remains an existing CMS workflow.
SELECT set_config('request.jwt.claim.sub', admin_id::text, true)
FROM _cross_content_ids;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.editorial_generation_events
      WHERE source_snapshot_hash='source-hash-1') < 2 THEN
    RAISE EXCEPTION 'administrator cannot read generation audit';
  END IF;
  IF (SELECT count(*) FROM public.news WHERE title='Generated draft') <> 0 THEN
    RAISE EXCEPTION 'draft unexpectedly became published content';
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 6. Existing-data preservation and cleanup
-- -------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.news n JOIN _sentinel s ON s.id=n.id
    WHERE n.title=s.title AND n.summary=s.summary AND n.body=s.body
      AND n.status=s.status AND n.author_id=s.author_id
  ) THEN
    RAISE EXCEPTION 'existing-content sentinel changed';
  END IF;
END $$;

ROLLBACK;
\echo 'cross-content database verification passed; all fixtures rolled back'
