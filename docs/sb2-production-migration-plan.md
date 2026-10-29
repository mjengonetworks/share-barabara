# SB 2 production migration plan

Status: **approval required; no production SQL executed**.

## Exact SB 2 approval set

Apply these migrations in this order, in separately logged transactions or a
single transaction only if the migration runner guarantees a complete rollback:

1. `20261005120000_accident_duplicate_merge_review.sql`
2. `20261006110000_incident_duplicate_suggestions_review.sql`
3. `20261029100000_incident_content_links_review.sql`
4. `20261028130000_canonical_accident_statistics_review.sql`

These are the minimum migrations required for duplicate-aware canonical
Alert-to-Report relationships and approved-report-only canonical statistics.
They preserve source rows and use `incident_content_links` as the sole
relationship authority.

## Deferred dependencies

- `20261028140000_canonical_transport_statistics_extension_review.sql` is
  deferred until SB4 confirms the geography/transport identifier contract.
- `20261028150000_unified_geography_transport_schema.sql` is SB4-owned and is
  not present in this branch. Do not apply it from another branch or apply
  unfinished application changes.
- `20261029120000_banner_ad_placements_review.sql` is an unrelated advertising
  migration and is not part of the SB 2 approval set.
- `20261027120000_alert_lifecycle_notifications_overhaul.sql` is a separate
  alert-lifecycle dependency and is not required by the four SB 2 migrations.

## Preflight

On the approved non-production or production target, capture the migration
history, PostgreSQL version, table/column definitions, constraints, indexes,
RLS policies, grants, triggers, and function signatures for `alerts`,
`accident_reports`, `auth.users`, `incident_duplicate_suggestions`, and the
role helper. Confirm that no competing `canonical_accident_sources` table or
`canonical_link_alert_to_report(uuid,uuid)` function exists. Take a provider
backup/snapshot and export the relevant row counts and NULL casualty counts.

## Post-migration checks

Verify one confirmed link per Alert, append-only history, editor-only RPCs,
public read-only confirmed links, ordinary-user/anonymous write denial,
duplicate exclusion, one canonical row per approved non-duplicate Report,
NULL fatalities/injuries preservation, and no source-row changes. Run the
concurrent confirmation race, correction, revocation, rejection and rollback
recovery checks before enabling any migration-dependent editorial workflow.

## Recovery

Do not delete migration-history rows. If a migration fails, stop and preserve
the failed state for diagnosis. Restore the provider backup only under owner
approval. The safe logical rollback order is canonical statistics objects,
then incident links/history, then duplicate suggestion objects, then duplicate
columns/functions; source Reports and Alerts must not be deleted. A production
rollback requires a fresh reviewed SQL script after inspecting actual object
definitions and cannot be promised as a blind `DROP` sequence.
