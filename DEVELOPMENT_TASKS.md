# Development tasks

## Task 70 / SB 2 — News Featured regression and editorial workflow audit — IMPLEMENTED / DEPLOYMENT PENDING — 2026-10-30

This extends the existing Task 70 record; no duplicate task was created.

- News now always renders a distinct `Featured Articles` section between Latest
  News and Trending News. It shows three selected published cards when eligible
  records exist, otherwise a compact labelled empty state. News editorial bands
  use the compact spacing contract instead of the previous large vertical gaps.
- The shared authenticated Article, Accident Report and Hazard Alert editors now
  load and persist visible Featured controls, including Save and Save & publish.
  The existing Alert-to-Report relationship review panel is also available from
  Report and Alert edit forms, while preserving its editor-only RPC workflow.
- Regression coverage now guards section presence/order, the empty state,
  selected-card rendering, compact spacing, persisted Featured controls and
  Report/Alert relationship-panel consumption.
- Audit finding: the deployed `incident_content_links` schema and RPCs support
  only Alert ↔ approved canonical Accident Report links. No Article, Campaign,
  Infrastructure Issue or Media/Feed relationship picker or persisted
  bidirectional relationship exists. Public cross-content previews remain
  loader/ranking/taxonomy based, not editorial relationship records.
- Audit finding: existing AI controls expose Generate, Auto-Populate and Update
  Existing for the current CMS types, but source-to-destination conversion
  actions and automatic bidirectional conversion links are not implemented.
  Related overlapping branches include `feat/global-editorial-ai`,
  `integration/final-production-editorial-ai` and `feat/cross-device-editorial-ai`;
  none was merged or overwritten. A schema extension is required before generic
  relationship persistence can be implemented safely and needs separate review.


## Task 70 / SB 2 — Reports, Alerts and view-count correction — DEPLOYED / DATABASE VERIFIED / LIVE ACCEPTANCE PENDING — 2026-10-29

This extends the existing Task 70 record; no duplicate task was created.

- Reports and Alerts now have distinct Latest, Featured and Trending / Most
  Viewed sections. Featured content reads an explicit editorial `featured`
  selection instead of deriving Featured from severity or silently substituting
  Latest content.
- When at least two eligible selections exist, the public submission form shares
  one balanced desktop three-column row with two Featured cards; mobile stacks
  the same cards without horizontal overflow. Public spacing was tightened at
  the Reports, Alerts and News page shells without changing the established
  brand system or content contracts.
- Admin Reports exposes a Featured Report toggle in the existing editorial
  editor. Admin Alerts exposes the same role-gated selection from the existing
  actions menu. The additive migration below is required before those writes
  can operate in production.
- News, Reports and Alerts now use shared session-scoped view recording. A
  reader returning to the same detail page in one browser session is not counted
  repeatedly; existing event histories and genuine popularity ranking are not
  reset or fabricated. Production audit confirmed existing persistence: 1,153
  news events, 81 report events and 104 alert events.

Reviewed migration `20261029170000_public_incident_featured_selection_review.sql`
was executed once after project, backup and schema preflight. It adds non-null
boolean selection fields with false defaults and partial indexes only; it did
not delete, rewrite or publish existing records. Fresh scoped backup:
`E:\sb2-production-backup-20261030-featured-scope.dump`, 58,573 bytes,
SHA-256 `4A646A6EA955116C6CEB988380AED191C9A54090AC99881B4ED0C01B96D30449`,
`pg_restore --list` passed with 117 entries. Pre/post counts were Reports
15 total / 12 live and Alerts 14 total / 14 live. The migration ledger records
version `20261029170000`; both featured columns are `NOT NULL DEFAULT false`,
both partial indexes exist, and RLS remains enabled. Anonymous update probes
were denied; a transaction-scoped moderator/admin policy probe updated one row
of each type and rolled back. Rehearsal against
the verified `755087`-byte custom-format backup in a fresh disposable
PostgreSQL 17 cluster preserved 15 Reports and 14 Alerts; all rows received
`featured=false`, both partial indexes were created, and RLS remained enabled.
The disposable cluster was stopped and removed.

Evidence: focused correction tests `16/16`, full suite `486/486`, security
suite `14/14`, production build and `git diff --check` passed. Application
commit `747b44820098b9d4351022ddd9086ede4179faea` is deployed on Worker
`d8ce8556-73ee-44cd-be4d-8cbf93a9c902` at 100%; previous Worker was
`778300c3-f7c8-499f-823b-735c239145f9`. Public smoke checks returned HTTP 200
for `/`, `/news`, `/reports`, `/alerts`, `/statistics`, `/campaigns` and
`/infrastructure-issues`. The Share Barabara project was confirmed as
`yhqoggbntunxvlbcatwj` before execution. Public `/reports` and `/alerts`
returned HTTP 200 after migration.
Browser visual verification is **NOT VERIFIED**: CUA returned no available apps
or browsers, and no local Chrome, Edge, Firefox, Playwright or Puppeteer surface
was available. Owner screenshots at 320, 375, 390, 430, 768, 1024, 1280 and
1440px remain pending.

