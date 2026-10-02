# Task 59 — Production Database Migration Reconciliation

Status: **BLOCKED pending the actual 2 October 2026 production audit export**.

## Production input status

The requested export, `Pasted text(20261002-170112).txt`, is not available in
the repository or mounted workspace. The canonical import target
`docs/database-audits/production-schema-audit-2026-10-02.json` is therefore not
present. No production-specific migration can be classified as applied,
partially applied, unapplied, or conflicting from this workspace.

The earlier readiness document is repository analysis only and is not being
treated as the production audit. The previously reported
`20260929120000_report_unknown_campaign_review.sql` remains **KNOWN APPLIED by
prior repository evidence, but production history and schema effects are
UNCONFIRMED in this task**. It must not be rerun without comparing its actual
history row, columns, constraints, policies and function definition.

## Safe import path

The importer is `scripts/import-production-schema-audit.mjs`. It accepts:

- the raw JSON object returned by the SQL Editor;
- a one-row export containing `production_schema_audit`;
- a wrapper containing `data` and `production_schema_audit`;
- a `.txt` file whose contents are valid JSON.

Run locally after receiving the real export:

```text
node scripts/import-production-schema-audit.mjs "Pasted text(20261002-170112).txt"
node scripts/analyze-production-schema-audit.mjs docs/database-audits/production-schema-audit-2026-10-02.json
```

The importer validates the audit name, read-only marker and required catalog
arrays before writing the canonical JSON. It does not connect to Supabase or
execute SQL.

The subscription migration is **PROTECTED / EXCLUDED** from this reconciliation
and from every proposed execution sequence.

## Repository migration inventory and dependency order

Production status for every row below is **BLOCKED / UNCONFIRMED** until the
actual export is processed. Existing object presence must not be treated as
proof that its migration was fully applied.

| Order | Task | Migration | Repository purpose and hard dependency |
|---:|---|---|---|
| 1 | 54 / AI foundation | `20260927120000_share_barabara_ai.sql` | AI chat tables/RLS and public Article/Alert policy hardening; requires existing `news`, `alerts`, auth and role assumptions. |
| — | Known exception | `20260929120000_report_unknown_campaign_review.sql` | Previously reported applied; do not replay. Reconcile history and all schema effects first. |
| — | Protected | `20260929130000_subscription_payments_schema_review.sql` | Excluded. Never stage, edit or execute as part of Task 59. |
| 2 | 26 | `20260930100000_statistics_modernization_review.sql` | Statistics datasets/observations/proposals, provenance and publication guards; requires role helpers and existing statistics compatibility. |
| 3 | 27 | `20260930110000_alert_notification_preferences_review.sql` | Existing preference-row extensions and active-alert notification matching; requires alerts, notifications, coordinates and existing preference policies/triggers. |
| 4 | 29 | `20260930120000_contributor_leaderboard_review.sql` | Leaderboard RPC and indexes; requires profiles, votes and the existing reputation formula. |
| 5 | 30 | `20260930130000_admin_taxonomy_review.sql` | Taxonomy lifecycle/display fields and staff RLS; requires all existing taxonomy lookup tables. |
| 6 | 31 | `20260930140000_location_architecture_review.sql` | Optional Article location fields and coordinate checks/indexes; requires content tables and existing location columns. |
| 7 | 43 | `20260930150000_theft_vandalism_taxonomy_review.sql` | Parent/subtype taxonomy metadata, incident type and seeded values; requires Task 30 shape and duplicate-value review. |
| 8 | 44 | `20260930160000_notification_customization_review.sql` | Category/channel/mute/exclusion fields and notification trigger replacements; requires Tasks 27 and 43. |
| 9 | 47 | `20260930170000_push_delivery_reliability_review.sql` | Push subscriptions, outbox jobs/attempts and enqueue trigger; requires Task 44 and separate VAPID/worker readiness. |
| 10 | 46 | `20261001100000_feed_community_review.sql` | Feed posts/reports/blocks, vote constraint extension and discussion notifications; requires comments, votes, notifications and preference functions. |
| 11 | 49 | `20261001110000_release_blocker_remediation_review.sql` | Comment moderation state, append-only history and Feed notification/block policy replacements; requires Task 46 and content-request roles. |
| 12 | 50 | `20261001120000_recycle_bin_review.sql` | Soft deletion, recycle-bin history and restore/permanent-delete functions; requires source tables and Task 49 moderation state. Must be last. |

Historical migrations through `20260904130000_*.sql` are also not production-
confirmed here and must be handled by the project's authoritative migration
history, not by replaying filenames from this report.

## Static risks found without production input

- Task 26 and several later files use plain `CREATE POLICY`; an existing
  policy with the same name can abort execution.
- Task 27, 30, 31, 43 and 44 contain `ALTER TABLE` or data-changing statements
  whose safety depends on actual columns, existing values and policy state.
- Task 43 seeds taxonomy rows without a universal duplicate-safe conflict
  strategy; existing machine values must be compared before execution.
- Task 44 and Task 47 replace notification functions/triggers. Existing
  definitions must be captured and reviewed, not overwritten solely because a
  `CREATE OR REPLACE` succeeds.
- Task 46 replaces the votes constraint and creates Feed policies/triggers;
  existing comments, votes and notification behavior are prerequisites.
- Task 49 and Task 50 replace public visibility policies. These are release
  blockers if old policies could expose removed, private or soft-deleted rows.
- Task 50 SECURITY DEFINER functions require owner, fixed `search_path`, safe
  function bodies and restricted EXECUTE grants. No production conclusion is
  possible without the exported function definitions and grants.
- Subscription payment objects are intentionally outside this plan.

## Reconciliation procedure after import

For each migration, compare the audit's migration history, columns, table
owners/RLS, policy expressions, trigger definitions, function definitions and
grants against the repository SQL. Classify only after comparison:

- **already applied**: exact history evidence plus compatible object review;
- **partially applied**: some effects exist but history or required effects do
  not match;
- **not applied**: history absent and no required effects exist, never from
  history absence alone;
- **conflicting**: an existing object has incompatible semantics or a required
  statement would collide;
- **requires further verification**: insufficient definition/data evidence.

The known report/campaign migration must be checked for its actual history row,
nullable count columns, constraints, insert policy, synchronization function,
function grants and trigger behavior before the chain proceeds.

## Safe execution plan once unblocked

1. Preserve the exported audit JSON and take a Supabase backup/snapshot.
2. Resolve the baseline and known-applied history; do not replay the known
   report/campaign migration.
3. Review/apply the AI foundation migration if its objects are absent and
   compatible.
4. Apply Tasks 26, 27, 29, 30, 31, 43, 44, 47, 46, 49 and 50 in that order,
   one migration at a time, only after its gate passes.
5. After every migration, verify its history row and smoke-test RLS, triggers,
   functions and public/private visibility before continuing.
6. Keep push dispatch disabled until VAPID bindings, worker scheduling and
   real-device delivery are separately verified.
7. Do not include or execute the protected subscription migration.

Rollback is not deletion of migration-history rows. If a migration fails,
stop, retain the error and audit snapshot, and use a reviewed forward-fix or
restore the approved backup. Task 50 restore/permanent-delete functions must
be tested with disposable records before real content is changed.

## Owner action required

Provide the actual exported JSON/text file, without credentials. Place it
anywhere locally and run the importer above, or provide the file path. Until
then, production reconciliation remains blocked and no migration should be
executed based on this report.
