# Task 51 — Production Database Migration Readiness

Status: review-only. No SQL was executed by Codex.

## Access finding

The repository exposes only the Supabase project ID, URL and publishable
client key through local configuration. There is no database connection URL,
service-role key, Supabase CLI access token, or privileged read-only channel.
The publishable key is intentionally insufficient for inspecting PostgreSQL
catalogs, migration history, RLS policies, triggers, functions, constraints,
indexes and grants. No production request was made and no credential value is
recorded here.

The only migration explicitly known from repository evidence to have already
been applied is:

`supabase/migrations/20260929120000_report_unknown_campaign_review.sql`

Do not schedule that file for execution again. All other production applied
status is unknown until the read-only queries below are run against the live
database. The subscription migration is protected, separate, and excluded.

## Read-only inspection SQL

Run these individually in the Supabase SQL Editor using a role permitted to
read metadata. They contain no writes.

```sql
-- 1. Applied migration history.
select version, name
from supabase_migrations.schema_migrations
order by version;

-- 2. Relevant tables and columns, including Task 50 soft-delete fields.
select table_schema, table_name, column_name, data_type, is_nullable,
       column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'profiles','user_roles','news','alerts','accident_reports','comments',
    'videos','pages','campaigns','infrastructure_issues','votes',
    'notifications','notification_preferences','feed_posts','feed_blocks',
    'feed_post_reports','content_requests','moderation_action_history',
    'statistics_datasets','statistics_observations','taxonomy_values',
    'hazard_types','alert_severities','report_severities',
    'notification_prefs','notification_preference_categories',
    'push_subscriptions','notification_delivery_jobs',
    'notification_delivery_attempts','recycle_bin_items','recycle_bin_history'
  )
order by table_name, ordinal_position;

-- 3. Policies and their effective expressions.
select schemaname, tablename, policyname, permissive, roles,
       cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 4. Triggers and trigger functions.
select event_object_schema, event_object_table, trigger_name,
       event_manipulation, action_timing, action_statement
from information_schema.triggers
where event_object_schema = 'public'
order by event_object_table, trigger_name;

-- 5. Public functions, security mode and search path.
select n.nspname as schema_name, p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       coalesce(array_to_string(p.proconfig, ', '), '') as configuration,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
order by p.proname, arguments;

-- 6. Constraints and foreign keys for migration dependency checks.
select con.conname, rel.relname as table_name,
       pg_get_constraintdef(con.oid) as definition,
       con.contype
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace ns on ns.oid = rel.relnamespace
where ns.nspname = 'public'
order by rel.relname, con.conname;

-- 7. Indexes and partial predicates.
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 8. Table grants and function execution grants.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
order by table_name, grantee, privilege_type;

select routine_schema, routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
order by routine_name, grantee;

-- 9. Extensions relevant to location and push work.
select extname, extversion
from pg_extension
where extname in ('postgis', 'pg_net', 'pg_cron', 'uuid-ossp');

-- 10. Existing row counts before any migration application.
select relname as table_name, n_live_tup as estimated_live_rows
from pg_stat_user_tables
where schemaname = 'public'
  and relname in (
    'news','alerts','accident_reports','comments','videos','pages',
    'campaigns','infrastructure_issues','feed_posts','notifications',
    'push_subscriptions','recycle_bin_items'
  )
order by relname;
```

Save the result set before migration application. For the applied-history
query, compare by exact `version`; do not infer application from a table or
column existing.

## Required execution order

1. Confirm the baseline migrations through `20260904130000` are present in
   `supabase_migrations.schema_migrations` in filename order. Do not replay
   any baseline file already recorded as applied.
2. Confirm `20260927120000_share_barabara_ai.sql` status. Apply only if absent,
   after its public Article/Alert policy assumptions are reviewed.
3. Confirm `20260929120000_report_unknown_campaign_review.sql` is applied. It
   is already recorded as applied by repository evidence; do not replay it.
