# Development tasks

## Task 70 / SB 2 — Reports, Alerts and view-count correction — DEPLOYED / LIVE ACCEPTANCE PENDING — 2026-10-29

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

Reviewed migration candidate: `20261029170000_public_incident_featured_selection_review.sql`.
It adds nullable-safe boolean selection fields with false defaults and partial
indexes only; it does not delete, rewrite or publish existing records. It has
not been executed: the approved application deployed successfully, but the
required fresh production backup is blocked because the authenticated
Supabase CLI session has no database password or equivalent dump connection.
Rehearsal against
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
`yhqoggbntunxvlbcatwj`; migration execution remains blocked pending the fresh
backup connection.
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
