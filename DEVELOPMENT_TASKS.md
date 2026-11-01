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
## Editorial AI schema validation — 2026-11-01

- **IMPLEMENTED on `fix/editorial-ai-schema-validation`; not deployed.** Reproduced the generic `Schema validation failed` boundary in `src/lib/ai/editorial.functions.ts`: valid ISO datetime output for Campaign `start_date`/`end_date` was rejected by a date-only parser, and Report `occurred_at` had no safe normalization. The correction normalizes valid ISO dates/datetimes, preserves null/unknown values, accepts compatible xAI content blocks, keeps strict provider schemas and allowlists, and returns field/rule diagnostics without applying failed proposals. All five content types retain separate field contracts and the four action/provider routes remain Generate/Grok, Auto-Populate/Groq, Auto-Populate/Grok and Update Existing/Grok. No migration, database write, provider secret read, or deployment was performed. Focused AI/security regression coverage passes 38/38; production build passes. Full-suite, lint, live-provider and authenticated-CMS verification remain open until completed/available.

