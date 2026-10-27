# Cross-content production acceptance procedure

Status: prepared, not approved for execution.

This procedure applies only to the existing Share Barabara Supabase project
and must be executed by an owner-authorised operator. It does not authorize a
production migration or deployment.

## Release inputs

- Migration: `supabase/migrations/20261027120000_cross_content_editorial_relationships.sql`
- Database verification: `tests/cross-content-database.sql`
- Application branch: `feat/cross-device-editorial-ai`
- Latest prepared application commit: `86b05d9` plus any subsequent release commit
- Existing production code line integrated in the branch: `6b2b6bef87d3c361894fd9948c2978138f4b0914`

## Migration dependencies

The migration expects the existing baseline schema to provide:

- `auth.users` and `public.user_roles`.
- `public.has_role(uuid, public.app_role)` and
  `public.has_min_role(uuid, public.app_role)`.
- `public.news` with `status`, `author_id`, and publication fields.
- `public.accident_reports` with `user_id`, `status`, and incident fields.
- `public.alerts` with `user_id` and `status`.
- `public.campaigns` with `end_date` and `report_published`.
- `public.infrastructure_issues` with `user_id` and `status`.

The migration is additive. It does not backfill or update existing content.

## Required preflight

1. Confirm the active project reference and production database identity from
   the Supabase dashboard or owner-authorised management tooling.
2. Export a database backup and record the migration-history state.
3. Compare the live catalog against the dependency list above.
4. Confirm the migration filename has not already been applied.
5. Confirm no object with any `editorial_*` name conflicts with this migration.
6. Confirm the operator is using the production project intentionally.

## Controlled execution

Apply only this migration through the project’s reviewed migration workflow;
do not replay the repository migration directory:

```powershell
supabase link --project-ref <owner-confirmed-production-ref>
supabase db push --include-all
```

The operator must review the generated SQL plan and stop if it includes any
unrelated migration. The cross-content SQL must remain the only requested
change in this release.

## Acceptance sequence

Immediately after migration, run the read-only catalog checks and then execute
`tests/cross-content-database.sql` using an authorised database test role.
The harness creates transaction-scoped fixtures and rolls them back. It tests
anonymous, ordinary-user, editor and admin boundaries, draft-only behavior,
tags, relationships, duplicate protection, provenance, audit rows, public
filtering, cross-account rejection and existing-content preservation.

Then perform authenticated browser checks on each admin route:

- `/admin/articles`
- `/admin/reports`
- `/admin/alerts`
- `/admin/campaigns`
- `/admin/infrastructure-issues`

For each route, generate a related draft, edit it, save/reopen it, search and
link an existing record, assign/remove a tag, and finalize a saved target.
Confirm that the source remains unchanged and no record is auto-published.

Check public detail routes for each content type. Only published/approved/
active related records may appear; unpublished records must remain absent.

## Rollback

Do not blindly drop the new tables after data has been written. First disable
the application release and preserve the new tables for evidence. If rollback
is required before any cross-content data exists, use a separately reviewed
reverse migration that drops only the six `editorial_*` tables, functions,
triggers, policies and indexes introduced by this migration. Restore the prior
Worker version through the controlled Cloudflare rollback procedure.

If cross-content data exists, rollback is forward-only: disable the feature,
retain the tables, and restore the application version while preserving the
new data for a later compatible release.

## Approval required

Owner approval is required for the live catalog inspection, the single
cross-content migration, authenticated acceptance writes, and application/
Worker deployment. No production SQL or deployment has been performed by this
workstream.
