-- Task 70 read-only preflight/audit.
-- Run with a read-only database role. This script contains no DDL or DML.
-- It remains safe when the new Task 70 relations have not been created.

-- Applied migration history. The catalog guard keeps this read-only audit safe
-- on environments where the migration-history relation is unavailable.
DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NULL THEN
    RAISE NOTICE 'supabase_migrations.schema_migrations is unavailable; migration history is not confirmed';
  ELSE
    EXECUTE $query$
      SELECT version, name
      FROM supabase_migrations.schema_migrations
      WHERE version >= '20261021090000'
      ORDER BY version
    $query$;
  END IF;
END $$;

-- Relation existence and kind. NULL means the relation is not present.
SELECT relation_name,
       to_regclass(format('public.%I', relation_name)) AS relation_oid,
       CASE c.relkind
         WHEN 'r' THEN 'table'
         WHEN 'v' THEN 'view'
         WHEN 'm' THEN 'materialized view'
         ELSE c.relkind::text
       END AS relation_kind
FROM (VALUES
  ('banner_ads'),
  ('ecosystem_previews'),
  ('ecosystem_previews_public'),
  ('advertising_settings'),
  ('advertising_settings_public')
) AS expected(relation_name)
LEFT JOIN pg_class c
  ON c.oid = to_regclass(format('public.%I', expected.relation_name));

-- Column inventory, including internal/audit fields so public exposure can be checked.
SELECT table_name, column_name, ordinal_position, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'banner_ads', 'ecosystem_previews', 'ecosystem_previews_public',
    'advertising_settings', 'advertising_settings_public'
  )
ORDER BY table_name, ordinal_position;

-- Constraints on tables that exist; no relation reference is made to missing Task 70 tables.
SELECT cls.relname AS relation_name,
       con.conname,
       CASE con.contype
         WHEN 'p' THEN 'PRIMARY KEY'
         WHEN 'u' THEN 'UNIQUE'
         WHEN 'c' THEN 'CHECK'
         WHEN 'f' THEN 'FOREIGN KEY'
         ELSE con.contype::text
       END AS constraint_type,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE nsp.nspname = 'public'
  AND cls.relname IN ('banner_ads', 'ecosystem_previews', 'advertising_settings')
ORDER BY cls.relname, con.conname;

-- RLS state and policies.
SELECT c.relname AS relation_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
WHERE nsp.nspname = 'public'
  AND c.relname IN ('banner_ads', 'ecosystem_previews', 'advertising_settings');

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('banner_ads', 'ecosystem_previews', 'advertising_settings')
ORDER BY tablename, policyname;

-- Effective table/view grants exposed through information_schema.
SELECT table_name, grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'banner_ads', 'ecosystem_previews', 'ecosystem_previews_public',
    'advertising_settings', 'advertising_settings_public'
  )
ORDER BY table_name, grantee, privilege_type;

-- Supporting indexes.
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('banner_ads', 'ecosystem_previews', 'advertising_settings')
ORDER BY tablename, indexname;

-- Existing ad rows and explicit demo markers. This does not update or classify anything.
SELECT id, title, advertiser, active, link_url,
       to_jsonb(b) ->> 'is_demo' AS is_demo_marker,
       to_jsonb(b) ? 'is_demo' AS is_demo_column_present
FROM public.banner_ads AS b
ORDER BY created_at DESC, id;

-- View definitions and security context.
SELECT schemaname, viewname, viewowner, definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('ecosystem_previews_public', 'advertising_settings_public');

-- Relevant functions and triggers.
SELECT n.nspname AS schema_name, p.proname,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_function_result(p.oid) AS returns
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('has_min_role', 'touch_updated_at');

SELECT event_object_table, trigger_name, action_timing, event_manipulation,
       action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('ecosystem_previews', 'advertising_settings')
ORDER BY event_object_table, trigger_name;
