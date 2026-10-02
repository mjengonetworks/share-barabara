# Task 58 — Production Database Audit & Migration Readiness

Status: review-only. No SQL was executed by Codex.

## Task 58 audit conclusion

This is a repository-side readiness audit only. Codex has no privileged
Supabase metadata connection in the local environment, so production applied
status is **UNCONFIRMED** except for the repository-documented exception
`20260929120000_report_unknown_campaign_review.sql`, which is treated as
**KNOWN APPLIED — DO NOT REPLAY**. The presence of an object, a working UI
fallback, or an absent migration-history row is not sufficient to classify a
migration as applied or unapplied.

The existing `supabase/inspection/production_schema_audit.sql` remains the
single consolidated read-only query for this task. It returns one structured
JSON value containing migration history, catalog tables/columns, RLS policies,
triggers, functions, constraints, indexes, grants, extensions, row estimates,
expected objects and dependency checks. Use it rather than running individual
queries. `scripts/analyze-production-schema-audit.mjs` remains the advisory
comparison utility; it deliberately reports missing evidence as
`not_confirmed`, never as proof of non-application.

### Status vocabulary used in this document

- **CONFIRMED** — directly established by the exported production audit or a
  separately recorded, authoritative deployment record.
- **KNOWN APPLIED** — established by existing repository/release evidence;
  verify the exact production migration-history row before relying on it.
- **UNCONFIRMED** — no privileged production evidence is available. This is
  the status for all other migrations in this local audit.
- **PRESENT BUT NOT PROVEN COMPATIBLE** — an expected table, function, policy,
  trigger, index or column already exists, but its definition has not been
  compared with the repository migration.
- **PROTECTED / EXCLUDED** — subscription payment work; it is not part of the
application sequence in this document.

Task 59 confirms that the actual 2 October 2026 production export is not
available in the workspace. Production-specific reconciliation therefore
remains blocked; see `docs/production-database-migration-reconciliation.md`.

## Task 58 migration inventory

The repository contains a large historical baseline through
`20260904130000_*.sql`, followed by the feature/review chain below. The
historical baseline is not production-confirmed locally and must not be
replayed blindly. The `20260929120000` file is the only known-applied review
exception. The subscription file is intentionally excluded.

