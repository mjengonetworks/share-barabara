# Canonical accident identity and statistics integration

Status: review-only. This document does not execute SQL, alter production, or
approve a migration.

## Authoritative relationship

`incident_content_links` is the only Alert-to-Accident-Report relationship
model. Editors use its confirm/reject/correct/revoke RPCs and its append-only
history. The canonical statistics model must not add a source-link table or a
second link RPC.

## Canonical identity

`canonical_accident_incidents` contains one row for each approved,
non-duplicate Accident Report. The candidate migration performs an additive,
idempotent identity backfill and synchronizes future approved Reports through a
server-side trigger. Existing Reports are not rewritten. Duplicate Reports are
marked ineligible and never contribute to the read model.

The statistics view joins canonical incidents to approved, non-duplicate
Reports. A confirmed Alert may appear as linked context, but Alert casualties
and Alert rows never add a second accident or casualty total. Unknown values
remain NULL/unknown.

## Public contract

`public_canonical_accident_statistics` is a security-definer, public read RPC
with date, county, road and severity filters. The transport extension adds
verified geography, corridor, incident type and transport modes:
`road`, `rail`, `aviation`, `maritime`, `inland_water`, and `other`.

`public_canonical_transport_map` returns only rows with a complete verified
coordinate pair. All transport-mode rows retain the same `incident_id`, so
multimodal filtering cannot inflate all-transport totals.

## Geography coordination

SB 4 remains authoritative for `country_code`, `admin_area_id` and
`transport_entities`. The canonical transport candidate currently exposes
stable read-model text fields and must not invent a text-to-ID backfill. A
follow-up migration may add validated foreign-key joins only after the SB 4
identifiers are confirmed in the target database.

## Security and acceptance checklist

- Anonymous users receive only filtered statistics/map RPC output.
- Base canonical and relationship tables have no public write grants.
- Editors/moderators retain the existing relationship permissions.
- Concurrent relationship confirmation is serialized by the relationship RPC
  and its unique confirmed-content index.
- Rollback rehearsal must verify that newly added canonical identity rows and
  triggers can be removed without deleting Reports, Alerts, links, or audit
  history.
- Disposable PostgreSQL/Supabase execution is required before staging or
  production approval.
