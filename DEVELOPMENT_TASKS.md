# Development tasks

## SB 2 — statistics integrity correction candidate — 2026-10-29

- **Corrective migration — PREPARED / NOT EXECUTED:**
  `20261029130000_published_accident_report_count_deleted_filter_review.sql`
  uses `CREATE OR REPLACE FUNCTION` to retain the existing signature,
  `SECURITY DEFINER`, `STABLE`, `search_path`, revoke and grants while adding
  `deleted_at IS NULL` beside the existing approved and duplicate predicates.
- **Regression coverage — PREPARED:**
  `tests/published-accident-report-count.test.mjs` covers published,
  unpublished, soft-deleted, duplicate and unknown-casualty records and checks
  that the RPC eligibility set equals canonical eligibility. No production SQL
  was executed for this candidate.
- **Separate approval required:** production impact is limited to changing the
  public report-count RPC from 12 to the 11 canonical eligible reports. The
  already-applied four migrations must not be rerun.
- **Candidate verification — PASSED:** focused correction tests passed 2/2;
  full suite passed 469/469; security suite passed 14/14; production build
  completed successfully with existing non-fatal bundler warnings; and
  `git diff --check` passed. No database SQL was executed for this candidate.

## SB 2 — statistics integrity correction execution — 2026-10-29

- **Production execution — PASSED:** after confirming the approved source
  commit and recovery archive, the exact corrective migration was applied once
  to Share Barabara project `yhqoggbntunxvlbcatwj`; the prior four migrations
  were not rerun. Migration history was repaired only for version
  `20261029130000`.
- **Statistics verification — PASSED:** `published_accident_report_count()`
  returns 11 as PostgreSQL and `anon`; `canonical_accident_statistics`
  independently returns 11 rows and 11 distinct Reports; the same predicate
  yields 11 eligible Reports. One soft-deleted approved Report, duplicates and
  three unapproved Reports are excluded. One NULL fatalities and one NULL
  casualties value remain in source data, and one NULL fatalities/injuries pair
  remains in canonical output.
- **Security verification — PASSED:** the function remains executable by
  anon, authenticated and service_role; canonical public read remains
  available; no table/RLS changes were made by the correction.
- **Public acceptance:** the public RPC returned 11 under `anon`, and the
  already-deployed Statistics route had passed HTTP smoke testing. Direct
  public-domain probing is unavailable in this environment; authenticated
  browser review remains pending.
- **Remaining:** recovery restore rehearsal against a disposable database and
  authenticated browser/user acceptance only. No redeployment was performed.

## SB 2 — production backup gate recheck — 2026-10-29

- **Provider backup investigation — COMPLETED / NO RECOVERY POINT:** the
  authorized Supabase CLI queried project `yhqoggbntunxvlbcatwj` and returned
  `walg_enabled: true`, `pitr_enabled: false`, and an empty `backups` list.
  No provider-managed snapshot or PITR target is available for this execution.
- **Docker-free client investigation — PARTIAL / CREDENTIAL REQUIRED:**
  PostgreSQL 17 client utilities (`pg_dump`, `pg_restore`, `psql`) are already
  installed locally; no PostgreSQL service was used. No temporary database
  password or connection string is available in the environment, and no dump
  connection was attempted. No credentials were logged.
- **Migration execution — BLOCKED SAFELY:** the four already-approved
  migrations remain unapplied and no production SQL has been executed. The
  exact prerequisite is a temporary authorized Share Barabara database
  connection/password, followed by a nonempty custom-format dump validated
  with `pg_restore --list`.

## SB 2 — approved production migration execution — 2026-10-29

- **Recovery artifact — PASSED:** the existing authenticated Supabase CLI
  session generated a temporary Share Barabara PostgreSQL login. A
  public-schema custom-format archive was created outside Git at
  `E:\sb2-production-backup-20261029-cli-postgres.dump`; it is 589,228 bytes,
  has 910 TOC entries, and `pg_restore --list` passed. No credential was
  persisted or committed. A live restore rehearsal was not run because no
  separate disposable database is authorized; the archive is structurally
  recoverable and must be retained for recovery.
- **Production migrations — EXECUTED:** exactly the four approved files were
  applied in order: duplicate merge, duplicate suggestions,
  `incident_content_links`, then canonical accident statistics. Supabase
  migration history was repaired to mark exactly those four versions applied.
  No SB4, transport, advertising or alert-lifecycle migration was applied.
