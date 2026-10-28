# SB 2 canonical incident migration manifest

Status: review-only integration candidate. No SQL was executed.

## Reviewed order

1. Existing `alerts`, `accident_reports`, `auth.users`, role helpers,
   publication statuses and the approved duplicate-report workflow.
2. `20261005120000_accident_duplicate_merge_review.sql`.
3. `20261006110000_incident_duplicate_suggestions_review.sql`.
4. `20261029100000_incident_content_links_review.sql`. This is the sole
   Alert-to-Accident-Report relationship model. Its editor-only RPCs and
   append-only history remain authoritative.
5. `20261027120000_cross_content_editorial_relationships.sql`, only if the
   broader editorial tags/drafts/related-content feature is separately
   approved. It is not required by `incident_content_links` and its generic
   `editorial_content_relationships` table must not be used for canonical
   accident identity.
6. `20261028130000_canonical_accident_statistics_review.sql` is **not
   executable as written** in this candidate. It introduces
   `canonical_accident_sources` and `canonical_link_alert_to_report`, which
   duplicate the relationship authority in step 4. It requires redesign to
   derive Alert membership from confirmed `incident_content_links` and must
   not be applied alongside the current relationship migration.
7. `20261028140000_canonical_transport_statistics_extension_review.sql` is
   dependent on the canonical incident statistics read model and therefore
   remains blocked until step 6 is reconciled. Its transport-mode values are
   compatible with the reviewed contract: `road`, `rail`, `aviation`,
   `maritime`, `inland_water`, and `other`.
8. SB 4 migration
   `20261028150000_unified_geography_transport_schema.sql` is a separate
   dependency for stable country/admin-area/entity identifiers. It must be
   reviewed and applied before any canonical transport classification that
   writes those identifiers; no SB 4 application changes are merged here.

## Conflicts and safety gates

- `canonical_accident_sources` is a competing source-link table and is
  rejected from the executable order until replaced by a read projection over
  `incident_content_links`.
- `canonical_link_alert_to_report` conflicts with the editor-only
  `confirm_incident_content_link` / correction / revocation workflow.
- The existing relationship migration uses `canonical_report_id` and
  `content_id`; SB 4 uses `country_code`, `admin_area_id`, and
  `transport_entities`. No implicit text-to-ID backfill is safe.
- Public statistics must count approved, non-duplicate Accident Reports once.
  Alerts are supporting content only after a confirmed relationship; unknown
  fatalities/injuries remain `NULL`/unknown.
- Public RPCs must remain execute-only interfaces. Base canonical tables and
  editorial relationship tables must not receive public write grants.

## Required next database procedure

Owner approval is required for a disposable PostgreSQL/Supabase environment.
Run the dependency order with transaction boundaries and rollback rehearsal,
then verify anonymous, ordinary authenticated and editor permissions plus
duplicate-link/concurrent-link cases. Do not use production for this test.
