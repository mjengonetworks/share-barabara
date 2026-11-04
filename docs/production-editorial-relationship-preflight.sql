-- READ-ONLY PRODUCTION PREFLIGHT
-- Run in the Supabase SQL Editor only for inspection. This script contains
-- SELECT statements and must return no mutation statements or transaction writes.

SELECT current_database() AS database_name, current_user AS executing_role;

-- Required source tables and deleted_at compatibility.
WITH required(table_name, requires_deleted_at) AS (
  VALUES
    ('news', true), ('accident_reports', true), ('alerts', true),
    ('campaigns', true), ('infrastructure_issues', true), ('feed_posts', true),
    ('user_roles', false), ('incident_content_links', false)
)
SELECT r.table_name,
       to_regclass('public.' || r.table_name) IS NOT NULL AS table_exists,
       CASE WHEN r.requires_deleted_at THEN EXISTS (
         SELECT 1 FROM information_schema.columns c
         WHERE c.table_schema='public' AND c.table_name=r.table_name
           AND c.column_name='deleted_at'
       ) ELSE true END AS deleted_at_compatible
FROM required r
ORDER BY r.table_name;

-- Role helpers and enum prerequisites.
SELECT 'public.app_role' AS prerequisite,
       to_regtype('public.app_role') IS NOT NULL AS present
UNION ALL SELECT 'public.has_role(uuid,public.app_role)',
       to_regprocedure('public.has_role(uuid,public.app_role)') IS NOT NULL
UNION ALL SELECT 'public.has_min_role(uuid,public.app_role)',
       to_regprocedure('public.has_min_role(uuid,public.app_role)') IS NOT NULL;

SELECT rolname, rolcanlogin
FROM pg_roles
WHERE rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY rolname;

-- Existing generic relationship objects. Any existing row requires manual
-- reconciliation because the reviewed migration intentionally fails closed.
WITH objects(object_name) AS (
  VALUES ('editorial_conversion_targets'), ('editorial_tags'),
         ('editorial_content_tags'), ('editorial_content_relationships'),
         ('editorial_content_relationship_history'), ('editorial_related_drafts'),
         ('editorial_generation_events')
)
SELECT object_name, to_regclass('public.' || object_name) IS NOT NULL AS exists
FROM objects ORDER BY object_name;

WITH functions(function_name, signature) AS (
  VALUES
    ('editorial_content_table','public.editorial_content_table(text)'),
    ('editorial_content_exists','public.editorial_content_exists(text,uuid)'),
    ('editorial_content_is_public','public.editorial_content_is_public(text,uuid)'),
    ('editorial_can_edit_content','public.editorial_can_edit_content(text,uuid)'),
    ('editorial_link_content','public.editorial_link_content(text,uuid,text,uuid,text,uuid,text,text,text)'),
    ('editorial_unlink_content','public.editorial_unlink_content(uuid)'),
    ('editorial_public_related_content','public.editorial_public_related_content(text,uuid,integer)')
)
SELECT function_name, signature, to_regprocedure(signature) IS NOT NULL AS exists
FROM functions ORDER BY function_name;

-- Existing RLS state and policies, if the generic objects already exist.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('editorial_content_relationships','editorial_related_drafts',
                    'editorial_content_relationship_history','editorial_generation_events')
ORDER BY c.relname;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('editorial_content_relationships','editorial_related_drafts',
                    'editorial_content_relationship_history','editorial_generation_events')
ORDER BY tablename, policyname;

-- Existing canonical Alert ↔ Accident Report records are read-only evidence
-- that the separate incident workflow remains populated.
SELECT to_regclass('public.incident_content_links') AS incident_links_table,
       CASE WHEN to_regclass('public.incident_content_links') IS NOT NULL
            THEN (SELECT count(*) FROM public.incident_content_links)
            ELSE NULL END AS existing_incident_link_count;
