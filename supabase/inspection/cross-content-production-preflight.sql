-- Cross-content production migration preflight.
-- READ ONLY: catalog queries only; temporary session-local result storage is
-- dropped automatically. This file does not execute or apply any migration.
-- Run with an owner-authorized read-only SQL session against the existing
-- Share Barabara production project before approving the migration.
-- This is plain SQL and is compatible with the Supabase SQL Editor.

BEGIN;

CREATE TEMP TABLE _cross_content_preflight (
  section TEXT PRIMARY KEY,
  result JSONB NOT NULL
) ON COMMIT DROP;

INSERT INTO _cross_content_preflight
SELECT 'relevant_tables_and_columns', COALESCE(jsonb_agg(jsonb_build_object(
  'table_schema', table_schema,
  'table_name', table_name,
  'column_name', column_name,
  'data_type', data_type,
  'is_nullable', is_nullable,
  'column_default', column_default
) ORDER BY table_name, ordinal_position), '[]'::jsonb)
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('news','accident_reports','alerts','campaigns','infrastructure_issues',
                     'editorial_conversion_targets','editorial_tags','editorial_content_tags',
                     'editorial_content_relationships','editorial_related_drafts',
                     'editorial_generation_events');

INSERT INTO _cross_content_preflight
SELECT 'constraints_and_indexes', COALESCE(jsonb_agg(jsonb_build_object(
  'schema', n.nspname,
  'relation', c.relname,
  'object', c.conname,
  'type', c.contype,
  'definition', pg_get_constraintdef(c.oid, true)
) ORDER BY c.relname, c.conname), '[]'::jsonb)
FROM pg_constraint c
JOIN pg_class r ON r.oid=c.conrelid
JOIN pg_namespace n ON n.oid=r.relnamespace
WHERE n.nspname='public'
  AND r.relname IN ('news','accident_reports','alerts','campaigns','infrastructure_issues',
                    'editorial_conversion_targets','editorial_tags','editorial_content_tags',
                    'editorial_content_relationships','editorial_related_drafts',
                    'editorial_generation_events');

INSERT INTO _cross_content_preflight
SELECT 'indexes', COALESCE(jsonb_agg(jsonb_build_object(
  'table', schemaname || '.' || tablename,
  'index', indexname,
  'definition', indexdef
) ORDER BY tablename, indexname), '[]'::jsonb)
FROM pg_indexes
WHERE schemaname='public'
  AND tablename IN ('news','accident_reports','alerts','campaigns','infrastructure_issues',
                    'editorial_conversion_targets','editorial_tags','editorial_content_tags',
                    'editorial_content_relationships','editorial_related_drafts',
                    'editorial_generation_events');

INSERT INTO _cross_content_preflight
SELECT 'rls_policies', COALESCE(jsonb_agg(jsonb_build_object(
  'schemaname', schemaname,
  'tablename', tablename,
  'policyname', policyname,
  'permissive', permissive,
  'roles', roles,
  'cmd', cmd,
  'qual', qual,
  'with_check', with_check
) ORDER BY tablename, policyname), '[]'::jsonb)
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('news','accident_reports','alerts','campaigns','infrastructure_issues',
                    'editorial_conversion_targets','editorial_tags','editorial_content_tags',
                    'editorial_content_relationships','editorial_related_drafts',
                    'editorial_generation_events');

INSERT INTO _cross_content_preflight
SELECT 'rls_enabled', COALESCE(jsonb_agg(jsonb_build_object(
  'table', n.nspname || '.' || c.relname,
  'rls_enabled', c.relrowsecurity,
  'rls_forced', c.relforcerowsecurity
) ORDER BY c.relname), '[]'::jsonb)
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('news','accident_reports','alerts','campaigns','infrastructure_issues',
                    'editorial_conversion_targets','editorial_tags','editorial_content_tags',
                    'editorial_content_relationships','editorial_related_drafts',
                    'editorial_generation_events');