| Task | Migration | Purpose and main objects | Dependencies / readiness risk |
|---|---|---|---|
| 54 / AI foundation | `20260927120000_share_barabara_ai.sql` | Hardens public News/Alert policies; creates `ai_chat_threads`, `ai_chat_messages`, indexes, RLS and owner triggers. | Depends on existing `news`, `alerts`, role/auth assumptions and compatible policy names. **UNCONFIRMED**. |
| Known applied | `20260929120000_report_unknown_campaign_review.sql` | Report insert policy, nullable/unknown casualty semantics and campaign-report synchronization function. | **KNOWN APPLIED — DO NOT REPLAY.** Verify exact history row and resulting columns/function before any later migration. |
| Protected | `20260929130000_subscription_payments_schema_review.sql` | Payment plans, subscription accounts/payments/events, service-role boundaries and public entitlement views. | **PROTECTED / EXCLUDED.** Do not edit, stage, execute, or include in the feature sequence. |
| 26 | `20260930100000_statistics_modernization_review.sql` | Statistics datasets, observations, update proposals, provenance, publication state, revision indexes, immutable/publish guards. | Requires role helpers and compatible statistics/publication assumptions. `CREATE POLICY` statements are not rerun-safe if objects already exist. Does not backfill legacy aggregates. |
| 27 | `20260930110000_alert_notification_preferences_review.sql` | Extends the existing `notification_preferences`, private geography indexes, notification provenance and active-alert matching trigger/function. | Requires existing `notification_preferences`, `notifications`, `alerts`, coordinate fields and compatible notification trigger/function. Overlapping notification policies/triggers are a hard gate. |
| 29 | `20260930120000_contributor_leaderboard_review.sql` | Replaces/creates leaderboard RPC and contributor vote/profile indexes. | Requires the existing reputation formula, profile/role helpers and compatible `votes` schema. Function replacement must be definition-reviewed. |
| 30 | `20260930130000_admin_taxonomy_review.sql` | Adds lifecycle/display fields and editor/admin RLS to news/page categories, hazard types and severities. | Requires all five lookup tables and compatible existing columns/policies. Several `ALTER TABLE ADD COLUMN` and plain policies are not safely repeatable. Includes data updates. |
| 31 | `20260930140000_location_architecture_review.sql` | Adds optional Article location fields, coordinate checks/indexes and `NOT VALID` Alert/Report coordinate constraints. | Requires `news`, `alerts`, `accident_reports` and existing location columns to be compared. No PostGIS is introduced. Existing invalid coordinates remain possible until separately audited. |
| 43 | `20260930150000_theft_vandalism_taxonomy_review.sql` | Adds parent metadata, Report incident type/indexes and initial Theft/Vandalism taxonomy rows. | Requires Task 30 taxonomy shape. Inserts have no duplicate-safe conflict strategy; existing values/labels must be checked before execution. No historical backfill is intended. |
| 44 | `20260930160000_notification_customization_review.sql` | Adds category/channel/mute/exclusion fields and replaces hazard matching and community/account notification triggers. | Requires Task 27 and Task 43 objects. `UPDATE` changes existing preference rows; current preference semantics and trigger definitions must be backed up and reviewed. |
| 47 | `20260930170000_push_delivery_reliability_review.sql` | Adds push subscriptions, delivery jobs/attempts, indexes, owner/admin RLS and notification outbox trigger. | Requires Task 27/44 notification functions and server dispatcher configuration. Tables alone do not activate push. Policies are plain `CREATE POLICY`; rerun requires history/object checks. |
| 46 | `20261001100000_feed_community_review.sql` | Adds Feed posts/reports/blocks, Feed indexes/RLS, extends vote entity types and comment/vote notification triggers. | Requires `comments`, `votes`, `notifications`, role helpers and Task 44 preference semantics. Constraint replacement and trigger replacement must be definition-reviewed. |
| 49 | `20261001110000_release_blocker_remediation_review.sql` | Adds reversible comment moderation state, append-only moderation history, staff audit triggers and Feed block-aware policies/notifications. | Requires Task 46 Feed tables, `comments`, `content_requests` and staff role helpers. Replaces policies/functions; ordering is mandatory. |
| 50 | `20261001120000_recycle_bin_review.sql` | Adds recycle-bin items/history, soft-delete metadata to eligible content and restore/permanent-delete RPCs; replaces public visibility policies. | Requires all source tables and Task 49 moderation state. `ADD COLUMN` statements and broad policy replacements are high-risk. Verify SECURITY DEFINER owner/search path/grants before use. |

Task 28 has no new migration. Task 51 and Task 53 are documentation/inspection
work, not database migrations. Tasks 42, 45, 54, 56 and 57 have no new
database migration in this chain.

## Live feature readiness without production evidence

The following classifications are repository conclusions, not live-schema
claims:

