# Task 70 ecosystem and advertising migration review

## Revised artifacts

- Migration: `supabase/migrations/20261021090000_task70_ecosystem_advertising_settings.sql`
- Read-only audit: `supabase/inspection/task70_ecosystem_advertising_audit.sql`

The migration now preflights the existing `banner_ads` shape and required role/timestamp functions, rejects incompatible same-name Task 70 tables, exposes only approved fields through public views, and grants table writes only to authenticated administrators through RLS. Public table access is revoked; PostgREST reads use the two public views. The views are explicitly security-definer (`security_invoker = false`) so revoking base-table reads does not break the intended public projection.

`banner_ads.is_demo` is an explicit marker with a default of `false`. The migration does not inspect titles, URLs, advertiser names, or update historical rows. Existing records and their current values are preserved; a row is excluded from genuine-ad selection only when an administrator or reviewed data process explicitly sets `is_demo = true`.

## Risks and missing evidence

The repository does not contain a live Supabase schema snapshot for the shared staging/production project, and this review has not executed a live catalog query. Compatibility of the following therefore remains unverified until the read-only audit is run against the real project:

- current `banner_ads` columns, grants, RLS policies, and paid-campaign fields;
- existence and signatures of `public.has_min_role` and `public.touch_updated_at`;
- migration history and possible pre-existing same-name relations;
- PostgREST visibility of the two projected views;
- existing advertiser/demo records and whether any application depends on an `is_demo` column already present.

The local historical migrations show a simpler `banner_ads` shape than the current product may have. No conclusion about live paid-campaign priority, impression, click, or advertiser fields should be drawn from that local history alone.

## Backup and execution gate

Before activation, the owner/operator should create or confirm a Supabase project backup/PITR restore point and record the project reference, timestamp, and operator. Export the definitions and rows for `public.banner_ads` plus any pre-existing same-name relations, and retain the migration/audit output. This agent has not created a backup or modified the hosted database.

Run the audit as a read-only role first. Activation is a separate controlled migration operation after the audit confirms the preflight assumptions and the backup is recorded.

## Rollback procedure

1. Stop the application release that depends on the new views/settings and preserve the audit output.
2. Confirm no administrator-edited rows exist in `ecosystem_previews` or `advertising_settings` that must be retained. Export them before any rollback.
3. If the new tables contain only approved defaults, drop the two public views, their grants, policies, triggers, indexes, and the two newly created tables in reverse dependency order through a reviewed rollback script. Do not run this automatically.
4. Do not delete or rewrite `banner_ads` records. If the `is_demo` column must be removed in a future reviewed rollback, first preserve its values and confirm no deployed code still references it; dropping the column is intentionally excluded from this migration.
5. Restore the prior application revision only after the database objects it references are no longer required.

If administrator customizations exist, retain the new tables and roll back application behavior instead of dropping data. There is no automatic rollback of existing advertisement classification because this migration performs none.

## Recommendation

**NO-GO for database execution at this time.** The revised SQL is materially safer and is ready for a read-only compatibility audit, but live schema/grant/RLS/function evidence and a recorded backup are still required. After those checks pass, the migration can be considered for a separately approved staging/production activation. No migration, hosted write, or deployment was performed in this change.
