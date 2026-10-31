# Infrastructure Issue location migration review

Status: review-only; not executed in production.

## Scope

`20261031150000_infrastructure_issue_coordinates_review.sql` is a minimal additive
proposal for the existing `public.infrastructure_issues` table. It adds nullable
latitude/longitude, provenance (`location_source`) and verification time
(`location_verified_at`), plus a coordinate-pair/range constraint and a partial
index. It does not backfill records, alter existing statuses, change RLS policies,
or create markers for unknown locations.

The existing `road_id` relationship from the Road Registry remains authoritative
where present. Existing `road_name`, county, moderation and soft-deletion/public
eligibility behaviour remain unchanged.

## Preflight and rehearsal requirements

Before owner-approved execution, restore a representative PostgreSQL 17 backup and
record the preflight count and schema. Verify existing rows with NULL coordinates,
RLS policies, triggers, indexes and application compatibility. Apply the exact file
in an isolated database, test valid pairs, NULL pairs and invalid ranges, and verify
that anonymous/public writes remain denied while existing authorised workflows are
unchanged.

## Safe rollback / recovery

Do not drop the new columns in an incident without first confirming no application
or editorial data uses them. Prefer application rollback while retaining additive
columns. If owner-approved rollback is required, take a fresh backup, verify the
migration ledger and dependent code, then remove only the new index, constraint and
columns in a controlled transaction. Never overwrite concurrent production activity
with a blanket restore; use the established backup/recovery procedure.

## Data integrity

No historical coordinates are invented. AI or place-search suggestions remain
unverified until an authorised editor explicitly selects and saves them. A public
map may show a general navigable map, but must not display an incident marker when
coordinates are absent or unverified.
