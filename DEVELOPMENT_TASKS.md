# Development tasks

## SB 2 — Alert-to-Accident-Report relationships

Status: **implementation candidate / not deployed** (2026-10-29)

Implemented on `fix/editorial-ai-source-fidelity`:

- additive `incident_content_links` model for editor-confirmed Alert → approved
  Accident Report relationships;
- one confirmed canonical Report per Alert, with multiple Alerts allowed to
  point to the same Report;
- editor-only confirm, reject-suggestion, correct and revoke RPC workflows;
- append-only link audit history;
- public read access to confirmed links only; no public or ordinary
  authenticated write path;
- eligible published report count excludes report duplicates and never counts
  Alerts as separate accident records;
- admin relationship review panel with manual linking, suggestion review,
  correction, revocation and links to both records.

Migration order and dependencies:

1. Existing baseline `alerts`, `accident_reports`, `auth.users`, RLS role
   helpers and publication statuses must be present.
2. `20261005120000_accident_duplicate_merge_review.sql` must be reviewed/applied
   first because canonical report eligibility uses `duplicate_of_report_id`.
3. `20261006110000_incident_duplicate_suggestions_review.sql` must be reviewed/
   applied first because relationship confirmation may resolve its Alert/Report
   suggestion rows.
4. `20261029100000_incident_content_links_review.sql` is the additive candidate.
   It has not been applied to staging or production in this workstream.

Required before release: isolated disposable-database migration execution,
RLS/permission verification with anonymous, ordinary authenticated and editor
roles, authenticated browser acceptance of the admin panel, and owner approval
for the migration and production deployment. Production Worker source metadata
does not expose a Git SHA; do not infer ancestry from `origin/main`.

## SB 2 integration — canonical statistics and map contract

Status: **consolidated code candidate / migration review pending**.

The canonical statistics adapter from `feat/cross-device-editorial-ai` is
integrated with the relationship branch. It prefers the canonical transport
RPCs, deduplicates multimodal rows by `incident_id`, filters map output to
verified coordinates, and falls back to approved non-duplicate Reports only.
Alerts are not independently counted by the fallback. The reviewed migration
manifest is [docs/sb2-canonical-incident-migration-manifest.md](docs/sb2-canonical-incident-migration-manifest.md).

The canonical-statistics branch's `canonical_accident_sources` table and
`canonical_link_alert_to_report` function have been removed from the reviewed
candidate. The canonical statistics migration now consumes confirmed
`incident_content_links` and creates no second relationship authority. SB 4's
geography/transport schema remains a separate, reviewed dependency; its
unfinished application changes are not merged here.

## SB 2 — remaining acceptance tasks

- **Live incident relationship testing — PENDING:** requires disposable
  PostgreSQL/Supabase execution with authenticated editor and ordinary-user
  fixtures, including concurrent confirmation and correction.
- **Canonical statistics acceptance — CODE READY / DATABASE PENDING:** verify
  one row per approved non-duplicate Report, Alert context without double
  counting, nullable casualties, road totals and transport filters.
- **Accident map/filter acceptance — CODE READY / BROWSER PENDING:** verify
  date, country, admin-area, mode, corridor, incident-type and severity
  filters, and coordinate-less exclusion in the rendered map consumer.
- **Duplicate and casualty integrity — STATIC PASSED / DATABASE PENDING:**
  execute duplicate merge, relationship correction and NULL casualty cases.
- **Database migration approval and execution — PENDING:** owner approval and
  disposable rehearsal required; production SQL is prohibited in this task.
- **RLS and authenticated security verification — STATIC PASSED / DATABASE
  PENDING:** verify anonymous, ordinary authenticated and editor policies/RPC
  grants against PostgreSQL.
- **Cross-workstream geography compatibility — REVIEW PENDING:** coordinate
  canonical statistics with SB 4 `country_code`, `admin_area_id` and
  `transport_entities`; no implicit text-to-ID backfill is allowed.
- **Final responsive and user acceptance — PENDING:** authenticated browser,
  mobile and desktop review of relationship, statistics and map workflows.
