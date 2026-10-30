-- READ-ONLY PRODUCTION PREFLIGHT QUERIES
-- Run each statement in Supabase SQL Editor for project yhqoggbntunxvlbcatwj.
-- These queries do not modify data or schema. Save the result sets with the
-- release evidence; do not paste credentials or private data into tickets.

-- 1. Database identity and server version.
SELECT current_database() AS database_name,
       current_user AS database_role,
       inet_server_addr() AS server_address,
       version() AS postgres_version;

-- 2. Migration ledger: confirm the latest applied version and whether Release B
-- versions are already present.
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 30;

SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN ('20261030200000','20261030210000','20261030220000');

-- 3. Required tables and columns.
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'roads','road_registry_history','news','accident_reports','alerts',
    'infrastructure_issues','campaigns','feed_posts','feed_post_media',
    'editorial_feed_entries'
  )
ORDER BY table_name;

SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'roads','road_registry_history','news','accident_reports','alerts',
    'infrastructure_issues','campaigns','feed_posts','feed_post_media',
    'editorial_feed_entries'
  )
ORDER BY table_name, ordinal_position;

-- 4. Road identity, foreign keys and existing constraints.
SELECT conrelid::regclass AS table_name,
       conname,
       contype,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN (
  'public.roads'::regclass,
  'public.news'::regclass,
  'public.accident_reports'::regclass,
  'public.alerts'::regclass,
  'public.infrastructure_issues'::regclass
)
ORDER BY table_name, conname;

-- 4b. Every current direct road_id reference. The canonical accident
-- statistics object is normally a view over accident_reports; if it is a
-- table/materialized view with its own road_id, stop and review merge support.
SELECT
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS referenced_schema,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name
 AND kcu.constraint_schema = tc.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.constraint_schema = tc.constraint_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
 AND rc.constraint_schema = tc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_schema = 'public'
  AND ccu.table_name = 'roads'
ORDER BY tc.table_schema, tc.table_name, kcu.column_name;

SELECT n.nspname AS schema_name, c.relname AS relation_name, c.relkind,
       EXISTS (
         SELECT 1 FROM information_schema.columns col
         WHERE col.table_schema = n.nspname
           AND col.table_name = c.relname
           AND col.column_name = 'road_id'
       ) AS has_road_id
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'canonical_accident_statistics';

-- 5. Existing indexes and uniqueness relevant to Release B.
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('roads','news','infrastructure_issues','editorial_feed_entries')
ORDER BY tablename, indexname;

-- 6. RLS and policies before migration. This specifically captures whether the
-- legacy permissive road INSERT policy still exists.
SELECT c.oid::regclass AS table_name, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
WHERE c.oid IN (
  'public.roads'::regclass,
  'public.feed_posts'::regclass,
  'public.feed_post_media'::regclass
);

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'roads','road_registry_history','editorial_feed_entries',
    'feed_posts','feed_post_media','accident_reports','alerts'
  )
ORDER BY tablename, policyname;

-- 7. Existing trigger/function dependencies.
SELECT event_object_schema, event_object_table, trigger_name, event_manipulation,
       action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN (
    'roads','news','accident_reports','alerts','infrastructure_issues','campaigns'
  )
ORDER BY event_object_table, trigger_name, event_manipulation;

SELECT n.nspname AS schema_name, p.proname, pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'has_min_role','merge_road_registry_records',
    'record_road_registry_change','sync_editorial_feed_entry'
  )
ORDER BY p.proname, arguments;

-- 8. Preservation baseline. Record counts only; do not treat these as a
-- substitute for the full backup.
SELECT 'roads' AS object_name, count(*) AS row_count FROM public.roads
UNION ALL SELECT 'news', count(*) FROM public.news
UNION ALL SELECT 'accident_reports', count(*) FROM public.accident_reports
UNION ALL SELECT 'alerts', count(*) FROM public.alerts
UNION ALL SELECT 'infrastructure_issues', count(*) FROM public.infrastructure_issues
UNION ALL SELECT 'campaigns', count(*) FROM public.campaigns
UNION ALL SELECT 'feed_posts', count(*) FROM public.feed_posts;

-- 9. Confirm Release B objects are absent before the first application, if
-- this is the intended first run. If any row is returned, stop and inspect the
-- ledger/schema rather than running the combined script again.
SELECT object_name
FROM (VALUES
  ('public.road_registry_history'),
  ('public.editorial_feed_entries')
) AS objects(object_name)
WHERE to_regclass(object_name) IS NOT NULL;