- **Database verification — PASSED WITH ONE CORRECTION BLOCKER:** reports and
  alerts remain 15 and 14; canonical incidents are 11, one per distinct
  canonical report; one NULL fatalities and one NULL casualties value remain;
  RLS is enabled on all four new tables; anonymous/authenticated table
  inserts are denied; editor relationship RPC grants exist. However,
  `published_accident_report_count()` returns 12 because its approved-report
  predicate does not exclude one soft-deleted approved report; canonical
  statistics correctly return 11. A separate reviewed corrective SQL change
  is required before declaring statistics integrity complete.

## SB 2 — Alert-to-Accident-Report relationships

Status: **application deployed / acceptance pending** (2026-10-29)

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
for the migration and production deployment. The Instance 1 deployment record
and local worktree now verify the Worker baseline as application commit
`2025e9ccf340f0db0b6126919620df13b12edf82`, followed by documentation commits
`46e0a06` and `2d22804`; Cloudflare itself still does not expose the Git SHA.

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
- **Migration package hardening — PASSED / EXECUTION PENDING:** reviewed
  rerun-safe policies, triggers, canonical view replacement and banner
  constraint guards were added. The exact four-migration production approval
  set and recovery procedure are in
  [docs/sb2-production-migration-plan.md](docs/sb2-production-migration-plan.md).
- **Production migration preflight — STOPPED SAFELY:** project ref
  `yhqoggbntunxvlbcatwj` and Share Barabara identity were verified; all four
  approved migration IDs are absent from remote history. The required backup
  attempt failed before dump execution because Supabase CLI requires Docker's
  `dockerDesktopLinuxEngine`; the local PostgreSQL 17 client is available but
  has no authorized database connection configured. The resulting backup path
  is zero bytes and is not treated as a backup. No production SQL was
  executed. Resume requires a valid provider snapshot or a temporary
  authorized `pg_dump`/PostgreSQL connection before rerunning preflight.
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
  focused checks 37/37; full repository suite 467/467 using the repository
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
- **Production baseline — VERIFIED:** Instance 1's clean worktree contains
  the exact deployed application commit `2025e9ccf340f0db0b6126919620df13b12edf82`
  and descendants `46e0a06`, `2d22804`; its deployment record matches Worker
  `c193a8dd-725d-403e-9334-0446d1c86236`, creation time and 100% traffic.
  The candidate contains that commit in its ancestry. Candidate review restored
  homepage recorded-accident metrics, report hash navigation, placement-aware
  ads, Partner With Us validation and Back to Top/quote behavior.
- **Production application deployment — PASSED:** commit
  `96f1675f042e3d5a68bf48c70a408367bd998410` was deployed to Worker
  `62c8fedb-494c-4e3f-bf4e-5b2efb2815cb` at 100% on 2026-10-29 12:02 UTC.
  Public `/`, `/statistics`, `/reports`, `/alerts`, `/partner-with-us`,
  `/feed` and `/news` returned HTTP 200. No migration or SQL was executed.
- **Production migration — PENDING:** relationship, duplicate, canonical
  statistics, geography and transport migrations remain unapplied and require
  separate owner approval and disposable-database rehearsal.

## SB 2 — final verification update

- **Full code suite — PASSED:** 467/467 via `npm test`.
- **Security suite — PASSED:** 14/14 via `npm run test:security`.
- **Production build — PASSED:** `npm run build` completed, including client,
  SSR and Cloudflare Nitro output. Existing bundler warnings are non-fatal.
- **Formatting check — PASSED:** `git diff --check`.
- **Application-only schema compatibility — CODE PASSED / LIVE PENDING:**
  pre-migration reads have legacy retries; no SQL was executed and no claim is
  made about the actual production catalog.
- **Worker/source reconciliation — PASSED WITH LOCAL EVIDENCE:** Cloudflare
  metadata remains `Unknown (version_upload)`, but the exact deployed commit is
  corroborated by the clean Instance 1 worktree, Git ancestry and deployment
  record. No matching commit message was used as proof.

## SB 2 — deployment verification

- **Worker allocation — PASSED:** `62c8fedb-494c-4e3f-bf4e-5b2efb2815cb` is
  confirmed at 100% traffic with production bindings and secrets names intact.
- **Public runtime health — PASSED:** the deployed public routes returned HTTP
  200. Live SSR markers include the homepage recorded-accident/statistics
  surface and Partner With Us route.
- **Relationship/statistics live acceptance — PENDING:** current database
  schema and authenticated editorial sessions were not used; the relationship
  panel remains migration-dependent and canonical RPCs remain fallback-safe.
- **Browser/authenticated acceptance — PENDING:** no browser surface or
  authenticated test account is available for editor confirmation, correction,
  revocation, map filters or responsive visual review.
