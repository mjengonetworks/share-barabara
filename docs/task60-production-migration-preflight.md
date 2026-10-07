# Task 60 — Production Migration Preflight

This package carries forward the validated Task 59 reconciliation. It is a preflight
plan, not authorization to execute SQL.

## Production facts from the supplied Task 59 audit

- AI and report/campaign effects exist without matching migration-history rows.
- The live campaign-sync function includes `FOR UPDATE SKIP LOCKED`; preserve it and do
  not replay the repository migration blindly.
- Statistics, Feed, moderation, recycle-bin, leaderboard, taxonomy lifecycle, Article
  location, notification customization and push objects are absent or incomplete.
- `pg_cron` exists; `postgis` and `pg_net` were absent.
- The subscription-payment migration is protected and excluded.

## Dependency-aware order

1. Take a Supabase backup/snapshot and record its timestamp.
2. Reconcile the AI/report migration-ledger discrepancy and record the live campaign-sync
   definition decision. Do not insert history rows without the database/release owner's
   explicit decision.
3. Apply and verify Statistics only after its publication/RLS checks pass.
4. Review and apply the Task 27 notification preference/deduplication changes against
   the existing legacy function, preserving owner-only policies.
5. Apply and verify leaderboard, then taxonomy lifecycle, then Article location changes.
6. Apply Theft/Vandalism taxonomy metadata and seeds without rewriting historical values.
7. Apply notification customization only after Task 27/43 compatibility is confirmed.
8. Apply push tables/outbox only after worker/VAPID readiness is separately approved;
   keep dispatch disabled.
9. Apply Feed schema only after reviewing existing vote data and replacing the incompatible
   vote entity constraint deliberately.
10. Apply moderation history and Feed moderation changes.
11. Apply Recycle Bin last, after validating source soft-delete columns, functions, grants
    and parent-child safety.

Run one migration at a time. Verify history, catalog objects, RLS, function definitions,
representative row counts and application behavior after each write. Stop on any mismatch.

## Security gates

Review every `SECURITY DEFINER` function for a fixed `search_path`, restricted grants and
owner/staff authorization. Back up current policies and trigger/function definitions
before notification, Feed, moderation or recycle-bin changes. Never treat missing history
as proof a migration is unapplied, and never delete history rows as rollback.

## Rollback and verification

Rollback means restoring the approved backup or applying a separately reviewed forward fix,
not deleting migration history. Verify that public policies exclude unpublished/deleted
records, that notification triggers deduplicate and honor preferences, and that no legacy
statistics rows become authoritative without provenance.

## Next owner-approved action

Approve a backup/snapshot and a separately reviewed first write for Statistics only after
the AI/report ledger and live campaign-sync function drift have been resolved. This report
does not authorize that write and Codex did not execute SQL.
