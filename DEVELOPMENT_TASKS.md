# Development tasks

## SB 2 — Alert-to-Accident-Report relationships

Status: **implementation candidate / not deployed** (2026-10-29)

Latest application-only compatibility review: the candidate now retries
legacy `accident_reports` reads when `duplicate_of_report_id` is not present,
so the Statistics page and editorial relationship panel do not require the
unapplied duplicate/relationship migrations merely to render. This is a
code-level compatibility result, not live database acceptance.

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

## SB 2 — current verification record

- **Code and static integration — PASSED:** relationship/statistics/map/security
  focused checks 37/37; full repository suite 462/462 using the repository
  Node TypeScript/alias/Markdown test loader at `tests/node-test-loader.mjs`;
  production build passed; `git diff --check` passed.
- **Editorial AI module-resolution failures — RESOLVED:** the test command now
  handles TypeScript, `@/*` aliases, extensionless imports and Vite Markdown
  `?raw` imports without changing runtime application code.
- **Disposable database discovery — BLOCKED / SETUP REQUIRED:** the CLI lists
  a separate `Mjengo Networks` project, but it is not identified as disposable
  and was not accessed. The exact required credentials and procedure are in
  [docs/sb2-isolated-database-testing.md](docs/sb2-isolated-database-testing.md).
- **Live RLS, migration rollback and concurrent-link testing — PENDING:**
  requires the owner-designated disposable database.
- **Browser acceptance — PENDING:** no browser surface is available; public and
  authenticated relationship, statistics, filter and map workflows remain
  unverified in a real browser.
- **Production deployment and production migration — PENDING:** Worker
  `c193a8dd-725d-403e-9334-0446d1c86236` is live, but its Git source is
  unavailable (`wrangler versions view` reports `Unknown (version_upload)`),
  so the candidate cannot yet be proven to preserve newer deployed source
  changes. The approved application-only deployment is gated on a verifiable
  production source/export or an owner-approved deployment baseline. No
  production migration is approved or executed.

## SB 2 — final verification update

- **Full code suite — PASSED:** 462/462 via `npm test`.
- **Security suite — PASSED:** 14/14 via `npm run test:security`.
- **Production build — PASSED:** `npm run build` completed, including client,
  SSR and Cloudflare Nitro output. Existing bundler warnings are non-fatal.
- **Formatting check — PASSED:** `git diff --check`.
- **Application-only schema compatibility — CODE PASSED / LIVE PENDING:**
  pre-migration reads have legacy retries; no SQL was executed and no claim is
  made about the actual production catalog.
- **Worker/source reconciliation — BLOCKED:** active Worker is c193a8dd at
  100%, but Cloudflare exposes no Git provenance. This prevents a safe
  no-overwrite deployment decision until the deployed source is exported or
  otherwise verified.
