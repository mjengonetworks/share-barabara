# Task 53 — Consolidated Read-Only Supabase Production Database Verification

Status: **NOT VERIFIED — OWNER READ-ONLY ACTION REQUIRED**
Verification date: **2026-10-12**
Supabase project: `yhqoggbntunxvlbcatwj` (staging and production share it)

## Result

No authorized live database connection was available in this workspace. No SQL
was sent to Supabase, and no database write, migration, deployment, provider
activation, or synthetic-data operation was performed. The two local copies of
the owner export from 2026-10-02 are byte-identical historical evidence, not a
current production verification.

The exact read-only audit is committed at
`supabase/inspection/production_schema_audit.sql`. It returns one JSON object
and reads only the migration ledger, PostgreSQL catalog, tables/columns, RLS
policies, triggers, functions, constraints, indexes, table/routine grants,
extensions, and estimated row counts. The local comparison utility is
`scripts/analyze-production-schema-audit.mjs`; it never connects to Supabase.

## Access determination

The workspace contains no database URL, PostgreSQL credential, service-role
key, Supabase CLI token, or privileged read-only connector. The publishable
application key is not sufficient for catalog or migration-ledger inspection.
Therefore the actual production database remains **unverified**.

The 2026-10-02 owner export is useful historical evidence only. It reported 54
ledger rows through `20260827190108_merch_cart_and_variants`, PostgreSQL 17.6,
133 public RLS policies, 26 public functions, 1,370 table grants, 82 routine
grants, `pg_cron` and `uuid-ossp`, and no `postgis` or `pg_net`. It must not be
described as the current live state.

## Migration reconciliation

The repository inventory contains 71 migrations. For current production, every
file in the inventory is **UNVERIFIED** because no live read-only audit was
available. No migration is classified as verified applied or verified absent.
The historical export shows conflict signals that require owner review:

- AI and report/campaign effects appeared in the catalog while their
  migration-history rows were absent; do not replay either file.
- The report/campaign sync function differed from the repository definition;
  treat this as live drift until the owner resolves it.
- Notification preferences were legacy/partially prepared and conflicted with
  the Task 27 contract.
- Feed objects were absent and the existing vote entity constraint conflicted
  with the Feed migration.
- The subscription-payment migration remains **PROTECTED / EXCLUDED** and is
  not part of the general sequence.

These are historical conflict signals, not claims about the database on
2026-10-12. Migration-history absence is never proof of absence.

| Current-production classification | Repository migrations |
|---|---|
| Unverified | Every migration listed in `supabase/migrations/` (71 files), including the baseline chain and later review-only files |
| Unverified / protected | `20260929130000_subscription_payments_schema_review.sql` |
| Verified applied | None |
| Verified absent | None |
| Current conflict classification | None can be confirmed without a fresh live export; historical conflict signals are recorded above |

## RLS, grants, dependencies, and recovery

RLS, function security, trigger definitions, grants, extension availability,
and protected payment/subscription dependencies cannot be freshly verified
without the owner-run query. The historical export showed enough legacy
notification/vote overlap to block blind execution of Tasks 27, 44, 46, 49 and
50. The safe order remains: read-only audit, backup/snapshot, ledger and drift
reconciliation, Statistics, notification preferences, leaderboard, taxonomy,
location, notification customization, push, Feed, moderation, then Recycle
Bin. Payments stay separate.

No backup, snapshot, restore test, or rollback evidence was available in this
workspace. Rollback must mean restoring an owner-approved backup or applying a
separately reviewed forward fix; deleting migration-history rows is not
rollback.

## Exact minimum owner action

In Supabase SQL Editor, against project `yhqoggbntunxvlbcatwj`, run only the
contents of `supabase/inspection/production_schema_audit.sql` using a role
authorized to read PostgreSQL metadata. Export the single
`production_schema_audit` JSON result without editing it and provide:

1. the fresh export and its generation timestamp;
2. the approved backup/snapshot identifier, timestamp, retention/restore
   evidence; and
3. the database/release owner's decision for the AI/report ledger and function
   drift.

Do not run a migration in that session. Until those artifacts exist, no
production migration is authorized.

## Statistics map decision

Statistics map implementation may continue as source/documentation work, but
production schema activation, backfill, RLS acceptance, or any migration write
cannot safely proceed. It remains blocked on the fresh audit, backup evidence,
and an approved first migration.
