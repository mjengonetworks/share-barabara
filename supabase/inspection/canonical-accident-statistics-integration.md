# Canonical accident identity and statistics integration

Status: proposal only. This document does not execute SQL, alter production,
or approve the cross-content migration.

## 1. Assessment of the existing migration

`editorial_content_relationships` can record an Alert-to-Report link and its
`derived_from` relationship type can preserve provenance. It cannot, by
itself, guarantee that two records describe one accident, designate one
authoritative structured source, or represent an accident that has only an
eligible Alert. A relationship row is therefore insufficient as the
statistics identity.

The cross-content migration must remain a general editorial relationship
layer. Canonical accident identity should be a separate dependent migration,
applied only after the cross-content tables exist and after the fourth-instance
report duplicate workflow is integrated.

## 2. Proposed canonical model

The dependent migration should add these objects:

### `public.canonical_accident_incidents`

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- `canonical_report_id UUID NULL REFERENCES public.accident_reports(id) ON DELETE RESTRICT`.
- `incident_status TEXT NOT NULL CHECK (incident_status IN ('candidate','verified','closed','merged'))`.
- `statistics_eligible BOOLEAN NOT NULL DEFAULT false`.
- `verified_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL`.
- `verified_at TIMESTAMPTZ NULL`.
- `deleted_at TIMESTAMPTZ NULL` and `deleted_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL`.
- `created_at` and `updated_at` timestamps.

Use a unique partial index on non-deleted `canonical_report_id`. A canonical
report is optional because an alert-only incident may exist temporarily.

### `public.canonical_accident_sources`

- `incident_id UUID NOT NULL REFERENCES canonical_accident_incidents(id) ON DELETE RESTRICT`.
- `source_type TEXT NOT NULL CHECK (source_type IN ('report','alert'))`.
- `source_id UUID NOT NULL`.
- `source_role TEXT NOT NULL CHECK (source_role IN ('canonical_report','supporting_alert','alert_only'))`.
- `verified_for_statistics BOOLEAN NOT NULL DEFAULT false`.
- `verified_fatalities INTEGER NULL CHECK (verified_fatalities IS NULL OR verified_fatalities >= 0)`.
- `verified_injuries INTEGER NULL CHECK (verified_injuries IS NULL OR verified_injuries >= 0)`.
- `source_snapshot_hash TEXT NULL`.
- `created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT`.
- `deleted_at`, `deleted_by`, and `created_at`.

Polymorphic `source_id` references must be validated by a trigger/RPC. Reports
and alerts must both exist, be non-deleted, and satisfy their visibility and
review rules. Unique partial indexes must enforce one active mapping per
source record and one active canonical report per incident.

## 3. Statistics rules

The statistics read model must return at most one row per non-deleted incident:

1. If an approved, non-deleted canonical Report exists, use its structured
   `occurred_at`, location, severity, casualties, fatalities and breakdown.
2. If no Report exists, an Alert-only incident contributes only when an editor
   or moderator explicitly verifies it and marks it statistics-eligible.
3. Alert-only verified counts come only from explicit nullable fields on the
   source mapping. Missing values remain `NULL`; they are never coerced to 0.
4. Once a Report is linked, the Report is authoritative. Alert values remain
   provenance only and are excluded from totals.
5. Articles, Feed posts, Campaigns and Infrastructure Issues may be related
   editorially, but cannot create a statistics source mapping.
6. Deleted, rejected, pending, duplicate and unpublished records are excluded.

The fourth-instance `statistics.tsx` implementation is directionally safe for
Report-only metrics because it filters approved Reports, excludes
`duplicate_of_report_id`, and preserves unknown casualties. It is not complete
for this requirement because it currently excludes eligible Alert-only
incidents and does not consume a canonical incident read model. It should be
updated to consume the dependent migration's statistics RPC/view rather than
querying `accident_reports` directly.

## 4. Alert-to-Report deduplication

Provide one transactional, editor-authorized RPC such as
`link_alert_to_canonical_report(alert_id, report_id, note)`:

- Lock both source rows and the incident row with `FOR UPDATE`.
- Require a non-deleted Alert and an approved, non-deleted Report.
- Reject a Report already assigned to a different active incident.
- Set `canonical_report_id` and `incident_status='verified'`.
- Set `statistics_eligible=true`.
- Create/update the Report source row as `canonical_report`.
- Create/update the Alert source row as `supporting_alert`.
- Create the general editorial relationship for discovery, idempotently.
- Preserve the Alert's source data and never add its counts to statistics.

The existing fourth-instance `duplicate_of_report_id` workflow remains for
Report-to-Report duplicates. It must not be used as the Alert-to-Report
identity mechanism. A duplicate Report should not become a canonical source.

## 5. Alert-only handling

Provide a separate editor-authorized RPC to create or verify an Alert-only
incident. It must require:

- An existing non-deleted Alert.
- An explicit review action and reviewer identity.
- A verified accident classification.
- Explicit nullable casualty values, if known.
- No linked canonical Report.

If a later Report is approved and linked, the Alert-only source becomes
supporting provenance and its statistics values are ignored.

## 6. RLS and security

- Anonymous users may read only the public statistics RPC/view output.
- Anonymous users must not read incident identity, source mappings, audit
  metadata, reviewer IDs or unpublished content.
- Editors/moderators may review and manage mappings according to the existing
  content permissions; ordinary users may not create or alter mappings.
- Service-role writes are reserved for trusted server workflows.
- Deleted mappings remain available only to authorized audit readers.
- Articles and Feed records must be rejected by the source-mapping trigger,
  regardless of any general editorial relationship.

## 7. `has_role` / `has_min_role` audit

The production migration history explicitly grants anonymous EXECUTE on both
helpers because public SELECT policies reference them in their USING clauses.
The relevant policy dependency includes public reads for News, Reports and
Videos. Removing anonymous EXECUTE inside the cross-content migration would
break those public queries at planning time, even when the anonymous branch
does not call the helper at runtime.

No direct client RPC usage was found in the application. The helpers are used
primarily by RLS and security-definer server functions. Anonymous EXECUTE
revocation must therefore not be part of the cross-content migration. It can
only be considered after the public policies are rewritten to avoid helper
calls and a separate public-route regression test passes.

## 8. Required integration sequence

1. Integrate the fourth-instance report editor and duplicate merge migration.
2. Apply and verify the hardened cross-content migration.
3. Apply the dependent canonical-incident migration.
4. Add the Alert review controls and canonical-link RPC calls.
5. Replace direct statistics queries with the canonical statistics read model.
6. Run database/RLS tests and authenticated browser tests.
7. Only then prepare a coordinated release.

No migration in this proposal should be executed yet.