4. Keep `20260929130000_subscription_payments_schema_review.sql` separate and
   protected. It is not part of this release sequence.
5. Apply `20260930100000_statistics_modernization_review.sql` after confirming
   the existing statistics tables and role helpers.
6. Apply `20260930110000_alert_notification_preferences_review.sql` after the
   statistics migration and after checking existing notification policies.
7. Apply `20260930120000_contributor_leaderboard_review.sql`.
8. Apply `20260930130000_admin_taxonomy_review.sql`.
9. Apply `20260930140000_location_architecture_review.sql`.
10. Apply `20260930150000_theft_vandalism_taxonomy_review.sql` after the
    taxonomy and location changes.
11. Apply `20260930160000_notification_customization_review.sql` after the
    taxonomy and alert-preference tables exist.
12. Apply `20260930170000_push_delivery_reliability_review.sql` after the
    notification customization schema and role helpers are confirmed.
13. Apply `20261001100000_feed_community_review.sql` after `comments`, `votes`,
    notifications and the Task 27/44 preference functions are confirmed.
14. Apply `20261001110000_release_blocker_remediation_review.sql` after Feed,
    comments, content requests and role helpers are confirmed.
15. Apply `20261001120000_recycle_bin_review.sql` last. It depends on the
    source tables, Feed/comments schema, role helpers and moderation policy
    state created or hardened by the earlier files.

## Compatibility and conflict gates

- `20260929120000_report_unknown_campaign_review.sql` is the known-applied
  exception. Verify its exact version before any run.
- Earlier review migrations contain non-idempotent or conditionally unsafe
  objects: several plain `CREATE POLICY`, `CREATE TRIGGER`, constraints and
  grants. Existing objects with different semantics must be reviewed rather
  than hidden with blanket `IF NOT EXISTS` changes.
- The statistics migration creates tables, policies, triggers and provenance
  objects but does not automatically publish legacy values. Confirm table and
  policy absence/compatibility first.
- Alert preferences and notification customization touch overlapping
  notification policy concepts. Compare existing policy names and functions
  before applying either migration.
- Push delivery assumes notification preferences, push subscription ownership,
  outbox tables and scheduled-dispatch configuration. It must not be enabled
  merely because the tables exist.
- Feed creates `feed_posts`, extends `votes`, and creates notification/comment
  triggers. Confirm no equivalent production objects exist with incompatible
  definitions before application.
- Release-blocker remediation replaces comment policy/trigger behavior and
  adds append-only moderation history. Confirm Task 46 objects are present.
- Task 50 adds nullable `deleted_at`, deletion metadata and public-policy
  replacements to eligible content tables. Confirm every old permissive public
  policy is removed; otherwise soft-deleted rows could remain publicly visible.
- Task 50 functions are `SECURITY DEFINER`. Verify their owner, fixed
  `search_path`, revoked public execution, authenticated execution grants and
  owner/admin checks before use.
- No migration may modify the protected subscription migration or infer that
  subscription tables are safe to apply as part of this sequence.

## Backup and rollback strategy

Before applying any migration:

1. Create a Supabase project backup/snapshot and record its timestamp.
2. Export the metadata query results above and store them with the release
   record.
3. Export affected table data before Task 50, especially content rows,
   policies and notification tables.
4. Apply one migration at a time in a maintenance window, checking the
   migration-history row and smoke-querying its objects after each step.
5. Do not roll back by deleting migration-history rows. If a migration fails,
   stop, preserve the error and restore from the approved backup or use a
   separately reviewed forward-fix migration.
6. For Task 50 specifically, verify soft-delete visibility and restore/purge
   functions with test records before using them on real content.

There is no safe offline rollback claim for arbitrary RLS, trigger or data
changes. Any corrective SQL must be reviewed as a new migration and tested
against the captured schema snapshot.

## Current conclusion

Production schema application is blocked pending privileged read-only
inspection and backup confirmation. No migration should be executed from this
repository state solely on the basis of local files.
