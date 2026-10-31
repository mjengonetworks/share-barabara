# Infrastructure Issue location schema proposal

Status: review-only; no SQL has been executed.

## Current finding

`infrastructure_issues` currently stores `road_name`, `county` and editorial fields, but the repository schema and `InfrastructureIssueForm` do not expose nullable latitude/longitude columns. The current application therefore uses canonical RoadInput search and does not attempt to write unsupported coordinate fields.

## Smallest additive change

Prepare a separately reviewed migration adding nullable fields:

- `latitude double precision`
- `longitude double precision`
- `location_source text`
- `location_verified_at timestamptz`

Add a range/pair check equivalent to the existing location architecture: both coordinates are NULL, or both are present within latitude `-90..90` and longitude `-180..180`. Do not backfill coordinates from free text or AI output.

## Integrity and permissions

- Preserve `road_name`, county, road relationships, publication state, soft deletion, moderation and existing RLS.
- Public maps may use only published, eligible records with verified coordinates.
- Editors may save coordinates through the existing authorised form path; ordinary users retain the current submission/moderation boundary.
- `location_source` and `location_verified_at` must be supplied only by an authorised review flow.
- Existing records remain NULL until independently verified; no fabricated incident markers are permitted.

Before owner approval, rehearse the additive migration against a representative PostgreSQL backup, verify RLS and record counts, and define whether the form should support a coordinate picker for submitted issues or only reviewed editorial records.
