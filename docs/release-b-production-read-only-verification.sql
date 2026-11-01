-- SHARE BARABARA RELEASE B
-- READ-ONLY PRODUCTION COMPATIBILITY CHECKS ONLY.
-- Run in Supabase SQL Editor. This script contains no INSERT, UPDATE, DELETE,
-- DDL, policy changes, function changes, migration-history writes or locks.

-- 1. Project/schema and migration ledger
SELECT current_database() AS database_name,
       current_user AS current_role,
       current_schema() AS current_schema,
       now() AS checked_at;

SELECT to_regclass('public.infrastructure_issues') AS infrastructure_issues,
       to_regclass('public.canonical_accident_incidents') AS canonical_accident_incidents,
       to_regclass('public.canonical_accident_statistics') AS canonical_accident_statistics,
       to_regclass('public.incident_content_links') AS incident_content_links,
       to_regclass('public.canonical_incident_transport_modes') AS canonical_incident_transport_modes,
       to_regclass('public.canonical_transport_statistics') AS canonical_transport_statistics,
       to_regprocedure('public.public_canonical_transport_statistics(date,date,text,text,text)') AS transport_statistics_rpc,
       to_regprocedure('public.public_canonical_transport_map(date,date,text,text,text,text,text,text)') AS transport_map_rpc;

SELECT *
FROM supabase_migrations.schema_migrations
WHERE version IN ('20261031150000', '20261028140000')
ORDER BY version;

-- 2. Infrastructure table shape, constraints, indexes and RLS
SELECT column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'infrastructure_issues'
ORDER BY ordinal_position;

SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.infrastructure_issues'::regclass
ORDER BY conname;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'infrastructure_issues'
ORDER BY indexname;

SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
WHERE c.oid = 'public.infrastructure_issues'::regclass;

SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'infrastructure_issues'
ORDER BY policyname;

SELECT count(*) AS infrastructure_total,
       count(*) FILTER (WHERE status = 'approved') AS infrastructure_approved,
       count(*) FILTER (WHERE status <> 'approved' OR status IS NULL) AS infrastructure_not_public,
       count(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) AS infrastructure_with_coordinates
FROM public.infrastructure_issues;

SELECT COUNT(*) AS infrastructure_road_references
FROM public.infrastructure_issues i
JOIN public.roads r ON r.name = i.road_name
WHERE i.road_name IS NOT NULL;

-- 3. Existing road/report/alert relationships and migration dependencies
SELECT tc.table_name, kcu.column_name, ccu.table_name AS referenced_table,
       ccu.column_name AS referenced_column, rc.delete_rule, rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name
 AND kcu.table_schema = tc.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
 AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (tc.table_name IN ('accident_reports','alerts','infrastructure_issues','canonical_accident_statistics')
       OR ccu.table_name IN ('roads','canonical_accident_incidents','incident_content_links'))
ORDER BY tc.table_name, kcu.column_name;

-- 4. Canonical transport schema, view, functions and RLS
SELECT column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('canonical_accident_incidents','canonical_accident_statistics','canonical_incident_transport_modes')
ORDER BY table_name, ordinal_position;

SELECT table_name, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND table_name IN ('canonical_incident_transport_modes','canonical_accident_incidents','canonical_accident_statistics')
ORDER BY table_name, policyname;

SELECT c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
WHERE c.oid IN (
  'public.canonical_accident_incidents'::regclass,
  'public.canonical_incident_transport_modes'::regclass
);

SELECT n.nspname AS schema_name, p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer, pg_get_function_result(p.oid) AS result_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('canonical_set_incident_classification',
                    'public_canonical_transport_statistics',
                    'public_canonical_transport_map')
ORDER BY p.proname, arguments;

SELECT table_name, count(*) AS row_count
FROM (
  SELECT 'canonical_accident_incidents' AS table_name, id
  FROM public.canonical_accident_incidents
  UNION ALL
  SELECT 'canonical_incident_transport_modes', incident_id
  FROM public.canonical_incident_transport_modes
  UNION ALL
  SELECT 'canonical_accident_statistics', incident_id
  FROM public.canonical_accident_statistics
) counts
GROUP BY table_name
ORDER BY table_name;

-- 5. Existing public RPC/view shape, without invoking mutating functions
SELECT column_name, data_type, udt_name, ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'canonical_transport_statistics'
ORDER BY ordinal_position;

SELECT schemaname, viewname, viewowner
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'canonical_transport_statistics';

-- Return the complete result set from this script to the release operator.
