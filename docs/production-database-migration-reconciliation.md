# Task 59 — Production Database Migration Reconciliation

Status: **AUDIT COMPLETE — MIGRATION EXECUTION STILL BLOCKED**

No SQL was executed and no production data was changed. The supplied export
was read directly from the owner's local Downloads path with the existing
Task 59 validator. The export itself is deliberately not copied into the
repository.

## A. Production audit input

Validated input:

- `share_barabara_production_schema_audit_2026-10-02.json`
- Audit name: `share_barabara_production_schema_audit`
- Audit version: `task53.v1`
- Generated: `2026-10-02T17:00:59.245302+00:00`
- PostgreSQL server: `17.6`
- Read-only marker: `true`

The audit's migration history contains the baseline through
`20260827190108_merch_cart_and_variants`. It does not contain the later AI,
report/campaign, or Task 26–50 review migration versions. That absence is not
treated as proof of non-application; the classifications below also use the
catalog objects, definitions, columns, policies, triggers and constraints
returned by the audit.

Migration-history absence alone is not proof that a migration is unapplied.

## B. Reconciliation summary

| Migration | Classification | Evidence and decision |
|---|---|---|
| `20260927120000_share_barabara_ai.sql` | **Partially applied / history missing; do not replay** | `ai_chat_threads` and `ai_chat_messages` exist with the expected columns, constraints, indexes, owner-only RLS policies and thread trigger. The migration-history row is absent, so the deployment record must be reconciled separately. Existing Article/Alert public policies also need a deliberate policy-definition review before any history repair. |
| `20260929120000_report_unknown_campaign_review.sql` | **Applied effects present / history missing; do not replay** | `accident_reports` has nullable `vehicles_involved`, `casualties` and `fatalities`, and the three expected nonnegative `NOT VALID` checks. `reports_insert_own` matches the approved policy. `sync_past_campaign_reports()` exists with fixed `search_path` and restricted routine grants, but its live definition includes `FOR UPDATE SKIP LOCKED`, which is not in the repository file. Treat this as live drift or a later hardening patch, not permission to rerun. |
| `20260930100000_statistics_modernization_review.sql` | **Not applied** | All three required tables (`statistics_datasets`, `statistics_observations`, `statistics_update_proposals`) are absent from the audit catalog/object checks. No public statistics migration effects were found. |
| `20260930110000_alert_notification_preferences_review.sql` | **Conflicting partial state** | The base preference table and a `notify_nearby_users_on_alert()` function exist, but the required preference columns, match index, notification provenance/dedupe columns and replacement policies are absent. The live function is the older radius-only implementation and does not match Task 27's publication, content-filter or dedupe contract. |
| `20260930120000_contributor_leaderboard_review.sql` | **Not applied** | `get_contributor_leaderboard()` is absent. Existing profiles/votes are prerequisites only; they do not prove the RPC/index migration ran. |
| `20260930130000_admin_taxonomy_review.sql` | **Not applied** | Existing lookup tables are present, but the expected lifecycle/display additions and active/order indexes are not evidenced. Existing editor policies remain the baseline policies. |
| `20260930140000_location_architecture_review.sql` | **Partially prepared, migration not applied** | Alerts and reports already have optional county/road/road_id/latitude/longitude fields from the baseline. Articles do not have the new location fields, and the expected location indexes/constraints are not evidenced. No PostGIS extension is installed. |
| `20260930150000_theft_vandalism_taxonomy_review.sql` | **Not applied** | `hazard_types` has no `parent_value`; `news_categories` has no `parent_name`; `accident_reports` has no `incident_type`; the parent-self constraint is absent. Existing taxonomy rows must not be reinterpreted or backfilled automatically. |
| `20260930160000_notification_customization_review.sql` | **Not applied; blocked by Task 27/43** | `notification_hazard_type_matches()` and the category/account notification trigger replacements are absent. Existing notification preferences contain only the legacy fields. |
| `20260930170000_push_delivery_reliability_review.sql` | **Not applied** | `push_subscriptions`, `notification_delivery_jobs`, `notification_delivery_attempts` and `enqueue_notification_push_job()` are absent. Push remains disabled regardless of application code. |
| `20261001100000_feed_community_review.sql` | **Not applied with a direct constraint conflict** | `feed_posts`, `feed_post_reports` and `feed_blocks` are absent. The existing `votes_entity_type_check` only allows `alert`, `report` and `comment`; it does not allow the Feed entity types required by the migration. Do not replace it until the Feed schema and existing vote data are reviewed. |
| `20261001110000_release_blocker_remediation_review.sql` | **Not applied** | `moderation_action_history` is absent. It also depends on the missing Feed tables and must not be run independently. |
| `20261001120000_recycle_bin_review.sql` | **Not applied** | `recycle_bin_items`, `recycle_bin_history`, restore/permanent-delete functions and the expected owner index are absent. No source-table soft-delete columns were returned for the eligible content tables. This must remain last. |
| `20260929130000_subscription_payments_schema_review.sql` | **PROTECTED / EXCLUDED** | Not reconciled into this execution plan. The repository file and subscription implementation remain protected and unmodified. |

## C. Confirmed production prerequisites and security observations

The export confirms these existing objects are available as prerequisites:

- `news` (23 rows), `alerts` (13), `accident_reports` (12), `comments` (14),
  `votes` (15), `notifications` (63), `notification_preferences` (10),
  `profiles` (23), `content_requests` (1), `campaigns` (1), `roads` (14),
  and the existing taxonomy lookup tables.