| Feature | Current code behavior | Database readiness classification |
|---|---|---|
| Public Articles, Alerts and approved Reports | Existing routes use legacy tables and publication filters. | **Conditionally supported** by the pre-existing schema; confirm policy compatibility. |
| Task 54 public/editorial AI | Server provider bindings are independent of pending SQL, aside from existing content/RLS reads. | **Code-ready; live schema not a blocker for provider calls**, but content reads still require existing policies. |
| Statistics modernization | Runtime deliberately remains on legacy tables before migration activation. | **Not activated; migration required for new authoritative workflow.** |
| Alert radius/preferences | Task 27 code has compatibility behavior, but private preference columns, matching trigger and provenance fields are migration-dependent. | **Do not classify as fully operational until Task 27 objects are confirmed.** |
| Leaderboard | Client can use the existing metric seam, but efficient production ranking depends on the RPC/indexes. | **Fallback/compatibility only until Task 29 RPC is confirmed.** |
| Admin taxonomy and Theft/Vandalism | UI can preserve existing text values, but lifecycle fields and parent/subtype rows are migration-dependent. | **Legacy values remain usable; managed taxonomy is not confirmed.** |
| Location architecture | Existing Alert/Report location fields are used; Article location additions are optional. | **Existing fields may work; Article location and coordinate constraints require confirmation.** |
| Notification customization | UI/matching seam exists, but category/channel/mute/exclusion columns and trigger replacements are migration-dependent. | **Do not call complete until Task 27/43/44 schema is confirmed.** |
| Push delivery | Worker/dispatcher code is configuration-gated. | **Disabled/not production-ready until Task 47 schema, VAPID configuration and device tests pass.** |
| Feed/community | Missing Feed tables/policies must be distinguished from a genuinely empty Feed. | **Keep compatibility/error state until Task 46 objects and RLS are confirmed.** |
| Moderation | Feed reports, comment moderation and append-only history depend on Task 46/49 objects. | **Staff workflow is not production-confirmed.** |
| Recycle Bin | Soft-delete fields, item/history tables and RPCs depend on Task 50. | **Keep disabled or guarded until all source columns/policies/functions are verified.** |
| Subscription payments | Protected review-only architecture. | **Separate manual review only; excluded from this sequence.** |

## Exact readiness gates before execution

For each candidate migration, compare the exported audit against the SQL,
not just table names:

1. Migration history version/name is known, or the migration is treated as
   unconfirmed.
2. Every required table and column exists with compatible type, nullability,
   default and ownership.
3. Existing policies with the same names and all policies on affected tables
   are reviewed for equivalent public/private/staff semantics.
4. Existing trigger names and function signatures/definitions are reviewed;
   `CREATE OR REPLACE` is not accepted as safe merely because it succeeds.
5. Existing constraints/indexes are compared, including partial predicates,
   GIN usage, `NOT VALID` status and uniqueness behavior.
6. SECURITY DEFINER functions have an approved owner, fixed safe
   `search_path`, no unsafe dynamic SQL, and only intended EXECUTE grants.
7. Data-changing statements are separately approved: Task 30 lifecycle label
   updates, Task 43 taxonomy inserts, Task 44 preference updates and any
   historical policy replacement.
8. A backup/snapshot and metadata export are recorded before the first write.

## Exact owner action required

1. In Supabase SQL Editor, use a role allowed to read PostgreSQL metadata.
2. Paste the complete contents of
   `supabase/inspection/production_schema_audit.sql` once and run it. Do not
   run any migration in the same session.
3. Export the single `production_schema_audit` JSON result without editing it.
4. Return the exported JSON for repository comparison. Do not paste secrets.
5. After the schema comparison is approved, take a production backup/snapshot
   and record its timestamp.
6. Execute only the approved migration sequence below, one file at a time,
   recording the migration-history row and post-migration smoke checks after
   every step.

## Post-migration verification checklist

- Confirm the expected migration-history version/name after each file.
- Confirm public Articles/Alerts/approved Reports exclude private, inactive,
  rejected and later soft-deleted rows.
- Confirm owner-only notification preferences and saved coordinates.
- Confirm active taxonomy values, stable machine values and archived-value
  compatibility.
- Confirm Alert/Report coordinate constraints and that no coordinates were
  fabricated or mass-geocoded.
- Confirm leaderboard RPC output is public-safe and does not include email,
  roles, subscription data or private fields.
- Confirm Feed public reads, authenticated posting, vote/comment/report/block
  permissions and staff review permissions.
- Confirm moderation history is append-only and staff-only.
- Confirm notification triggers create no duplicates and obey preferences,
  publication state and blocks.
- Confirm push tables/RLS exist but dispatch remains disabled until VAPID and
  real-device verification are complete.
- Confirm Recycle Bin owner/admin separation, moderation-removal separation,
  restoration state preservation and public soft-delete exclusion.
- Run browser smoke tests for Statistics, notifications, Feed, moderation,
  taxonomy, location forms and recycle-bin surfaces.

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