INSERT INTO _cross_content_preflight
SELECT 'required_functions_and_permissions', COALESCE(jsonb_agg(jsonb_build_object(
  'schema', n.nspname,
  'function', p.proname,
  'signature', pg_get_function_identity_arguments(p.oid),
  'security', CASE WHEN p.prosecdef THEN 'definer' ELSE 'invoker' END,
  'owner', pg_get_userbyid(p.proowner),
  'acl', COALESCE(array_to_string(p.proacl, ','), 'default')
) ORDER BY p.proname, p.oid), '[]'::jsonb)
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN (
    'has_role','has_min_role','editorial_content_table','editorial_content_exists',
    'editorial_content_is_public','editorial_can_edit_content',
    'validate_editorial_content_reference','validate_editorial_relationship_reference',
    'editorial_register_related_draft','editorial_assign_tag','editorial_remove_tag',
    'editorial_link_content','editorial_unlink_content','editorial_update_related_draft',
    'editorial_finalize_related_draft','editorial_public_related_content','editorial_search_tags'
  );

INSERT INTO _cross_content_preflight
SELECT 'name_collisions', COALESCE(jsonb_agg(jsonb_build_object(
  'schema', n.nspname,
  'name', c.relname,
  'kind', c.relkind
) ORDER BY c.relname), '[]'::jsonb)
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname LIKE 'editorial_%';

INSERT INTO _cross_content_preflight
SELECT 'foreign_keys', COALESCE(jsonb_agg(jsonb_build_object(
  'table', child.relname,
  'constraint', con.conname,
  'definition', pg_get_constraintdef(con.oid, true)
) ORDER BY child.relname, con.conname), '[]'::jsonb)
FROM pg_constraint con
JOIN pg_class child ON child.oid=con.conrelid
JOIN pg_namespace n ON n.oid=child.relnamespace
WHERE n.nspname='public'
  AND con.contype='f'
  AND (child.relname LIKE 'editorial_%' OR pg_get_constraintdef(con.oid, true) LIKE '%auth.users%');

-- Migration history schemas differ between Supabase CLI versions. Resolve the
-- table dynamically so an absent history table is reported, not treated as an
-- execution error.
DO $$
DECLARE history_table REGCLASS;
DECLARE history JSONB;
BEGIN
  history_table := to_regclass('supabase_migrations.schema_migrations');
  IF history_table IS NULL THEN
    history := jsonb_build_object('available', false, 'reason', 'supabase_migrations.schema_migrations not found');
  ELSE
    EXECUTE 'SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY 1), ''[]''::jsonb) FROM ' || history_table::text || ' m'
      INTO history;
    history := jsonb_build_object('available', true, 'rows', history);
  END IF;
  INSERT INTO _cross_content_preflight VALUES ('migration_history', history);
END $$;

-- Explicit dependency report for the proposed migration.
INSERT INTO _cross_content_preflight VALUES (
  'migration_dependencies',
  jsonb_build_object(
    'migration', '20261027120000_cross_content_editorial_relationships.sql',
    'required_tables', jsonb_build_array('auth.users','public.user_roles','public.news',
      'public.accident_reports','public.alerts','public.campaigns','public.infrastructure_issues'),
    'required_functions', jsonb_build_array('public.has_role(uuid,public.app_role)',
      'public.has_min_role(uuid,public.app_role)'),
    'write_operations', jsonb_build_array('CREATE TABLE','CREATE INDEX','CREATE FUNCTION',
      'CREATE TRIGGER','ALTER TABLE ENABLE ROW LEVEL SECURITY','CREATE POLICY','GRANT'),
    'existing_data_mutation', false,
    'production_migration_required', true
  )
);

SELECT jsonb_object_agg(section, result ORDER BY section) AS cross_content_preflight
FROM _cross_content_preflight;

ROLLBACK;
