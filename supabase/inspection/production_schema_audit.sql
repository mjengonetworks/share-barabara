-- Share Barabara Task 53: production schema audit (READ ONLY).
-- Paste this entire statement into the Supabase SQL Editor. It performs no
-- DDL/DML and returns exactly one JSON object in one result row.
WITH
relevant_tables AS (
  SELECT unnest(ARRAY[
    'profiles','user_roles','news','news_categories','alerts','hazard_types',
    'alert_severities','accident_reports','report_severities','comments',
    'votes','notifications','notification_preferences','push_subscriptions',
    'notification_delivery_jobs','notification_delivery_attempts','feed_posts',
    'feed_comments','feed_post_reports','feed_blocks','content_requests',
    'moderation_action_history','statistics_datasets','statistics_observations',
    'statistics_proposals','taxonomy_values','pages','campaigns','videos',
    'infrastructure_issues','recycle_bin_items','recycle_bin_history'
  ]::text[]) AS table_name
),
applied_migrations AS (
  SELECT version::text AS version, name::text AS name
  FROM supabase_migrations.schema_migrations
),
expected_objects(kind, schema_name, object_name, source_migration) AS (
  VALUES
    ('table','public','statistics_datasets','20260930100000'),
    ('table','public','statistics_observations','20260930100000'),
    ('table','public','statistics_proposals','20260930100000'),
    ('table','public','push_subscriptions','20260930170000'),
    ('table','public','notification_delivery_jobs','20260930170000'),
    ('table','public','notification_delivery_attempts','20260930170000'),
    ('table','public','feed_posts','20261001100000'),
    ('table','public','feed_post_reports','20261001100000'),
    ('table','public','feed_blocks','20261001100000'),
    ('table','public','moderation_action_history','20261001110000'),
    ('table','public','recycle_bin_items','20261001120000'),
    ('table','public','recycle_bin_history','20261001120000'),
    ('function','public','get_contributor_leaderboard','20260930120000'),
    ('function','public','notify_nearby_users_on_alert','20260930110000'),
    ('function','public','notification_hazard_type_matches','20260930160000'),
    ('function','public','enqueue_notification_push_job','20260930170000'),
    ('function','public','restore_recycle_bin_item','20261001120000'),
    ('function','public','permanently_delete_recycle_bin_item','20261001120000'),
    ('index','public','notification_preferences_alert_match_idx','20260930110000'),
    ('index','public','notification_delivery_jobs_status_idx','20260930170000'),
    ('index','public','feed_posts_created_at_idx','20261001100000'),
    ('index','public','recycle_bin_items_owner_idx','20261001120000'),
    ('constraint','public','hazard_types_parent_not_self','20260930150000'),
    ('constraint','public','votes_entity_type_check','20261001100000')
),
object_presence AS (
  SELECT e.kind, e.schema_name, e.object_name, e.source_migration,
    CASE e.kind
      WHEN 'table' THEN to_regclass(format('%I.%I', e.schema_name, e.object_name)) IS NOT NULL
      WHEN 'function' THEN EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = e.schema_name AND p.proname = e.object_name
      )
      WHEN 'index' THEN EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = e.schema_name AND c.relname = e.object_name AND c.relkind = 'i'
      )
      WHEN 'constraint' THEN EXISTS (
        SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = r.relnamespace
        WHERE n.nspname = e.schema_name AND c.conname = e.object_name
      )
      ELSE false
    END AS present
  FROM expected_objects e
),
dependency_checks AS (
  SELECT * FROM (VALUES
    ('table','public','comments',to_regclass('public.comments') IS NOT NULL),
    ('table','public','votes',to_regclass('public.votes') IS NOT NULL),
    ('table','public','notifications',to_regclass('public.notifications') IS NOT NULL),
    ('table','public','notification_preferences',to_regclass('public.notification_preferences') IS NOT NULL),
    ('table','public','hazard_types',to_regclass('public.hazard_types') IS NOT NULL),
    ('table','public','news_categories',to_regclass('public.news_categories') IS NOT NULL),
    ('table','public','pages',to_regclass('public.pages') IS NOT NULL),
    ('function','public','has_role',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='has_role')),
    ('function','public','has_min_role',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='has_min_role')),
    ('function','public','role_rank',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='role_rank')),
    ('function','public','is_suspended',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='is_suspended')),
    ('extension','public','postgis',EXISTS (SELECT 1 FROM pg_extension WHERE extname='postgis')),
    ('extension','public','pg_net',EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_net')),
    ('extension','public','pg_cron',EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron'))
  ) AS d(kind, schema_name, object_name, present)
),
catalog_tables AS (
  SELECT c.oid, n.nspname AS schema_name, c.relname AS table_name,
         c.relkind, c.relrowsecurity AS rls_enabled,
         c.relforcerowsecurity AS rls_forced,
         pg_get_userbyid(c.relowner) AS owner,
         COALESCE(s.n_live_tup, 0)::bigint AS estimated_live_rows
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  LEFT JOIN pg_stat_user_tables s ON s.relid=c.oid
  WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')
),
columns_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.table_name, x.ordinal_position),'[]'::jsonb) AS value
  FROM (
    SELECT table_schema, table_name, column_name, ordinal_position, data_type,
           udt_name, is_nullable, column_default, character_maximum_length,
           numeric_precision, numeric_scale
    FROM information_schema.columns WHERE table_schema='public'
  ) x
),
tables_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.table_name),'[]'::jsonb) AS value
  FROM catalog_tables x
),
policies_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.tablename, x.policyname),'[]'::jsonb) AS value
  FROM pg_policies x WHERE x.schemaname='public'
),
triggers_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.event_object_table, x.trigger_name),'[]'::jsonb) AS value
  FROM information_schema.triggers x WHERE x.event_object_schema='public'
),
functions_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.proname, x.arguments),'[]'::jsonb) AS value
  FROM (
    SELECT n.nspname AS schema_name, p.proname,
           pg_get_function_identity_arguments(p.oid) AS arguments,
           p.prosecdef AS security_definer,
           COALESCE(array_to_string(p.proconfig, ', '),'') AS configuration,
           pg_get_userbyid(p.proowner) AS owner,
           pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f'
  ) x
),
constraints_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.table_name, x.constraint_name),'[]'::jsonb) AS value
  FROM (
    SELECT ns.nspname AS schema_name, rel.relname AS table_name,
           con.conname AS constraint_name, con.contype,
           pg_get_constraintdef(con.oid) AS definition,
           pg_get_userbyid(rel.relowner) AS table_owner
    FROM pg_constraint con JOIN pg_class rel ON rel.oid=con.conrelid
    JOIN pg_namespace ns ON ns.oid=rel.relnamespace
    WHERE ns.nspname='public'
  ) x
),
indexes_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.tablename, x.indexname),'[]'::jsonb) AS value
  FROM pg_indexes x WHERE x.schemaname='public'
),
table_grants_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.table_name, x.grantee, x.privilege_type),'[]'::jsonb) AS value
  FROM information_schema.role_table_grants x WHERE x.table_schema='public'
),
routine_grants_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.routine_name, x.grantee),'[]'::jsonb) AS value
  FROM information_schema.role_routine_grants x WHERE x.routine_schema='public'
),
extensions_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.extname),'[]'::jsonb) AS value
  FROM pg_extension x WHERE x.extname IN ('postgis','pg_net','pg_cron','uuid-ossp')
),
history_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.version),'[]'::jsonb) AS value
  FROM applied_migrations x
),
targets_json AS (
  SELECT jsonb_build_array(
    jsonb_build_object('task',26,'file','20260930100000_statistics_modernization_review.sql','status','review_only','depends_on',jsonb_build_array('baseline','role_helpers')),
    jsonb_build_object('task',27,'file','20260930110000_alert_notification_preferences_review.sql','status','review_only','depends_on',jsonb_build_array('notifications','alerts')),
    jsonb_build_object('task',28,'file',null,'status','no_migration','depends_on',jsonb_build_array('profiles')),
    jsonb_build_object('task',29,'file','20260930120000_contributor_leaderboard_review.sql','status','review_only','depends_on',jsonb_build_array('profiles','reputation')),
    jsonb_build_object('task',30,'file','20260930130000_admin_taxonomy_review.sql','status','review_only','depends_on',jsonb_build_array('taxonomy_tables')),
    jsonb_build_object('task',31,'file','20260930140000_location_architecture_review.sql','status','review_only','depends_on',jsonb_build_array('content_tables')),
    jsonb_build_object('task',43,'file','20260930150000_theft_vandalism_taxonomy_review.sql','status','review_only','depends_on',jsonb_build_array('taxonomy_tables','location')),
    jsonb_build_object('task',44,'file','20260930160000_notification_customization_review.sql','status','review_only','depends_on',jsonb_build_array('taxonomy_tables','alert_preferences')),
    jsonb_build_object('task',47,'file','20260930170000_push_delivery_reliability_review.sql','status','review_only','depends_on',jsonb_build_array('notification_customization')),
    jsonb_build_object('task',46,'file','20261001100000_feed_community_review.sql','status','review_only','depends_on',jsonb_build_array('comments','votes','notifications')),
    jsonb_build_object('task',49,'file','20261001110000_release_blocker_remediation_review.sql','status','review_only','depends_on',jsonb_build_array('feed','content_requests','role_helpers')),
    jsonb_build_object('task',50,'file','20261001120000_recycle_bin_review.sql','status','review_only','depends_on',jsonb_build_array('content_tables','feed','moderation_history')),
    jsonb_build_object('task',51,'file',null,'status','documentation_only','depends_on',jsonb_build_array('catalog_access')),
    jsonb_build_object('task','known','file','20260929120000_report_unknown_campaign_review.sql','status','known_applied_do_not_replay','depends_on',jsonb_build_array('baseline')),
    jsonb_build_object('task','protected','file','20260929130000_subscription_payments_schema_review.sql','status','excluded_protected_do_not_execute','depends_on',jsonb_build_array('manual_review'))
  ) AS value
),
dependency_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.kind, x.object_name),'[]'::jsonb) AS value
  FROM dependency_checks x
),
presence_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.kind, x.object_name),'[]'::jsonb) AS value
  FROM object_presence x
),
row_estimates_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.table_name),'[]'::jsonb) AS value
  FROM catalog_tables x JOIN relevant_tables r ON r.table_name=x.table_name
)
SELECT jsonb_build_object(
  'audit', jsonb_build_object(
    'name','share_barabara_production_schema_audit',
    'version','task53.v1',
    'generated_at',now(),
    'database',current_database(),
    'server_version',current_setting('server_version'),
    'read_only_statement',true,
    'interpretation_note','Absence from migration history is not proof that a migration is unapplied; compare object definitions and review conflicts before execution.'
  ),
  'migration_history', (SELECT value FROM history_json),
  'migration_targets', (SELECT value FROM targets_json),
  'object_presence', (SELECT value FROM presence_json),
  'dependency_checks', (SELECT value FROM dependency_json),
  'tables', (SELECT value FROM tables_json),
  'columns', (SELECT value FROM columns_json),
  'rls_policies', (SELECT value FROM policies_json),
  'triggers', (SELECT value FROM triggers_json),
  'functions', (SELECT value FROM functions_json),
  'constraints', (SELECT value FROM constraints_json),
  'indexes', (SELECT value FROM indexes_json),
  'table_grants', (SELECT value FROM table_grants_json),
  'routine_grants', (SELECT value FROM routine_grants_json),
  'extensions', (SELECT value FROM extensions_json),
  'row_estimates', (SELECT value FROM row_estimates_json)
) AS production_schema_audit;