## Task 70 / SB 2 — priority statistics and public design correction — DEPLOYED / LIVE ACCEPTANCE PENDING — 2026-10-29

This update extends the existing Task 70 record; no duplicate task was created.

- **P1 full statistics administration:** extended the reviewed additive migration
  `20261029150000_official_statistics_management_review.sql` across all existing
  aggregate tables: yearly, monthly, county, victim, cause, vehicle,
  time-of-day and road-class statistics. Existing rows remain in place and gain
  publication status, source organisation/URL/document, reporting period,
  verification date and append-only revision history. Admin Statistics now edits
  any historical year, including the yearly table’s `year` primary key, while
  internal canonical incident counts remain calculated and non-overridable.
  The sourced official dataset manager supports draft/edit/publish/unpublish and
  correction revisions. The migration was approved and applied once after a
  fresh verified backup and production preflight. Homepage official metric cards fail closed
  to “pending verification” when the provenance schema/observation is
  unavailable, so legacy `yearly_stats` values are not presented as current
  2026 official data.
- **Public year selection:** the Statistics year selector now drives the
  selected-year headline cards, monthly/county/category data and selected-year
  internal incident summaries/charts. Legacy public reads use publication-status
  filtering when the migration is active and retry the legacy schema before it.
  Source review: the [KNBS Economic Survey 2026](https://www.knbs.or.ke/wp-content/uploads/2026/04/2026-Economic-Survey.pdf)
  supports 5,009 deaths, 11,648 serious injuries and 8,248 slight injuries for
  the provisional 2025 national series. The instructed NTSA 2026 figure was not
  published because an authoritative source document was not verified here.
- **P2 spacing:** compacted the shared public hero spacing and overlay, reduced
  News page vertical framing and kept centered responsive containers without
  negative-margin hacks.
- **P3 trending:** dedicated `/news?sort=trending` now uses the genuine
  `trending_news` view-count RPC for 24-hour, 7-day, month and year windows,
  with category filtering, one lead story, ranked compact rows and Read more.
  No chronological substitute or fabricated popularity was added.
- **P4 cross-content previews:** the shared editorial preview now renders one
  prominent lead plus up to two compact stories per section, preserving the
  outer three-section desktop arrangement and working View all links.
- **P5 alert images:** alert featured-image fields are selected through the
  public discovery loaders and rendered with the same aspect-ratio treatment as
  report previews; records without usable images retain a neutral fallback.

Evidence: full suite `482/482`, security suite `14/14`, focused hierarchy and
priority-correction tests `17/17`, production build passed, and `git diff --check`
passed. Approved application commit `2694f5cb2d0b09f4e9b311e7755f5a42ec6456cb`
is live on Worker `778300c3-f7c8-499f-823b-735c239145f9` at 100%; previous
Worker `ad7dabfc-5f9a-4bcc-bd5e-3c6ca3ca8cbf`. Browser/CUA reported no available
apps or browsers, so responsive screenshots at 320, 375, 390, 430, 768, 1024,
1280 and 1440px remain **NOT VERIFIED**.

Production evidence: fresh Docker-free custom-format backup
`E:\sb2-production-backup-20261029-final.dump` was non-empty (`755087` bytes)
and passed `pg_restore --list`. Preflight confirmed project
`yhqoggbntunxvlbcatwj`, migration absence, existing schema/RLS and canonical
dependencies. The approved migration was applied once after application
deployment; migration history now records `20261029150000` as applied.
Post-migration checks preserved all eight datasets: yearly `7 / 30182 / 51384 /
101226`, monthly `12 / 4531 / 14990`, county `10 / 2838 / 9395`, victim `6 /
4531`, cause `8 / 4531`, vehicle `7 / 4531 / 15290`, time-of-day `6 / 4531`,
road-class `5 / 4531 / 15290`. The yearly `year` key remained intact, all
legacy rows are published, revision RLS/policies/triggers exist, anonymous
administrator checks are denied, and canonical/published report counts both
return `11`. Production smoke routes returned HTTP 200 for the public routes;
homepage SSR includes the Statistics destination and public Reports has no
Editorial AI marker. Authenticated admin and responsive visual acceptance
remain pending owner verification.

Migration rehearsal evidence: the validated isolated backup was inspected and
restored into a fresh local PostgreSQL 17 cluster containing only temporary
schema/role stubs and the eight statistics tables. Pre/post checks matched
exactly: yearly `7 / 30182 / 51384 / 101226`, monthly `12 / 4531 / 14990`,
county `10 / 2838 / 9395`, victim `6 / 4531`, cause `8 / 4531`, vehicle
`7 / 4531 / 15290`, time-of-day `6 / 4531`, and road-class `5 / 4531 / 15290`
(row count / fatalities / applicable secondary totals). The yearly `year`
primary key remained intact; all seven historical yearly rows defaulted to
`published`; audit RLS was enabled; nine revision triggers/policies were
created; and anonymous reads excluded an explicitly archived row. The temporary
cluster was stopped and removed; the separate production execution followed
only after owner approval and the fresh backup gate.

## Task 70 / SB 2 — platform-wide public editorial hierarchy correction — DEPLOYED / LIVE ACCEPTANCE PENDING — 2026-10-29

This is the consolidated follow-up to the existing Global Editorial Layout
Corrections and SB 2 owner-acceptance records; no duplicate task was created.

Implementation completed in the current release candidate:

- shared editorial previews now use balanced three-card, image-led cards with
  consistent proportions, metadata, titles and explicit Read more/View all
  navigation;
- News places Latest, Featured and Trending before Browse by Category, while
  the shared discovery layer removes duplicate items across modules where
  eligible content exists;
- Reports use a balanced three-item Latest Accident Reports grid, retain
  unknown casualty values, and no longer expose Editorial AI controls on the
  public submission surface;
- the homepage Recorded Road Accidents card uses the canonical Statistics
  destination and the existing corrected count path;
- Mjengo Hub and Mjengo Networks previews remain after Share Barabara content
  and use a shared centred max-width container with responsive gutters;
- Alerts, Campaigns, Infrastructure Issues and other public listings inherit
  the shared preview/card treatment without changing moderation, statistics,
  map, form, relationship, SB4 or advertising contracts.

Acceptance criteria remain open until evidence is collected:

- responsive checks at 320, 375, 390, 430, 768, 1024, 1280 and 1440px show
  no horizontal overflow, oversized empty sections or broken destinations;
- public Reports expose no administrative AI controls and preserve public
  reporting, filters, statistics, maps and nullable casualty semantics;
- owner review confirms Latest/Featured/Trending/category ordering, report and
  alert navigation, verified map/filter behavior, and mobile/desktop layout;
- production deployment is complete from application commit
  `f0a26f87610e62eac6c2e73d4e8ab5255ea68fca` on Worker
  `ad7dabfc-5f9a-4bcc-bd5e-3c6ca3ca8cbf` at 100%. The previous Worker was
  `62c8fedb-494c-4e3f-bf4e-5b2efb2815cb`; no SQL or migration changes were
  made.

Audit matrix for this corrected candidate:

| Requirement | Result | Evidence |
|---|---|---|
| News hero/category navigation and Latest → Featured → Trending → Categories | PASS | `src/routes/news.index.tsx`, `CategoryEntityGrid` |
| News Latest, Featured and Trending are separate three-card rows | PASS | `ArticleGridWithAds`, each capped at three, centered Read more links |
| News category columns are three stories per category | PASS | `CategoryEntityCard`: one lead plus two compact stories and View more |
| Reports Latest, Featured and Trending are separate three-card rows | PASS | `src/routes/reports.index.tsx`, `ReportPreviewCard` |
| Alerts Latest and Most Viewed are separate three-card rows | PASS | `src/routes/alerts.index.tsx`, `AlertPreviewCard` |
| Genuine Trending/Most Viewed source | PASS | Existing `trending_news`, `trending_reports` and `trending_alerts` RPCs remain the data source |
| Homepage 11-accident Statistics destination and compact stat cards | PASS | `src/routes/index.tsx` canonical count RPC and `/statistics` link |
| Public Reports has no administrative Editorial AI panels | PASS | `src/components/site/report-form.tsx` role/embedded-editor gate |
| Unknown-versus-zero report values | PASS | Existing nullable display contract retained and covered by suite |
| Mjengo Hub/Networks centered placement | PASS | `src/components/site/mjengo-previews.tsx` shared max-width container |
| Responsive visual parity at 320–1440px | NOT VERIFIED | No browser/screenshot surface is available in this environment |
| Authenticated editor, map and live production visual acceptance | NOT VERIFIED | Requires owner test account and browser/live review |

Verification record for this candidate: focused hierarchy checks passed 29/29;
full suite passed 476/476; security suite passed 14/14; production build and
`git diff --check` passed. Browser screenshots and authenticated visual
acceptance remain Pending Live Testing because browser automation reports no
available apps or browsers. SB4 geography/transport and advertising dependencies
remain under their existing task IDs.

Deployment evidence: Wrangler reported current version
`ad7dabfc-5f9a-4bcc-bd5e-3c6ca3ca8cbf`, production custom domain enabled and
the scheduled trigger retained. Public HTTP smoke checks returned 200 for `/`,
`/news`, `/reports`, `/alerts`, `/statistics`, `/campaigns` and
`/infrastructure-issues`. Homepage SSR contains `/statistics`; Reports SSR
contains no public Editorial AI marker. Featured/Most Viewed sections are
content-dependent in the live response and were not treated as visually
accepted without browser review.

## SB 2 — current lifecycle and owner acceptance matrix — 2026-10-29

Lifecycle: **Implemented → Deployed → Live Tested → User Accepted → Closed**.
The implementation, deployment and database verification stages are complete;
the following owner acceptance items remain explicitly **Pending Live Testing /
Pending User Acceptance** and are not closed:

- Published accident statistics must show 11 eligible Reports; casualty totals
  must preserve unknown/NULL fatalities and injuries rather than displaying
  zero.
- Accident Reports must be visible according to publication rules; soft-deleted,
  duplicate and unapproved Reports must be excluded from counts and canonical
  views.
- An authorized editor must confirm a suggested Alert→Report relationship,
  correct the linked Report, revoke it, inspect append-only audit history and
  navigate between linked records.
- An editor-only workflow must permit relationship review while anonymous and
  ordinary authenticated users cannot confirm, correct, revoke or write links.
- The accident map must show verified coordinates only and owner testing must
  cover date, country, administrative area, transport mode, corridor, incident
  type and severity filters.
- Linked Alert/Report navigation must preserve canonical incident identity and
  avoid duplicate incident creation.
- Responsive owner review must cover mobile and desktop Statistics, map,
  Reports, Alerts and relationship-review surfaces.

Current deployed baseline: application commit
`96f1675f042e3d5a68bf48c70a408367bd998410`, Worker
`62c8fedb-494c-4e3f-bf4e-5b2efb2815cb` at 100%. Production migration history
contains the five SB2 versions `20261005120000`, `20261006110000`,
`20261029100000`, `20261028130000` and `20261029130000`; no SB4 or advertising
migration is included. Application tests are 469/469, security tests 14/14,
statistics reconciliation is 11, and isolated PostgreSQL restore rehearsal is
passed. SB4 geography/transport and advertising dependencies remain under
their existing task records and are not closed by SB2.

## SB 2 — final acceptance attempt — 2026-10-29

- **Disposable recovery rehearsal — PASSED:** the existing authorized CLI
  connection created a second read-only custom-format archive containing the
  migration-scope `public` and dependent `auth` schemas at
  `E:\sb2-production-backup-20261029-cli-public-auth.dump` (747,350 bytes;
  SHA-256 `F1CC7D7433DED20927467D49F2325AF778630515A3C83B869A33B850FF802FCE`).
  `pg_restore --list` passed, and it restored cleanly into a separately
  initialized local PostgreSQL 17 cluster on port 55432. Local Supabase role
  stubs were created only in that disposable database. Restored checks passed:
  15 Reports, 14 Alerts, 11 canonical incidents, count RPC 11, 26 auth users,
  all four relationship/statistics tables RLS-enabled, six policies, four key
  functions, and preserved NULL casualty values. The disposable cluster was
  stopped and removed; the existing PostgreSQL service and backup archives were
  preserved.
- **Authenticated browser acceptance — BLOCKED / TOOLING PREREQUISITE:**
  browser automation initialization returned no apps or browsers, and no
  authenticated browser surface or test account was available. No relationship
  confirmation, correction, revocation or editor UI workflow is marked passed
  from database checks alone. The minimum prerequisite is an available browser
  automation surface plus an authorized non-destructive editor test account.

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
- **Remaining:** authenticated browser/user acceptance only; the disposable
  recovery restore rehearsal is now passed. No redeployment was performed.

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
- **Database migration approval and execution — DEPLOYED:** owner-approved
  `20261030180000_editorial_content_relationships_review.sql` was executed once
  after fresh backup and preflight; see the production database release record
  below. No further migration is required for this task.
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

## SB 2 — editorial workflow completion candidate (2026-10-30)

- **Task 70 / editorial relationship extension — DEPLOYED / LIVE ACCEPTANCE PENDING:** reviewed migration `20261030180000_editorial_content_relationships_review.sql` is applied in production. It extends the reusable relationship model to Article, Report, Alert, Campaign, Infrastructure Issue and Feed Post endpoints, adds soft-delete and append-only relationship history, validates endpoints and editor permissions, and explicitly rejects generic Alert↔Report links so `incident_content_links` remains authoritative.
- **CMS Related Content — IMPLEMENTED / AUTHENTICATED ACCEPTANCE PENDING:** the shared editor now mounts bidirectional search, link, unlink and reloadable relationship controls for Article, Report, Alert, Campaign and Infrastructure Issue editors. Feed Post linking is supported at the database/RPC layer but has no separate Feed authoring editor in the current CMS surface.
- **AI conversion review — IMPLEMENTED / LIVE PROVIDER ACCEPTANCE PENDING:** existing Grok conversion actions use destination-specific targets, field-by-field accept/reject review, saved unpublished proposals, duplicate guards and provenance fields. The disposable PostgreSQL rehearsal verified real destination-row creation and automatic bidirectional provenance linking for all six supported directions.
- **Public related content — IMPLEMENTED / LIVE ACCEPTANCE PENDING:** News, Reports, Alerts, Campaigns and Infrastructure detail routes consume the permission/public-eligibility filtered related-content RPC and preserve existing editorial discovery modules.
- **Verification — CODE PASSED / TYPE CHECK BLOCKED BY BASELINE:** focused cross-content regression tests passed; full repository suite passed 494/494; security suite passed 14/14; production build passed; `git diff --check` passed. `npx tsc --noEmit` still reports the repository's pre-existing generated-schema/index-signature errors across unrelated admin, route and statistics files; no new errors were reported for `cross-content-editor.tsx`. Browser/authenticated acceptance is not performed in this environment.
- **Dependencies:** migration requires `incident_content_links`, all existing content tables plus `deleted_at`, role helpers and Feed recycle-bin schema. Disposable rehearsal is complete; production migration and application deployment still require separate owner approvals. Authenticated editor/browser acceptance and live Grok provider testing remain pending.

## SB 2 — final release preparation (2026-10-30)

- **Production reconciliation — PASSED WITH SOURCE LIMITATION:** candidate `b52a3297d95051941721acb1d5ead36b07f32cf7` contains the supplied production commit `747b44820098b9d4351022ddd9086ede4179faea` in its ancestry and preserves its deployed changes. The live site returned HTTP 200 for `/news`; Cloudflare headers identify the Worker path, but the available local Wrangler metadata exposes no deployed Git SHA. The supplied live Worker remains `d8ce8556-73ee-44cd-be4d-8cbf93a9c902`; no newer source was found in fetched refs.
- **TypeScript comparison — BASELINE-MATCHED:** `npx tsc --noEmit --pretty false` reported 827 diagnostics on both the supplied production baseline and this candidate. The candidate did not increase the count; errors are pre-existing generated-schema/index-signature and route typing debt. No production deployment source was overwritten.
- **Conversion verification — PASSED in isolated PostgreSQL:** all six directions created real destination records, returned editor URLs, remained draft/pending, linked through `derived_from`, preserved NULL casualty values, and rolled back cleanly in test transactions. Duplicate conversion attempts are rejected by the active provenance guard.
- **Final automated checks — PASSED:** focused cross-content tests 4/4; full suite 494/494; security suite 14/14; production build passed; `git diff --check` passed.
- **Release sequence:** take a fresh verified production backup; preflight project/schema/migration ledger and compare counts; deploy the approved application; smoke-test public routes and legacy fallbacks; apply only the approved migration once; verify RLS, grants, relationship history, public filtering and admin permissions; retain the backup and use the documented restore/recovery procedure only if post-migration verification fails. No production SQL or deployment was performed.
- **Open acceptance:** secure provider-backed Grok test, authenticated CMS editor/browser acceptance, responsive visual screenshots, production database preflight and owner approval for application deployment and migration execution.

## SB 2 — authorised application deployment / database gate (2026-10-30)

- **Application deployment — PASSED:** approved commit `f9390d9e04d430ccc2f581fe17fdc843c346ca6c` deployed through the production Nitro/Wrangler procedure. The generated production config required the documented deployment-only removal of the rejected `staging` environment block; source `wrangler.jsonc` was not changed. New Worker `9af742b4-e35c-45d9-8c68-0a9a3a7c9c3e` is listed at 100% for `sharebarabara.co.ke`, with the existing `*/1 * * * *` trigger, ASSETS binding, rate limiter and production variables preserved. Previous Worker: `d8ce8556-73ee-44cd-be4d-8cbf93a9c902`.
- **Public smoke tests — PASSED:** `/`, `/news`, `/reports`, `/alerts`, `/statistics`, `/campaigns` and `/infrastructure-issues` returned HTTP 200 after deployment. Live `/news` SSR contains Latest News, Featured Articles and Trending News markers. Browser screenshots and authenticated CMS acceptance remain pending.
- **Production database migration — RESOLVED:** the prior backup-access blocker was cleared using the authenticated Supabase CLI session and PostgreSQL 17 client; the fresh backup, preflight, execution and verification are recorded in the production database release section below.

## SB 2 — production database release (2026-10-30)

- **Database access — PASSED:** the established `npx supabase` authenticated session minted a temporary Share Barabara project login. The installed PostgreSQL 17 client was used directly; Docker was not used. Project identity was verified as `yhqoggbntunxvlbcatwj` / Share Barabara, PostgreSQL 17.6.
- **Fresh recovery backup — PASSED:** `E:\sb2-production-backup-20261030-112227-editorial-public-auth.dump`, 796,864 bytes, SHA-256 `F4B229E8E706CF9AE2A5BB0150FB44E9689A760E234F865CB69E68A3F479E4B1`, `pg_restore --list` 1,272 entries. Scope includes `public` and `auth`, including migration-affected content, relationship-relevant rows and auth users. A clean isolated PostgreSQL 17.11 restore reproduced 97 Articles, 18 Reports, 14 Alerts, 1 Campaign, 1 Feed Post and 26 auth users; only expected existing-schema notices for `public` and `auth` occurred.
- **Preflight — PASSED:** exact local migration SHA-256 `8805B7B7B48A9A98A3E2494C923857402F5DD9C9775C50822C67D6D300E2B094`; `20261030170000` was already applied; `20261030180000` was absent before execution. Required content tables, `deleted_at` columns, role helpers, `incident_content_links`, Feed dependencies and RLS were present. No competing generic relationship objects existed.
- **Approved migration — PASSED:** only `20261030180000_editorial_content_relationships_review.sql` was executed once with `ON_ERROR_STOP=1`, then its exact version was recorded in Supabase migration history. New generic tables, functions, indexes and RLS policies exist.
- **Post-migration integrity — PASSED:** counts remain 97 Articles, 18 Reports, 14 Alerts, 1 Campaign, 0 Infrastructure Issues, 1 Feed Post, 0 canonical incident links and 0 relationship-history rows. Anonymous direct relationship writes were denied; public related-content RPC read remained available. Existing canonical Alert-to-Report authority was not modified.
- **Remaining live acceptance:** authenticated Featured/Related Content editor persistence, live Grok provider acceptance, public related-content confirmation, responsive browser screenshots and owner user acceptance remain pending. No generated production test content was created.

## SB 2 — final live acceptance attempt (2026-10-30)

- **Public HTTP smoke — PASSED:** the live production routes `/`, `/news`, `/reports`, `/alerts`, `/statistics`, `/campaigns` and `/infrastructure-issues` returned HTTP 200. Server-rendered markers confirmed `Latest News`, `Featured Articles` and `Trending News` on `/news`, and `Featured Reports` / `Featured Alerts` on the respective listing routes.
- **Authenticated Featured controls — PENDING:** no browser or authorised CMS session was available; Article, Report and Alert save/refresh/reversal persistence was not performed.
- **Related Content — PENDING:** no browser or authorised editor session was available; bidirectional picker, removal, reload and Alert-to-Report correction workflows were not performed live.
- **Grok conversion — PENDING:** no browser/provider-backed session was available; no production test records were created.
- **Responsive visual acceptance — PENDING:** the computer-use inventory returned no browser surfaces and the in-app browser was unavailable. No screenshots were captured at 320, 375, 390, 430, 768, 1024, 1280 or 1440px. Owner must perform visual acceptance on the live routes.

## SB 2 — platform-wide editorial correction candidate (2026-10-30)

- **Shared spacing — IMPLEMENTED / VISUAL ACCEPTANCE PENDING:** reduced shared EditorialBand, discovery, sidebar, ecosystem-preview and Reports/Alerts directory gaps to the compact editorial scale; no advertising placements were removed. Screenshot comparison remains pending because browser tooling is unavailable.
- **Report/Alert detail hierarchy — IMPLEMENTED / VISUAL ACCEPTANCE PENDING:** removed redundant directory navigation from Report detail, moved incident/publication dates below headlines, moved location metadata above media, aligned shared headline proportions, kept Alert full-content accent treatment, and returned Report body content to a plain editorial surface.
- **Summary fields — IMPLEMENTED / MIGRATION PENDING:** added editable Report and Alert summary controls and public rendering without using the body as a persisted summary. Review-only additive migration: `20261030190000_report_alert_summaries_review.sql`; it adds nullable `summary` columns only and has not been applied anywhere.
- **Report statistic highlights — IMPLEMENTED:** highlights display numeric values including `0`; NULL values remain NULL in storage and are qualified with `count unavailable` in the visible label/accessibility text.
- **Category administration — IMPLEMENTED / AUTHENTICATED ACCEPTANCE PENDING:** Article categories remain multi-select and now include searchable filtering; persistence still requires an authorised CMS browser check.
- **Quick AI Summary — IMPLEMENTED / BROWSER ACCEPTANCE PENDING:** state resets on content identity changes, pending summary responses are ignored after navigation, and the panel has accessible collapse/reopen chevrons. Signed-out chat handoff remains unchanged.
- **Homepage metadata — IMPLEMENTED:** root title and Open Graph title now use `Share Barabara - Share the Road: Live Hazard Alerts, Accident Reports, and Road Safety Campaigns`; individual route metadata remains route-specific.
- **Verification — PASSED:** focused correction tests 22/22; full suite 500/500; security suite 14/14; production build passed; `git diff --check` passed. TypeScript diagnostics: 826 candidate vs 827 at the pre-change documentation commit; remaining diagnostics are pre-existing generated-schema/index-signature debt.
- **Release status:** application deployment is not approved for this candidate. Do not execute `20261030190000_report_alert_summaries_review.sql` without separate migration approval and a fresh verified backup. Responsive screenshots, authenticated CMS workflows and owner visual acceptance remain open.

## SB 2 — final correction audit (2026-10-30)

- **Code audit — PASSED:** shared `EditorialBand`, discovery, sidebar and ecosystem-preview spacing is compacted centrally; Report/Alert detail routes place location before media and dates below headlines; Article-aligned headline sizing, redundant directory buttons, Report plain body, Alert accent body and distinct Alert summary are present.
- **Schema compatibility — PASSED WITH GATE:** `20261030190000_report_alert_summaries_review.sql` is additive and nullable. Report/Alert editors feature-detect the `summary` column and disable only summary persistence on the old schema, while other fields remain safe to save. Migration rehearsal could not be rerun in this environment because `psql`, `pg_dump`, `pg_restore` and a disposable backup are unavailable; prior PostgreSQL 17.11 rehearsal remains historical evidence, not new verification.
- **Functional code evidence — PASSED:** numeric zero/qualified unknown highlights, searchable category selection, record-scoped AI reset/stale-response protection, collapse/reopen controls, old-schema summary guard and exact homepage metadata are covered by the 6/6 audit tests. Authenticated persistence and provider-backed workflows remain unverified.
- **Release status:** no deployment or SQL execution was performed. Browser screenshots, authenticated CMS/provider acceptance and owner approval remain open.

## SB 2 — disposable PostgreSQL rehearsal update (2026-10-30)

- **Migration rehearsal — PASSED:** PostgreSQL 17.11 disposable cluster at `127.0.0.1:55432`, database `sb2_rehearsal`, isolated from the running local service and production. Restored `E:\sb2-production-backup-20261029-final.dump` (SHA-256 `1A364DE9682614B3D8EFA06DB013A40F12D3DE120E12360F31BB0674C2D9BE67`; `pg_restore --list` showed 1205 TOC entries). Restore emitted one expected `public`-schema-exists message; all backup objects/data restored. Baseline rows: 97 Articles, 15 Reports, 14 Alerts, 1 Campaign, 0 Infrastructure Issues, 1 Feed Post, 0 incident links.
- **Migration application — PASSED:** `20261030180000_editorial_content_relationships_review.sql` applied with `ON_ERROR_STOP=1`. It created the generic tables/RPCs, preserved the 15 Reports and 14 Alerts, and enabled RLS. A second application failed closed with `cross-content migration object already exists`; no duplicate objects were created.
- **Relationship/RLS evidence — PASSED:** editor-backed PostgreSQL tests created Article→Campaign, Article→Report, Article→Feed Post and Article→Infrastructure links; bidirectional public RPC retrieval returned the published Article relationship; pending Feed content was hidden; self-links and generic non-provenance Alert↔Report links were rejected; duplicate active links remained one row; remove/recreate produced append-only history; anonymous direct writes were denied; canonical `incident_content_links` row count remained unchanged.
- **AI draft creation — PASSED in disposable DB:** authenticated editor tests executed Article→Report, Alert→Report, Report→Article, Report→Alert, Article→Alert and Alert→Article. Each returned a real destination UUID and editor path, created a saved draft proposal, created a `derived_from` relationship, preserved NULL casualty fields where applicable, and left the destination unpublished/pending. Transactions were rolled back after inspection; no production data changed.
- **Recovery evidence — PASSED for disposable rehearsal:** the verified custom-format backup was restored into the isolated PostgreSQL 17.11 cluster, the migration was applied, and the disposable database was discarded/reset after testing. A rerun failed closed without duplicate objects. This is recovery rehearsal evidence, not production restore authorization.
- **Remaining acceptance:** browser/authenticated visual CMS acceptance and a live Grok provider call remain pending. Production deployment and production migration remain separately blocked pending owner approval; no production SQL or deployment was performed.
- **SB 2 final approved summary release (2026-10-30) — DEPLOYED / ACCEPTANCE OPEN:** application `c48cb962fd752f55b00e8dc897ee477529a75116` is live on Worker `03424776-a7f3-42fa-b479-8807d6a71270` at 100%. Previous release Worker: `91196868-4828-466c-b14d-9217abe0da34`; prior baseline: `9af742b4-e35c-45d9-8c68-0a9a3a7c9c3e`. Wrangler exposes no deployed Git SHA; repository ancestry and deployment sequence are corroborating evidence only.
- **Verification — PASSED:** full suite `500/500`, security `14/14`, production build and `git diff --check` passed. TypeScript remains `827` diagnostics on baseline and candidate, with no increase; these are existing repository typing errors.
- **Public smoke — PASSED:** `/`, `/news`, `/reports`, `/alerts`, `/statistics`, `/campaigns` and `/infrastructure-issues` returned HTTP 200. Live News contains Latest News, Featured Articles and Trending News. Homepage title is exactly `Share Barabara - Share the Road: Live Hazard Alerts, Accident Reports, and Road Safety Campaigns`.
- **Migration and recovery — PASSED:** exact migration SHA-256 `9FA3BCCB369D95D4AA470F2F36FD38AAF169378E325A26D602FCC711033D4D`; PostgreSQL 17.11 isolated rehearsal passed with nullable summary columns, preserved 18 Reports/14 Alerts, RLS/policy checks, anonymous denial and rollback probe. Fresh Share Barabara backup `E:\sb2-production-backup-20261030-summary-final.dump` is 907,256 bytes, SHA-256 `B66873DAA8B44D5F6B505080D04A08D6F25CC8E26D09EE723CF045000942BC07`, `pg_restore --list` 1,361 entries. Approved migration `20261030190000_report_alert_summaries_review` was applied once; production pre/post counts Reports 18/18, Alerts 14/14 and incident links 0/0; RLS remained enabled with 11 relevant policies; four NULL casualty and four NULL fatality values remain NULL.
- **Remaining acceptance — PENDING:** no browser surface or authorised CMS session was available. Authenticated summary/Featured/Related Content persistence, Alert-to-Report correction review, live Grok-provider checks, responsive screenshots at 320/375/390/430/768/1024/1280/1440px and owner visual/user acceptance remain open. Do not close the workstream without evidence.
- **SB 2 Reports/Alerts editorial correction — IMPLEMENTED / DEPLOYMENT PENDING (2026-10-30):** Report and Alert detail pages now use the shared Article-equivalent media order. Alert hierarchy is type label → classifications → headline → date/status → location → share controls → media → compact `By` attribution → summary → content. Report location/date, `ACCIDENT REPORT` labeling and share/media order are aligned similarly. Report and Alert directory bands use the compact shared `EditorialBand` spacing scale.
- **Attribution/status correction — IMPLEMENTED / LIVE ACCEPTANCE PENDING:** public editorial bylines use `By [name]`, without public biography text in editorial detail/listing surfaces. Alert lifecycle labels map `active` to Active, `in_progress` and legacy `under_resolution` to In Progress, and `resolved` to Resolved; null status remains unbadged and the Alert editor provides `No status selected`. No migration was added.
- **Regression evidence — PASSED:** focused Reports/Alerts and News regressions `12/12`; security suite `14/14`; production build passed; `git diff --check` passed. Existing full-suite baseline remains `500/500` from the reconciled candidate; the full suite should be rerun before any deployment of this new candidate.
- **Remaining acceptance:** no browser automation is available, so responsive screenshots at 320, 375, 390, 430, 768, 1024, 1280 and 1440px, live detail-page visual comparison, authenticated Alert status save/reload and owner acceptance remain pending. Production remains unchanged at application `c48cb962fd752f55b00e8dc897ee477529a75116`, Worker `03424776-a7f3-42fa-b479-8807d6a71270`.
- **SB 2 final pre-deployment audit — IMPLEMENTED / DEPLOYMENT PENDING (2026-10-30):** candidate `9f2946a3fd2886a7b1eb3e30e931d30805da5cc8` was verified at source level. Alert order is type/categories → headline → date/optional status → location → sharing → media → avatar/name → summary → full content. Report order preserves content label, date, location, sharing and media rules. Article-equivalent media spacing and compact shared directory bands are in place.
- **Attribution audit — PASSED in code:** public Article, Report, Alert, Infrastructure and Video editorial surfaces render compact `By` attribution, avatar/name where supported, and no profile biography text. Stored profile biographies and profile-page data were not deleted.
- **Status/label audit — PASSED in code:** Alert null status remains unbadged and persistable as NULL; legacy `under_resolution` displays `In Progress`; `ACCIDENT REPORT` precedes Report classifications. No SQL changes are required.
- **Regression evidence:** focused audit tests `9/9`; previous focused correction set `12/12`; security `14/14`; build and diff checks passed. Browser screenshots, responsive widths and authenticated CMS persistence remain pending.
