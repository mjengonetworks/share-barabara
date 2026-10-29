# SB 2 isolated database testing procedure

Status: prepared, not executed. No production database or SQL was accessed.

## Environment gate

The authenticated Supabase CLI currently lists:

- `Share Barabara` (`yhqoggbntunxvlbcatwj`) — linked project and treated as
  production; do not use.
- `Mjengo Networks` (`skgtsdyxobyjtzrklyzi`) — separate project, but not
  identified by the owner as disposable/test; do not use without explicit
  designation.

The repository `.env` points to the linked Share Barabara project. Those
credentials are not used for testing.

## Minimum owner-provided prerequisite

Provide or designate a non-production Supabase project with:

1. Project ref and URL, explicitly confirmed separate from production.
2. Temporary database password or pooled PostgreSQL connection string.
3. Temporary publishable/anon key for API/RLS checks.
4. Temporary isolated editor and ordinary-user test accounts, or a temporary
   service-role/database credential used only to seed those accounts and roles.
5. Confirmation that the project may be reset/destroyed after testing and that
   no paid infrastructure should be created.

Do not provide production credentials. The credentials should be revoked when
the test project is reset.

## Execution order

1. Verify project ref, URL host and environment metadata do not match the
   linked production project.
2. Apply the existing baseline and duplicate merge/suggestion migrations.
3. Apply `20261029100000_incident_content_links_review.sql`.
4. Apply the redesigned `20261028130000_canonical_accident_statistics_review.sql`.
5. Apply SB 4 geography/transport schema after confirming its identifiers.
6. Apply `20261028140000_canonical_transport_statistics_extension_review.sql`.

## Acceptance and rollback checks

- Confirm, reject, correct and revoke Alert-to-Report links.
- Confirm ordinary users and anonymous users cannot write relationships.
- Verify editor-only reads and RPC authorization.
- Run concurrent confirmations for one Alert and confirm one link wins.
- Verify approved non-duplicate Report counts are one row per incident.
- Verify duplicate Reports, unknown casualties and NULL coordinates remain
  excluded or unknown as appropriate.
- Verify transport mode, date, geography, corridor, incident type and severity
  filters.
- Verify map RPC output excludes incomplete coordinates.
- Rehearse rollback in the disposable environment in reverse dependency order;
  confirm Reports, Alerts, relationship history and legacy rows remain intact.

No production migration or deployment is part of this procedure.
