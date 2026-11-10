-- Share Barabara production schema inspection — READ ONLY
-- Run only in the Supabase SQL Editor by an authorized administrator.
-- This script contains SELECTs and session/transaction controls only.
-- It does not expose table rows, credentials or personal data.

BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '30s';

-- 1. Applied migration history.
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;

-- 2. Required object inventory for the reviewed road/report changes.
WITH required_objects(object_name, object_kind) AS (
  VALUES
    ('public.accident_reports', 'table'),
    ('public.roads', 'table'),
    ('public.news', 'table'),
    ('public.alerts', 'table'),
    ('public.infrastructure_issues', 'table'),
    ('public.news_roads', 'table'),
    ('public.alert_roads', 'table'),
    ('public.accident_report_roads', 'table'),
    ('public.infrastructure_issue_roads', 'table'),
    ('public.road_registry_history', 'table')
)
SELECT object_name, object_kind, to_regclass(object_name) IS NOT NULL AS exists
FROM required_objects
ORDER BY object_name;

-- 3. Relevant columns, nullability and defaults. No content rows are read.
SELECT table_schema, table_name, column_name, data_type,
       udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'accident_reports', 'roads', 'news', 'alerts', 'infrastructure_issues',
    'news_roads', 'alert_roads', 'accident_report_roads',
    'infrastructure_issue_roads', 'road_registry_history'
  )
ORDER BY table_name, ordinal_position;

-- 4. RLS enabled state and table owners.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       pg_get_userbyid(c.relowner) AS owner,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'accident_reports', 'roads', 'news', 'alerts', 'infrastructure_issues',
    'news_roads', 'alert_roads', 'accident_report_roads',
    'infrastructure_issue_roads', 'road_registry_history'
  )
ORDER BY c.relname;

-- 5. Policies and their predicates. This returns policy definitions, not data.
SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'accident_reports', 'roads', 'news', 'alerts', 'infrastructure_issues',
    'news_roads', 'alert_roads', 'accident_report_roads',
    'infrastructure_issue_roads', 'road_registry_history'
  )
ORDER BY tablename, policyname;

-- 6. Table grants for public/authenticated/editor-relevant roles.
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'accident_reports', 'roads', 'news', 'alerts', 'infrastructure_issues',
    'news_roads', 'alert_roads', 'accident_report_roads',
    'infrastructure_issue_roads', 'road_registry_history'
  )
  AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY table_name, grantee, privilege_type;

-- 7. Constraints and indexes relevant to nullability, identity and associations.
SELECT ns.nspname AS schema_name, cls.relname AS table_name,
       con.conname AS constraint_name, con.contype AS constraint_type,
       pg_get_constraintdef(con.oid, true) AS definition
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class cls ON cls.oid = con.conrelid
JOIN pg_catalog.pg_namespace ns ON ns.oid = cls.relnamespace
WHERE ns.nspname = 'public'
  AND cls.relname IN (
    'accident_reports', 'roads', 'news', 'alerts', 'infrastructure_issues',
    'news_roads', 'alert_roads', 'accident_report_roads',
    'infrastructure_issue_roads', 'road_registry_history'
  )
ORDER BY table_name, constraint_name;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'accident_reports', 'roads', 'news', 'alerts', 'infrastructure_issues',
    'news_roads', 'alert_roads', 'accident_report_roads',
    'infrastructure_issue_roads', 'road_registry_history'
  )
ORDER BY tablename, indexname;

-- 8. Migration compatibility matrix. Presence is reported; no migration is run.
WITH reviewed_migrations(version, migration_name, required_objects) AS (
  VALUES
    ('20260929120000', 'report_unknown_campaign_review',
      ARRAY['public.accident_reports']),
    ('20261030200000', 'canonical_road_registry_review',
      ARRAY['public.roads', 'public.news', 'public.infrastructure_issues']),
    ('20261030220000', 'canonical_road_registry_rls_hardening_review',
      ARRAY['public.roads']),
    ('20261109120000', 'road_content_associations_review',
      ARRAY['public.news_roads', 'public.alert_roads',
            'public.accident_report_roads', 'public.infrastructure_issue_roads'])
)
SELECT version, migration_name, object_name,
       to_regclass(object_name) IS NOT NULL AS object_exists
FROM reviewed_migrations
CROSS JOIN LATERAL unnest(required_objects) AS object_name
ORDER BY version, object_name;

ROLLBACK;