- RLS is enabled on the relevant existing tables.
- `notification_preferences` has owner-only `ALL` access for authenticated
  users. It currently stores private latitude/longitude, but not the Task 27
  extended matching controls.
- `notifications` has owner-only read/update policies. No public read policy
  was observed.
- Existing public content policies expose published News, active Alerts and
  approved Reports; later Task 50 soft-delete exclusions are not present.
- `notify_nearby_users_on_alert()` is `SECURITY DEFINER` with
  `search_path=public`, but its live body is the older implementation and
  inserts notifications without Task 27 provenance/dedupe fields.
- `sync_past_campaign_reports()` is `SECURITY DEFINER` with
  `search_path=public`; `EXECUTE` was returned for `postgres` and
  `service_role`, not `anon` or `authenticated`. Its live `FOR UPDATE SKIP
  LOCKED` behavior differs from the repository patch and needs a recorded
  source-of-truth decision.
- Extensions include `pg_cron` and `uuid-ossp`; `postgis` and `pg_net` were
  not returned. No migration in this plan should assume PostGIS or a push
  network extension.

## D. Migration conflicts and non-idempotent risks

1. The AI and report/campaign schema effects exist without matching history
   rows. Do not rerun either file. Reconcile the migration ledger and preserve
   the live function definition until its origin is established.
2. Task 27 would replace an existing notification function and add constraints
   and columns to a live table. It must be split or reviewed if the production
   migration runner cannot safely apply its plain `ADD CONSTRAINT` statements.
3. Task 30 uses data updates and plain constraints/policies. Existing lookup
   rows and policy definitions must be compared before execution.
4. Task 43 inserts taxonomy values with `ON CONFLICT (value/name) DO NOTHING`,
   but its parent columns and labels must exist first. It does not provide a
   historical mapping.
5. Task 44 replaces notification behavior and updates existing preferences;
   it must not run against the legacy Task 27 function state without a backup
   and definition review.
6. Task 46's vote constraint has an incompatible existing definition. Existing
   votes must be checked before a reviewed constraint replacement.
7. Task 49 replaces moderation and notification policies and cannot run until
   Feed tables exist.
8. Task 50 changes public visibility and adds `SECURITY DEFINER` deletion/
   restoration functions. Its owner, fixed search path, grants, source-table
   columns and all old policies must be checked before execution.

## E. Safe dependency-aware order

The following is a plan, not authorization to execute:

1. Record the existing baseline as applied through `20260827190108` and
   separately reconcile the already-present AI/report effects. Do not replay
   `20260927120000` or `20260929120000`.
2. Take a Supabase backup/snapshot and preserve the exported audit as a release
   artifact outside the application repository.
3. Apply Task 26 Statistics only after its three tables, role helper
   assumptions, RLS and publication constraints pass a fresh gate.
4. Apply Task 27 preference/dedupe changes after reviewing the existing
   `notification_preferences` columns, policies and live alert trigger.
5. Apply Task 29 leaderboard RPC/index changes.
6. Apply Task 30 taxonomy lifecycle changes.
7. Apply Task 31 optional Article location and coordinate constraints.
8. Apply Task 43 Theft/Vandalism parent/subtype metadata and seeds.
9. Apply Task 44 notification customization and trigger replacements.
10. Apply Task 47 push tables/outbox only after Task 44 and worker/VAPID
    readiness are separately approved. Do not enable dispatch automatically.
11. Apply Task 46 Feed schema and vote constraint replacement after checking
    existing vote data.
12. Apply Task 49 moderation history and Feed moderation policy changes.
13. Apply Task 50 recycle-bin fields, policies and functions last.

Run one migration at a time. After each write, verify its history row, object
definitions, RLS and a representative application smoke test before continuing.

## F. Backup, rollback and verification precautions

- Take a Supabase snapshot/backup and record its timestamp before the first
  write.
- Export the catalog audit and affected table row counts as release evidence.
- Back up existing policies, trigger/function definitions and notification
  rows before Tasks 27, 44, 46, 49 and 50.
- Do not delete migration-history rows as rollback. If a migration fails, stop,
  retain the error and restore the approved backup or write a separately
  reviewed forward-fix migration.
- Rollback is not deletion of migration-history rows.
- Test Task 50 restore/purge functions only with disposable records first.
- Keep push dispatch disabled until VAPID bindings, scheduler/worker setup and
  real-device delivery are verified.

## G. Exact next owner-approved SQL action

No feature migration is approved by this report. The next SQL action requiring
owner approval is:

> Take a production Supabase backup/snapshot, record its timestamp, and then
> approve a separately reviewed first write for Task 26 only after the AI and
> report/campaign effects are recorded as already present and not replayed.

Before that first write, the owner must resolve the missing migration-history
entries and the live `sync_past_campaign_reports()` definition drift with the
database/release owner. If that ledger decision is not made, stop at backup
and do not execute Task 26.

The first post-migration verification must confirm the three Statistics tables,
their RLS/publication guards, and that no legacy aggregate row was backfilled
or silently marked authoritative.

## H. Owner actions remaining

1. Keep the exported audit JSON as an external release artifact; it is not
   committed here.
2. Resolve the AI/report migration-history discrepancy and function drift.
3. Approve the backup/snapshot and the one-at-a-time execution plan.
4. Execute only the approved migration, with post-migration catalog and browser
   checks after each step.
5. Perform the later live/browser/device checks for Statistics, notifications,
   taxonomy, Feed, moderation, push and Recycle Bin.

Task 59 is therefore **reconciled but not production-approved**. No SQL was
executed by Codex.
