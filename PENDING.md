# Pending

- **TASK 70 / SB 2 REPORTS, ALERTS AND VIEW-COUNT CORRECTION — IMPLEMENTED /
  DEPLOYMENT AND VISUAL ACCEPTANCE PENDING (2026-10-29).** Reports and Alerts
  now use separate Latest, Featured and Trending / Most Viewed sections. Featured
  is an explicit editorial selection, not a severity or newest-content fallback.
  Admin Report editing and Alert actions expose role-gated Featured selection;
  public submission forms share a three-column desktop row with two selected
  Featured cards when available. News, Reports and Alerts use session-scoped
  view-event deduplication while preserving existing histories and ranking data.
  Candidate migration
  `20261029170000_public_incident_featured_selection_review.sql` is additive and
  remains unapplied pending separate approval. Full suite `486/486`, security
  `14/14`, focused correction tests `16/16`, build and diff checks pass. Latest
  production remains Worker `778300c3-f7c8-499f-823b-735c239145f9` from
  application commit `2694f5cb2d0b09f4e9b311e7755f5a42ec6456cb`; no deployment
  was performed. CUA returned no browser surfaces and no local browser runner is
  installed, so visual screenshots and owner acceptance remain pending.

- **TASK 70 / SB 2 PRIORITY CORRECTION — DEPLOYED / LIVE TESTING AND OWNER
  ACCEPTANCE PENDING (2026-10-29).** Official national statistics now have a
  reviewed admin/provenance path separate from internal canonical incidents;
  homepage cards will not expose legacy unverified 2025 aggregates as current
  2026 official numbers. The candidate migration
  `20261029150000_official_statistics_management_review.sql` was approved and
  applied once after a fresh verified backup. It covers every existing aggregate statistics
  table and historical year with provenance/publication metadata and revision
  audit history; Admin Statistics exposes those fields and preserves calculated
  internal incident counts. The public year selector drives year-dependent
  headline metrics, charts and selected-year incident summaries. News trending
  uses genuine view windows (24h, 7d,
  month, year), global/article previews use lead-plus-two-compact stories, and
  Alert featured images flow through public loaders when present. Full tests
  `482/482`, security `14/14`, focused priority/hierarchy tests `17/17`, build
  and diff checks pass. Approved application commit
  `2694f5cb2d0b09f4e9b311e7755f5a42ec6456cb` is live on Worker
  `778300c3-f7c8-499f-823b-735c239145f9` at 100%; previous Worker was
  `ad7dabfc-5f9a-4bcc-bd5e-3c6ca3ca8cbf`. Fresh Docker-free backup
  `E:\sb2-production-backup-20261029-final.dump` is `755087` bytes and passed
  `pg_restore --list`. Production checks preserved all eight dataset totals,
  the yearly `year` key, published historical rows, revision RLS/policies/
  triggers and unknown-value semantics; canonical and published report counts
  independently return `11`. Browser visual evidence is pending because no
  browser surface is available. Authenticated admin editing, publishing and
  owner responsive acceptance remain pending.

- **TASK 70 / SB 2 STATISTICS MIGRATION SAFETY — DEPLOYED / LIVE ACCEPTANCE
  PENDING (2026-10-29).** Isolated PostgreSQL 17 rehearsal restored the
  validated backup’s eight statistics datasets and applied the candidate
  migration locally. Counts and numeric aggregates matched before and after;
  the yearly `year` primary key remained intact; existing rows defaulted to
  `published`; revision RLS/triggers were created; and anonymous reads excluded
  an archived row. The migration now enforces append-only revision history and
  the admin editor unpublishes rows rather than deleting them once metadata is
  active. The deployed application remains compatible before migration through
  legacy read fallbacks; safest release order was application candidate first,
  approved migration second, then admin/public verification. The approved
  migration was applied once in production after the fresh backup and preflight;
  the Supabase migration ledger records `20261029150000` as applied. HTTP smoke
  checks passed, while authenticated admin and browser visual acceptance remain
  pending.

- **TASK 70 / SB 2 PUBLIC EDITORIAL HIERARCHY — DEPLOYED / OWNER ACCEPTANCE
  PENDING (2026-10-29).** The shared public release
  now provides separate Latest, Featured and Trending three-card sections for
  News, Reports and Alerts; three-story category columns with one lead and two
  compact stories; canonical Statistics navigation for the 11 Recorded Road
  Accidents card; public Reports without administrative Editorial AI panels;
  consistent metadata/Read more links; and centred Mjengo Hub/Mjengo Networks
  previews. Deployed application commit is
  `f0a26f87610e62eac6c2e73d4e8ab5255ea68fca` on Worker
  `ad7dabfc-5f9a-4bcc-bd5e-3c6ca3ca8cbf` at 100%; previous Worker was
  `62c8fedb-494c-4e3f-bf4e-5b2efb2815cb`. No SQL or migrations changed.
  Focused hierarchy checks pass 29/29; full tests pass 476/476, security
  14/14, and production build passes. Live screenshots and authenticated
  responsive acceptance remain pending because no browser automation surface is
  available. Owner approval is required before deployment; SB4 and advertising
  task records remain separate. Public HTTP smoke checks returned 200 for the
  homepage, News, Reports, Alerts, Statistics, Campaigns and Infrastructure
  Issues. Homepage SSR includes the Statistics destination and public Reports
  has no Editorial AI marker. Browser screenshots remain unverified.

- **SB 2 OWNER LIVE ACCEPTANCE — PENDING LIVE TESTING / PENDING USER
  ACCEPTANCE (2026-10-29).** Lifecycle remains Implemented → Deployed → Live
  Tested → User Accepted → Closed. Owner must test: published accident count
  11 and NULL casualty handling; Report visibility and duplicate exclusion;
  editor confirmation, correction, revocation, audit history and linked-record
  navigation; editor-only permissions and unauthorized-write denial; verified
  accident map coordinates and date/country/admin-area/transport/corridor/type/
  severity filters; and mobile/desktop responsive behavior. No browser result is
  being marked passed without evidence. The implementation is deployed on
  Worker `62c8fedb-494c-4e3f-bf4e-5b2efb2815cb` from application commit
  `96f1675f042e3d5a68bf48c70a408367bd998410`; all five SB2 migration versions
  are applied, including `20261029130000`. Tests are 469/469 and security is
  14/14. SB4 and advertising dependencies remain under their existing task
  IDs.

- **SB 2 FINAL ACCEPTANCE — RECOVERY PASSED / AUTHENTICATED BROWSER BLOCKED
  (2026-10-29).** A public+auth custom-format backup was restored successfully
  into a disposable local PostgreSQL 17 cluster with isolated Supabase role
  stubs. Restored data and contracts matched production: 15 Reports, 14
  Alerts, 11 canonical incidents, RPC 11, 26 auth users, RLS on all relevant
  tables, six policies, key relationship/statistics functions and NULL casualty
  values. The disposable cluster was removed after verification. Browser CUA
  initialization exposed no apps or browsers, and no authorized editor test
  session was available; live confirmation, correction, revocation, audit-panel
  navigation, filters and responsive authenticated review remain unverified.
  Minimum prerequisite: browser automation plus a non-destructive authorized
  editor test account.

- **SB 2 STATISTICS INTEGRITY CORRECTION — EXECUTED / VERIFIED (2026-10-29).**
  Migration
  `20261029130000_published_accident_report_count_deleted_filter_review.sql`
  was applied once to Share Barabara and recorded as applied. The RPC and
  canonical statistics independently return 11 with matching eligibility;
  soft-deleted, duplicate and unapproved reports are excluded, unknown
  casualties remain NULL, and RPC/RLS checks passed. No redeployment occurred.
  Only authenticated browser acceptance remains pending.

- **SB 2 PRODUCTION MIGRATIONS — HISTORICAL EXECUTION RECORD / SUPERSEDED BY
  VERIFIED CORRECTION ABOVE (2026-10-29).** Existing authenticated Supabase CLI authorization was used
  for Share Barabara only. A 589,228-byte custom-format public-schema backup
  passed `pg_restore --list`. Exactly the approved migrations
  `20261005120000`, `20261006110000`, `20261029100000` and `20261028130000`
  were applied in order, and their migration history entries were repaired.
  Verification preserved 15 reports, 14 alerts, 11 canonical eligible rows,
  one NULL fatalities value and one NULL casualties value; RLS and write
  denial checks passed. The later separately approved corrective migration
  fixed the deleted-report discrepancy; see the verified correction entry
  above. No further SQL is pending for this migration set.

- **SB 2 PRODUCTION BACKUP GATE — BLOCKED SAFELY (2026-10-29).** The
  authorized Supabase CLI verified Share Barabara project
  `yhqoggbntunxvlbcatwj` and returned `walg_enabled: true`,
  `pitr_enabled: false`, with an empty physical-backup list. No provider
  snapshot/PITR recovery point exists for this run. PostgreSQL 17 client
  utilities (`pg_dump`, `pg_restore`, `psql`) are installed locally, but no
  temporary database password or connection string is available; application
  publishable keys are not valid dump credentials. No production SQL or dump
  connection was attempted. The already-approved four-migration set remains
  unapplied. Minimum prerequisite: an authorized temporary Share Barabara
  database connection/password, then a nonempty custom-format dump validated
  with `pg_restore --list`; do not use Mjengo Networks.

- **SB 2 MIGRATION PACKAGE — APPROVED / EXECUTED; SEE CORRECTION BLOCKER ABOVE (2026-10-29).**
  The rerun-hardened migration candidates and exact production procedure are
  pushed on `integration/sb2-canonical-incident-release` at
  `63c84fb8939f72b03fdb156411b57429116cb022`. The requested production SQL
  approval set is, in order: `20261005120000_accident_duplicate_merge_review.sql`,
  `20261006110000_incident_duplicate_suggestions_review.sql`,
  `20261029100000_incident_content_links_review.sql`, then
  `20261028130000_canonical_accident_statistics_review.sql`. The transport
  extension and SB4 geography migration are deferred pending SB4 identifier
  coordination. No disposable database is available; Mjengo Networks is not
  used. Production preflight verified the Share Barabara ref and absence of
  all four migration IDs, but backup creation stopped before dump execution
  because Docker's Linux engine is unavailable; the zero-byte output is not a
  valid backup. No production SQL has been executed. A valid provider snapshot
  or authorized working PostgreSQL/`pg_dump` path is required to continue.

- **SB 2 CANONICAL INCIDENT / RELATIONSHIP / STATISTICS INTEGRATION — APPLICATION DEPLOYED / ACCEPTANCE PENDING.** Branch `integration/sb2-canonical-incident-release` deployed commit `96f1675f042e3d5a68bf48c70a408367bd998410` to Worker `62c8fedb-494c-4e3f-bf4e-5b2efb2815cb` at 100% on 2026-10-29. The release preserves the editor-authoritative `incident_content_links` model and canonical statistics/map adapter, with legacy-schema fallbacks. Public `/`, `/statistics`, `/reports`, `/alerts`, `/partner-with-us`, `/feed` and `/news` returned HTTP 200. No SQL or migration was executed. Database/RLS acceptance, authenticated relationship review, browser acceptance, SB4 geography acceptance and final user acceptance remain pending.
- **SB 2 ISOLATED DATABASE TESTING — SETUP REQUIRED.** The authenticated CLI found the linked production project `Share Barabara` (`yhqoggbntunxvlbcatwj`) and a separate `Mjengo Networks` project (`skgtsdyxobyjtzrklyzi`). The latter is not designated disposable, so no SQL was executed. See `docs/sb2-isolated-database-testing.md` for the minimum non-production project and temporary credential requirements.

- **SB 2 ALERT-TO-ACCIDENT-REPORT RELATIONSHIPS — IMPLEMENTATION CANDIDATE / NOT APPLIED.** The additive migration candidate `20261029100000_incident_content_links_review.sql` creates the single canonical `incident_content_links` model for editor-confirmed Alert → approved Accident Report links, plus append-only audit history and editor-only confirm/reject/correct/revoke RPCs. The Reports admin now provides manual linking, suggestion review, correction, revocation and links to both records. Confirmed links expose only public read state; no public or ordinary authenticated write path exists. Published accident counts continue to use approved reports with `duplicate_of_report_id IS NULL`; Alerts are not counted as separate accident rows, and unknown casualty values remain unknown. No migration or deployment was performed. The active production Worker is `149c9345-8d0e-44d7-a898-086fe95aab11` at 100%, but Cloudflare reports its source as `Unknown (version_upload)` with no Git SHA. Isolated database execution is blocked because Docker Desktop's Linux engine is unavailable; authenticated browser acceptance is blocked because no browser surface is available. Owner approval is required before migration application or deployment.

- **ACCIDENT REPORT CMS REBUILD + STATISTICS INTEGRITY — CANDIDATE / NOT DEPLOYED.** Branch `fix/report-editor-statistics-integrity` is based on the latest local production line represented by Worker `cb214516-732d-47c0-9560-63ff7c34005e` (Cloudflare source metadata is not independently exposed). The Reports admin Add action now navigates to `/admin/reports/new` and uses the shared full-page `EditorialRecordEditor` used by `/admin/reports/:reportId/edit`; the legacy Add Report modal is no longer used. Create mode places the three primary AI actions above the fields and uses the server-authorized `submitAccidentReport` workflow; Edit mode retains Update Existing with Grok and same-record updates. The Article editor remains article-only and has no accident casualty/vehicle fields. The current `accident_reports` schema supports occurrence time, county, road/road_id, incident_type, severity, coordinates, nullable vehicle/casualty/fatality values, parties, casualty breakdown, attachments, image metadata and SEO; it does not support separate report summary, country/locality/direction, emergency response, investigation status, contributing factors or source URL columns, so those were not invented.

  Statistics audit found approved reports are the only safe incident-total source today; report self-duplicates are excluded through `duplicate_of_report_id`. The existing Alert queries previously mixed every Alert into casualty-party totals, including unrelated hazards, and had no Alert-to-Report canonical incident relation. This candidate removes that unsafe mixed aggregation and keeps the report metric authoritative; alert totals remain an alert metric, not accident totals. Eligible verified accident Alerts therefore remain **BLOCKED pending a reviewed relationship model**. Smallest safe migration proposal (not created or executed): a reviewed `incident_content_links` join table with `canonical_report_id`, `content_type`, `content_id`, reviewer/status/audit fields, unique content identity and RLS; only confirmed links would collapse an Alert into its canonical Report. Do not infer links by title or similarity, and do not execute SQL without owner approval. Scoped CMS/statistics tests pass **37/37**, security tests **14/14**, and production build passes. Browser/authenticated/provider acceptance remains blocked in this environment because no browser harness or authenticated session is available. Live SearXNG remains explicitly PENDING.

- **ADMIN CMS + PUBLIC EDITORIAL STYLING REGRESSION REPAIR — DEPLOYED.** Final runtime commit `514017f` (release documentation commit `568c8595d33ee500eb649565addbb83d815be669`) was deployed to Cloudflare Worker `90dd595c-9dde-4a85-946a-a3134193c1bb` at 100% on 2026-10-26. The actual pre-deployment Worker was `0e147a07-9013-47b7-af4b-4b1e2e0c8803`; it is the rollback target. The release preserves the Admin CMS redesign and restores the approved public summary chevron styling, Read Also rail/title treatment, category navigation and compact editorial category badges. Preview summaries remain absent and detail summaries remain available. Focused checks **34/34**, full suite **393/393**, security tests **14/14**, production build and diff checks passed. Public and admin route smoke requests returned HTTP 200, but no authenticated admin session or browser visual verification was available. No migrations, Editorial AI, authentication, moderation, advertisements, Task 70 or SearXNG changes were made. Live SearXNG remains explicitly PENDING.

- **ADMIN CMS + PUBLIC EDITORIAL STYLING REGRESSION REPAIR — DEPLOYMENT CANDIDATE.** Candidate branch `fix/admin-public-style-repair` is based on the deployed Admin CMS code commit `4b34ad9fee8e0874938c30e04a688915f9dce0e3` and preserves its compact listing tables, checkbox-first rows, featured thumbnails, filters, actions, permissions and responsive layouts. It restores the approved public editorial summary background and yellow/navy diagonal chevron border, the left-aligned dark-blue Read Also treatment, shared category navigation styling, and the newer light-blue Read Also title background plus compact yellow category badges above detail titles. Preview summaries remain absent and detail summaries remain available. The repository baseline check found Cloudflare Worker `b78fc802-e222-4951-a051-f98edc871f05` at 100% immediately before this release; it superseded the previously reported `22348c43-daf0-409c-b5c1-2b61f90e00e7`. No migrations, Editorial AI logic, authentication, moderation, advertisements, Task 70 or SearXNG changes are included. Live SearXNG remains explicitly PENDING.
- **GLOBAL HEADER + ARTICLE DETAIL SPACING REFINEMENT — DEPLOYED.** Final runtime commit `a10cff630879830e956f0c48d407514b646103db` was built from the independently verified live runtime commit `04dc8ebdcac99187b250d79cf551b97deedf9bd2` and deployed to Worker `64deafd6-a834-49ce-b7a8-260feb7d2d00` at 100% on 2026-10-26. The pre-deployment Worker was `369a8591-03e0-44aa-ab77-b5f114217587`. Mobile header base padding changed from `px-3` to `px-1.5` and gap from `gap-2` to `gap-1`; breadcrumb/detail top spacing and article card padding were reduced approximately 50%; Article title/date divider was removed with title/date spacing reduced from `pb-4 + mt-3` to `pb-2 + mt-1.5`; detail category-to-title spacing was reduced to `mt-1.5` across Articles, Alerts, Reports, Campaigns and Infrastructure Issues. Focused checks **39/39**, full regression **400/400**, security checks **14/14**, production build and diff checks passed. Public smoke routes `/`, `/news`, `/alerts`, `/reports`, `/campaigns` and `/infrastructure-issues` returned HTTP 200. Browser visual verification at 360, 390, 412, 768, 1280 and 1440 pixels was unavailable because CUA initialization failed with `failed to write kernel assets: The system cannot find the path specified. (os error 3)`. No admin, Editorial AI, summary, Read Also, preview, advertising, authentication, Task 70 or SearXNG changes were made. Live SearXNG remains explicitly PENDING.

- **GLOBAL EDITORIAL PREVIEW + UI CORRECTIONS — DEPLOYED.** Release branch `release/global-preview-ui-20261026` is deployed from code commit `3918325` (full SHA recorded in Git) as production Worker `fc84339d-7b82-4e7c-b858-8269d9155464` on 2026-10-26. The pre-deployment production Worker `9282cddd-d668-4da1-8d28-6a76b8d90e7d` is the rollback target. The release preserves the deployed Editorial AI repair commit `012843a8e41b566ee78c1ff46e88b003b0ee9e0a`, including direct field population, source-fidelity handling and bounded provider retries. Global cross-content previews, responsive three-card desktop/latest-only mobile behavior, canonical View More/View All links, italic captions, upright attribution without an automatic `Credit:` prefix, left-bordered editorial summaries and the shared admin content-listing surfaces are included. Campaigns and Infrastructure Issues intentionally retain the honest Latest fallback because no view-tracking tables/RPCs exist; no migration was created or executed. Production smoke GETs returned HTTP 200 for `/`, `/news`, `/alerts`, `/reports`, `/campaigns`, `/infrastructure-issues`, `/search`, `/auth` and the five applicable admin listing shells. Focused UI/preview/AI checks, full suite **385/385**, security **14/14**, production build and `git diff --check` passed. The normal Nitro wrapper rejected the generated staging environment block; the same production artifact was deployed directly with authenticated Wrangler after removing only that generated non-production block. CUA browser initialization failed with `failed to write kernel assets: The system cannot find the path specified. (os error 3)`, so screenshots and interactive responsive/provider acceptance were not claimed. No database migrations, advertisements, Task 70, authentication or SearXNG changes were made; Live SearXNG remains explicitly PENDING. Live Grok/Groq generation was not exercised with production credentials.

- **ALERTS HAZARD FORM CORRECTION — DEPLOYED / BROWSER ACCEPTANCE OPEN.** Commit `1482834b56938869df1ab478e3abdd74c4c2e0e9` was deployed to the production `share-barabara` Worker as version `647a32e3-cbd8-4055-ab10-4a6f2a6a525a` on 2026-10-25 using the authenticated Wrangler production artifact after removing the generated staging environment block. Previous Worker `0df07f26-0c37-4375-91ee-9cfebf8cbdcd` remains the rollback target. Smoke GETs returned HTTP 200 for `/`, `/news`, `/reports`, `/alerts`, `/infrastructure-issues`, `/campaigns`, `/search`, the report detail route and `/auth`. Production `/alerts` HTML confirms the new hazard form marker, no old persistent sidebar grid marker, AI header and advertisement markers; `/news` confirms category browsing and View More markers. No migration, AI/auth, Task 70, advertisement or SearXNG changes were deployed. Live SearXNG remains explicitly PENDING. Browser screenshots and responsive interaction/value-preservation checks remain owner acceptance items.
- **ALERTS HAZARD FORM LAYOUT — IMPLEMENTED / READY FOR DEPLOYMENT.** On branch `feat/category-entity-browsing`, the permanent `/alerts` report sidebar was removed. Critical Alerts now occupy the full content width, followed by one responsive Report a hazard editorial card. Sign-in guidance, safety copy, AlertForm permissions and existing moderation behavior are preserved. Category/entity grouping remains separate from urgent and trending collections. Focused UI tests pass **9/9**; full suite passes **361/361**; security tests pass **14/14**; `bun run build` and `git diff --check` pass. No migrations, AI/auth, ads, Task 70 or SearXNG changes were made. Live SearXNG remains explicitly PENDING. Browser visual acceptance remains separate from automated validation.

- **GLOBAL EDITORIAL AI — IMPLEMENTED ON `feat/global-editorial-ai` / TESTING / NOT DEPLOYED.** The existing server-authorized Article, Alert and Accident Report Editorial AI infrastructure was extended without a migration to the existing Campaigns and Infrastructure Issues admin publishing forms. Each type has its own field allowlist and factuality prompt; Generate remains Grok/xAI, Auto-Populate remains Groq, and Update Existing remains review-only. Source text, bounded text attachments and up to three direct public HTTP(S) source URLs are supported; URL retrieval fails closed with a paste-text error and does not activate SearXNG. Existing role checks, rate limiting, provider secrets, controlled taxonomies, unknown casualty preservation, non-destructive form application and normal review/save/publish workflows remain in force. Jobs, Tenders and Events are not implemented as Share Barabara publishing modules and were not invented. Focused AI/security tests and TypeScript checks pass; production build and browser/runtime provider acceptance remain to be run. No migration, deployment, Task 70, advertisements, public AI chat or SearXNG configuration changes were made. Coordinate one reviewed release with the separate editorial UI workstream.

- **GLOBAL CATEGORY / ENTITY BROWSING ARCHITECTURE — IMPLEMENTED / TESTING / NOT DEPLOYED.** Branch `feat/category-entity-browsing` corrects the main News listing so each desktop card represents one distinct CMS category, with the newest published item plus two newest compact supporting items and a canonical category link. The shared `CategoryEntityCard` and `groupLatestByEntity` primitives keep category listing cards separate from category-detail sections. The same entity-card grouping is applied to latest and filtered Reports and Alerts by incident type/hazard type; urgent and engagement-specific collections remain intentionally separate. Tablet/mobile grids use two/one columns without fixed-width overflow. Focused category/editorial tests pass **50/50**; full suite passes **358/358**; security tests pass **14/14**; `bun run build` and `git diff --check` pass. No migrations, AI/auth/provider, Task 70, advertisement or SearXNG changes were made; Live SearXNG remains explicitly PENDING. Browser screenshots and live visual acceptance are unavailable and remain owner acceptance items. No deployment performed.

- **GLOBAL EDITORIAL LAYOUT CORRECTIONS — DEPLOYED / BROWSER ACCEPTANCE OPEN.** Approved commit `99ad9f0656dc678d61d6a5a3081253490dced8c5` from branch `feat/editorial-layout-corrections` was deployed to the production `share-barabara` Worker as version `0df07f26-0c37-4375-91ee-9cfebf8cbdcd` on 2026-10-23. Previous production Worker `6288d6da-e2c0-41c9-aa3a-d877e755cabd` is the rollback target. The normal Nitro deploy wrapper initially stopped before upload because its redirected generated config retained the non-production `staging` environment; the same generated production artifact was then deployed successfully with authenticated Wrangler using the existing production route, vars, bindings and secrets. Production smoke GETs returned HTTP 200 for `/`, `/news`, `/reports`, `/alerts`, `/infrastructure-issues`, `/campaigns`, `/search` and `/reports/7629a1aa-e8c0-4d31-a3d7-0e1fb43ab78e`. Returned HTML included the new Explore Share Barabara, Mjengo Hub, Mjengo Networks and report-form markers. Verified public partner destinations returned HTTP 200: Mjengo Hub home, `/media`, `/articles`, `/projects`; Mjengo Networks home, `/feed?view=media`, `/jobs-tenders`, `/events`, `/suppliers`, `/directory` and `/quote`. No migration was executed; Task 70, advertisements, AI/auth/provider functionality and SearXNG configuration were not changed. Live SearXNG remains explicitly PENDING. Browser screenshots, responsive visual review, expanded form interaction/value preservation and runtime image-network validation remain owner/browser acceptance items; HTTP 200 is not visual acceptance.

- **GLOBAL EDITORIAL LAYOUT CORRECTIONS — IMPLEMENTED / TESTING / NOT DEPLOYED.** Branch `feat/editorial-layout-corrections` is based on verified production baseline `ead8811f5187d9fe04ff690870fded56e5abc3d2`. The Reports form is no longer a persistent sidebar: it is rendered after the first available report group as one responsive editorial card slot, with the existing progressive form, secure uploads, moderation, validation and nullable casualty semantics preserved. Shared incident image rendering now distinguishes missing uploads from failed URLs and uses compact intentional fallbacks. Explore Share Barabara is derived from the shared header navigation order with verified secondary destinations and no route-specific rotation. Mjengo Hub and Mjengo Networks now use coordinated three-card ecosystem sections with navigation-only fallbacks when optional upstream previews are unavailable; unverified signup routing was not introduced. Focused editorial, layout, safety, ad and ecosystem tests pass **42/42**; `git diff --check` and `bun run build` pass. Full suite and security suite are still being run. No migrations, Task 70 changes, advertisement changes, AI/auth/provider changes, deployment or SearXNG activation were performed. Browser screenshots and responsive visual acceptance remain pending because browser tooling is unavailable. Status remains TESTING pending owner review.

- **GLOBAL EDITORIAL BROWSING PHASE — IMPLEMENTED ON ISOLATED BRANCH / NOT DEPLOYED.** Branch `feat/global-editorial-discovery` is based on verified production commit `b31a26ce00131a9fcf2989afa672c7b050c48956`. Shared Article/incident listing renderers now alternate equal three-record groups with featured-plus-two-compact groups while preserving the outer three-column structure, content-specific metadata, moderation visibility and nullable casualty semantics. A centrally configured Explore Share Barabara rail is wired to verified public destinations (`/news`, `/alerts`, `/reports`, `/statistics`, `/feed`, `/campaigns`, `/infrastructure-issues`, `/pages/`); `/categories` remains intentionally unsupported because no public route or public link exists. Existing `BannerAd`/ad-interleave architecture is unchanged. Full suite passes **352/352**; focused editorial/ad/public QA tests pass **13/13**; security tests pass **14/14**; `bun run build` passes. No database migrations, Task 70 changes, advertisement changes, AI/auth/provider changes, deployment or SearXNG activation were performed. Browser screenshots and responsive visual acceptance remain pending because browser tooling/authenticated sessions are unavailable. Review and owner acceptance are required before deployment.

- **FINAL COORDINATED PRODUCTION CANDIDATE — NOT DEPLOYED.** Branch `release/final-production-20261022`, commit `22d83b0`, is the non-destructive merge of AI release `8fb1d6f` and editorial UI release `0f08060`. Full suite passes **350/350**; focused AI/security/retrieval/editorial/migration-readiness tests pass **44/44**; `bun run build` and `git diff --check` pass. No database migrations were added or executed. Task 70, advertisements and SearXNG configuration are unchanged; Live SearXNG remains explicitly PENDING. Deployment command after approval: `npm run deploy:production`. Rollback Worker: `0ba2e03b-7050-45e1-8795-724064db0565`. Browser/live production verification and deployment remain pending; only one release owner should deploy.

- **EDITORIAL UI RELEASE CANDIDATE — LOCAL / NOT DEPLOYED.** Candidate branch `release/editorial-ui-candidate` is based on `1c4bf5b` and therefore includes AI commit `9d1fda8` without rebasing or overwriting it. The compact report form, report/alert editorial preview sidebars, shared Explore navigation, Infrastructure Issue/Campaign detail recommendations, featured-image captions and responsive editorial shell are implemented. Full repository tests pass **350/350**; focused UI/security/AI/retrieval/migration-readiness tests pass **57/57**; `bun run build` passes. No database migration, Task 70/advertisement change, SearXNG activation, staging deployment or production deployment was performed. Browser surfaces were unavailable for screenshots; owner/release review is still required.

- **AI CHAT HISTORY RELEASE READINESS — CANDIDATE `9d1fda8` / NOT DEPLOYED.**
  The candidate is pushed on `release/production-20261022` and includes the
  verified public-AI hotfix chain (`73b35fe`, `d620123`). The Bun/Vite 7.3.7
  production build passes. The complete repository suite is now **346/346**;
  seven stale expectations were corrected without weakening coverage (role-
  gated editorial AI, clipboard formatting, report authorization, direct chat,
  and the current upstream fetch contract). The focused AI, security,
  retrieval, artifact and workflow suites pass **52/52**. No deployment or
  migration was performed. The current production
  Worker `0ba2e03b-7050-45e1-8795-724064db0565` is the rollback target.

  Historical production schema evidence indicates existing owner-scoped
  `ai_chat_threads`/`ai_chat_messages` tables support basic create, save,
  reopen, rename, archive and ownership checks using existing columns. The
  proposed `20261022130000_ai_chat_history_hardening_review.sql` is not
  required for those basic operations, but `context_url`, durable `evidence`,
  retry `client_message_id` and explicit `generation_status` remain migration
  dependent. The initial live 404 was a malformed PowerShell probe; corrected
  anonymous REST probes reach all three tables and return no rows. Owner-policy
  behavior still requires an authenticated owner session or privileged
  read-only catalog access, which is not available here. No SQL was executed.
  Browser and authenticated acceptance remain pending; Live SearXNG remains
  explicitly PENDING.

- **MASTER PUBLIC AI CHAT WORKFLOW — IMPLEMENTED / MIGRATION AND BROWSER ACCEPTANCE
  PENDING.** The header and contextual surfaces now share the same public AI
  infrastructure. Signed-out header users see only the primary `Sign in to
Chat` action; signed-in users get the direct `Ask Share Barabara AI...`
  composer. Published Article, Alert and Report surfaces keep Quick AI Summary
  and source links, show no active guest composer, and present the authenticated
  composer immediately without a `Continue Chatting` step. Alerts now use the
  same summary-plus-chat surface. Saved chats can be reopened through the
  original published content when available, general chats reopen in the header
  surface, and owner-scoped history supports rename and soft-delete/archive.
  Existing server-side ownership checks and RLS are preserved. Focused AI,
  retrieval, security and workflow tests pass **42/42**; Bun/Vite 7.3.7
  production build passes. No deployment or migration was performed.

  The existing `ai_chat_threads`/`ai_chat_messages` tables and owner-only RLS
  are present in the reconciliation audit, but the new review-only migration
  `supabase/migrations/20261022130000_ai_chat_history_hardening_review.sql`
  is required before claiming durable evidence/source references, original
  context URLs and retry idempotency. It adds nullable context URL, message
  evidence, client request ID with a unique retry index, and generation status;
  rollback SQL is included. It has not been executed. Owner approval and live
  schema verification are required before enabling those fields or deploying a
  persistence-dependent release. Browser login/OAuth return, saved-chat
  continuation, desktop/tablet/mobile acceptance and live authenticated chat
  remain pending. Live SearXNG remains explicitly PENDING.

- **PRODUCTION CONTEXTUAL AI CHAT HOTFIX — DEPLOYED / BROWSER ACCEPTANCE OPEN.**
  Commit `d62012337f45cade5eb11032f3a8216dd2eebed2` preserves the exact
  content return context through the existing sign-in flow, restores the same
  published-context Quick AI Summary after login, opens/focuses contextual
  chat from `#share-barabara-ai`, keeps the summary above the conversation,
  and renders published Share Barabara evidence links for chat answers. While
  Live SearXNG remains pending, external-research failure states now show the
  approved “information beyond Share Barabara's available reports” message;
  no external result is fabricated. Focused AI/security/retrieval tests pass
  32/32 and the Bun/Vite 7.3.7 production build passes. Deployed to
  `share-barabara` as Worker version `0ba2e03b-7050-45e1-8795-724064db0565`
  on 2026-10-22; Wrangler confirmed `AI_RATE_LIMITER`, `ASSETS`, production
  vars, and secret names `GROQ_API_KEY` and `XAI_API_KEY` remain present.
  Public smoke HEAD requests for `/`, `/news`, `/alerts`, `/reports`,
  `/infrastructure-issues`, `/campaigns`, `/statistics`, `/feed`, `/search`
  and the affected report route returned HTTP 200. Browser signed-out login,
  exact-page return, summary restoration, contextual chat continuation,
  responsive behavior, and authenticated admin acceptance remain pending
  because no browser/authenticated session is available. Full repository lint
  remains blocked by the pre-existing CRLF/Prettier baseline errors; the
  legacy privacy suite also retains its unrelated public-form assertion
  failure. Save Draft migration and Live SearXNG remain explicitly PENDING.

- **PRODUCTION RELEASE — DEPLOYED / ACCEPTANCE TESTING.** Approved branch
  `release/production-20261022` was deployed from exact commit `9b3fa93`
  (full SHA `9b3fa93d447fc14e2b77fae8bd765163e9289`) to Worker
  `share-barabara` as version `79645807-c816-4fc8-bb93-09f262ca8970` at
  `2026-10-22T09:03:19Z`. The prior production version
  `d5c96a2a-9cd6-4a8f-b21b-346449e5ceea` remains the rollback target. The
  production build completed successfully and the public smoke routes `/`,
  `/news`, `/alerts`, `/reports`, `/infrastructure-issues`, `/campaigns`,
  `/statistics`, `/feed` and `/search` returned HTTP 200. Production secret
  names `GROQ_API_KEY`, `XAI_API_KEY` and the existing VAPID names are present;
  values were not read. The production binding audit preserved
  `AI_RATE_LIMITER`, `ASSETS`, `DEPLOYMENT_ENV=production` and
  `WEB_PUSH_ENABLED=true`. No migration, Task 70 object or demonstration ad
  was changed. A published article returned server-rendered title,
  description, absolute canonical URL, absolute public `og:image`, Twitter
  card metadata and a valid HTTP 200 `image/webp` response. Browser clipboard,
  signed-out rendered Quick AI, authenticated admin AI/publishing, contextual
  Sign in to Chat and responsive visual acceptance remain pending because no
  browser session was available; a direct CLI server-function POST was edge
  rejected with HTTP 403 and is not treated as a provider failure. Worker tail
  observed no error events during the short post-deploy window. Save Draft and
  Live SearXNG remain explicitly PENDING.

- **PRODUCTION ACCEPTANCE UPDATE — QUICK AI BLOCKED.** On 2026-10-22, a
  normal published article page continued to return HTTP 200 with the expected
  SSR content and AI surface. An ordinary JSON server-function POST reached the
  Worker but returned HTTP 500 with `Seroval Error (step: 3)`, as expected for
  a malformed TanStack Start payload. A locally generated Seroval payload using
  the client protocol and the exact published article UUID was rejected before
  application serialization with a plain Cloudflare HTTP 403 (`Server:
cloudflare`, `Content-Type: text/plain`, body `Forbidden`). This may be an
  edge/WAF rule, but it is potentially user-facing because the browser client
  uses that protocol. No real Groq result, browser summary rendering, admin AI,
  Sign in to Chat, Copy Link click, or responsive visual acceptance is claimed
  without browser access. No speculative production hotfix was applied.

- **PRODUCTION ACCEPTANCE UPDATE — QUICK AI SIGNED-OUT HTTP VERIFIED.** A
  correctly generated Seroval request with no cookies/session context and the
  published article UUID `d7aa6440-9544-4f70-9479-98aba3527cdf` returned HTTP
  200 at `2026-10-22T09:15:11Z`, `x-tss-serialized: true`, and a grounded
  response with `provenance: share_barabara`. The response contained a factual
  6,209-byte serialized answer referencing the article evidence, establishing
  that the production Worker reached Groq successfully for the signed-out
  path. The earlier 403 was captured at `2026-10-22T09:09:43Z` for the same
  server-function path with Ray ID `a4e75d602f1ab14b-LOS`; it was plain
  Cloudflare `Forbidden` with `Content-Type: text/plain`, no
  `x-tss-serialized` header and did not appear to reach the Worker. It was not
  reproducible in subsequent correctly encoded probes. Cloudflare Security
  Events correlation for that Ray ID is still unavailable from this session;
  owner review is required before attributing it to a specific rule. Browser
  rendering, admin AI, Sign in to Chat, sharing clicks and responsive checks
  remain open.

- **PRODUCTION AI UI HOTFIX — DEPLOYED / BROWSER ACCEPTANCE OPEN.** Commit
  `73b35fe` adds an explicit auth-loading gate, a prominent signed-out
  `Sign in to Chat` button with the existing exact-page return URL, contextual
  follow-up explanation, and authenticated `Continue Chatting` treatment while
  preserving the existing composer. Focused AI/security/editorial tests pass
  **28/28** and the Bun/Vite 7.3.7 production build passes. Deployed to
  `share-barabara` as Worker version `2daa3dbf-7f2c-419c-8f13-5ee8d3dd2b53`;
  the affected report route returned HTTP 200 and its live bundle contains both
  new labels. Browser signed-out/signed-in rendering, login return, responsive
  behavior, and authenticated admin Generate/Auto-Populate acceptance remain
  pending because no browser or authenticated session is available. Save Draft
  migration and Live SearXNG remain explicitly PENDING.

- **PRODUCTION ADMIN AI ACCEPTANCE — HTTP/SOURCE VERIFIED; BROWSER BLOCKED.**
  Production `/admin/articles`, `/admin/alerts`, `/admin/reports`,
  `/admin/infrastructure-issues` and `/admin/campaigns` are reachable, but no
  browser or authenticated session is available in this environment, so Add/
  Edit form interactions and live role acceptance are not claimed. Deployed
  contracts and focused tests confirm Generate and Update Existing route to
  xAI Grok, Auto-Populate routes to Groq, proposals require explicit review /
  apply, cancellation does not mutate form state, blank values do not erase
  manually entered values, rich-text fields use the existing synchronization
  path, and unknown report casualty values remain null rather than zero. Admin
  Publish remains role-gated; Save Draft was not tested and remains migration-
  dependent. Required owner/browser checks are live Generate, Auto-Populate and
  Update Existing on Article, Alert and Report Add/Edit forms, provider labels,
  cancellation/value preservation, direct Publish authorization, and signed-
  out/in chat flows.

- **PRODUCTION RELEASE CANDIDATE — SUPERSEDED BY DEPLOYMENT.** Branch
  `release/production-20261022` consolidates the verified editorial/AI repair,
  Batches 1–3, Task 41.8, Task 45, Task 56, and the Task 24/51 documentation
  tests from production baseline `70a67c7`. It has not been deployed. The
  accident-report draft migration is excluded; Save Draft remains blocked until
  that shared-Supabase migration is explicitly approved. Live SearXNG Integration
  remains explicitly PENDING. Candidate source tip before this bookkeeping update
  was `21ad326`; 130/130 relevant tests and the Bun production build passed. See
  `docs/production-release-candidate-20261022.md`.

- **HIGH PRIORITY — AI administrator workflow follow-up (TESTING / VERIFICATION).** Alerts and Accident Reports now expose role-gated Generate and Auto-Populate controls on Add forms, retain Generate/Auto-Populate/Update Existing on Edit forms, and protect manually entered fields from blank model output. Administrator report publishing now has direct Publish and Save draft actions with server-side role enforcement; public submissions remain pending review. Implemented in `607568e`, with the contextual-chat repair in `e621d58`, and deployed to staging Worker version `8c1d63a2-2a07-46cb-94da-c13d09a5258c`; the staging root smoke check returned HTTP 200. Findings and the review-only draft-schema migration are recorded in `docs/ai-admin-workflow-follow-up.md`. Remaining work is staging provider-secret configuration, review/application of the related report-draft migration, live admin/public authorization tests, and browser acceptance. Do not execute migrations automatically or modify Task 70, sharing fixes or demonstration advertisements.
- **AI workflow acceptance statuses (STAGING ONLY).** Admin AI controls: **TESTING / LIVE BLOCKED** — both secret names and bindings are present, but live admin provider actions and role acceptance still require an authenticated staging session. Administrator publishing: **PARTIALLY VERIFIED** — direct approved publishing is server-authorized; live admin/public role acceptance was not claimed without an authenticated staging session; Save draft awaits review/application of the shared-Supabase draft migration. Quick AI Summary: **STAGING HTTP VERIFIED / UI ACCEPTANCE PENDING** — a correctly serialized signed-out request now returns HTTP 200 with a real Groq response; browser rendering and content-resolver coverage remain unverified. Sign in to Chat: **TESTING / LIVE BLOCKED** — return-path repair is implemented, but live continuation requires an authenticated staging browser session. Infrastructure Issues and Campaigns AI integration: **DESIGN / NOT IMPLEMENTED** — see `docs/ai-content-type-expansion-design.md`; no nonfunctional buttons were added.

- **CRITICAL — AI serialization repair (STAGING ONLY, TESTING).** The raw HTTP 500 was reproduced with ordinary JSON, but TanStack Start server functions require a Seroval envelope generated by the client formatter; malformed direct requests failed during framework deserialization with `Seroval Error (step: 3)`. The Quick AI Summary handler now normalizes successful and failed results to plain JSON-safe data and returns structured errors instead of propagating unsupported exceptions. Correctly serialized staging requests return HTTP 200 for invalid input and for a real Groq summary. Deployed commit `ed2ec86`, Worker version `1831b2fa-33c1-46cb-94da-c13d09a5258c`. UI hydration, authenticated chat handoff, admin provider actions and actual DB-resolved content UUID coverage remain pending an authenticated browser/session. No migration, production deployment, Task 70 or sharing change was made.

- **TESTING — priority sharing fix:** Production candidate `70a67c7` was
  deployed to Worker `share-barabara` as Cloudflare version
  `d5c96a2a-9cd6-4a8f-b21b-346449e5ceea` on 2026-10-21. Live article, alert,
  accident-report and profile HTML returned `og:title`, `og:description`,
  `og:image`, `og:url`, `twitter:card`, `twitter:image` and production
  canonical links. Fallback PNG and profile JPEG returned HTTP 200 with image
  content types. WhatsApp, Facebook, X and LinkedIn crawler user-agent checks
  could read the metadata. No approved live infrastructure-issue or campaign
  record was available for a content-specific check. A browser surface was not
  available for a physical clipboard click; the deployed toolbar bundle was
  verified to contain the title + blank-line + canonical-URL formatter. Await
  owner acceptance before marking COMPLETED. See `docs/sharing-preview-qa.md`.

- Future sharebarabara.com internationalization: make the static `KENYA` in
  `SHARE BARABARA KENYA` market-aware so it reflects the active country (for
  example, Uganda or Tanzania). Do not implement geolocation or country
  detection as part of the current homepage work.

## Real-device UI/editorial correction batch

- [ ] Make the mobile navigation a responsive partial-width drawer with a visible scrim and resolved full profile name, retaining Verification & subscriptions.
- [ ] Remove user-visible Mjengo Hub-style editorial workflow branding from Share Barabara.
- [ ] Route Editorial AI Auto-Populate for articles, alerts and reports through Groq and verify the server-side model.
- [ ] Replace decorative Editorial AI source badges with safe, removable text/document and image evidence attachments where supported.
- [ ] Add All time and specific calendar month performance filters with valid comparison periods and compact responsive spacing.
- [ ] Preserve article paragraph and supported semantic structure through paste, edit, preview, save, reload, Auto-Populate and public rendering.
- [ ] Populate article SEO title, description and comma-separated keywords through Auto-Populate with regression coverage.
- [ ] Replace the article back link with an accessible navigable Home > Articles > category breadcrumb and reduce the top gap.
- [ ] Restyle article category pills with restrained translucent navy glass treatment.
- [ ] Fit Google preferred-source action into the mobile social row with a permitted Google G mark and no overflow.
- [ ] Restyle the article summary/standfirst as a subtle light-blue newsroom block.
- [ ] Place a simplified fallback advertisement above Quick AI Summary without inventing an advertiser URL.
- [ ] Redesign Related Articles as responsive image cards, cap at four, and add Read more.
- [ ] Apply the same compact image-card treatment to Latest Articles, cap at four, and avoid duplicates where practical.
- [ ] Audit spacing and responsive behavior at 320, 360, 390, 412, 768, 1024, 1280, 1440 and 1600+ widths.
- [ ] Add focused regression coverage for paragraph preservation, SEO application, Groq routing, card limits, profile fallback and attachment validation.

## Task 41 — Cross-site discovery, content previews & ad inventory

- [ ] 41.1 Article discovery
- [ ] 41.2 Alert discovery
- [ ] 41.3 Report discovery
- [ ] 41.4 Homepage whole-platform previews
- [ ] 41.5 Alert/Report category discovery
- [ ] 41.6 Mjengo Hub/Mjengo Networks previews
- [ ] 41.7 Expanded banner-ad inventory
- [ ] 41.8 Responsive/performance/security verification

## Task 24 — External AI Retrieval

- [ ] 24.1 Local-first sufficiency decision
- [ ] 24.2 Provider-independent server abstraction
- [ ] 24.3 Search result normalization and evidence bundles
- [ ] 24.4 Source trust classification and validation
- [ ] 24.5 Backend-controlled citation IDs and metadata
- [ ] 24.6 SSRF and URL security
- [ ] 24.7 External-search rate limiting
- [ ] 24.8 Distinct retrieval and provider failure states
- [ ] 24.9 Server-only provider configuration
- [ ] 24.10 Compatibility with the Task 25 Share Barabara Agent System
- [ ] 24.11 SearXNG Provider Support & Deployment Readiness (adapter/docs complete; live instance not connected)

Task 24 remains TESTING / VERIFICATION because no real SearXNG instance is connected yet.

Repository-side retrieval contract and deployment-readiness checks are covered by
`tests/task24-retrieval-readiness.test.mjs`. The remaining acceptance blocker is
operational: a reviewed, reachable SearXNG endpoint must be provisioned and
verified before enabling live external retrieval or Task 25 discovery agents.

Task 25 — Share Barabara Agent System remains PENDING. External-discovery agents may begin after the selected retrieval provider is configured and live retrieval is verified.

Task 26 — Statistics Modernization is TESTING / VERIFICATION. The public/admin implementation,
report-semantics helpers, focused tests, and review-only provenance migration are in place. Remaining
verification is Supabase schema review/application, real-data provenance/backfill review, RLS checks,
and browser checks at desktop/tablet/mobile in light and dark mode. Do not execute the migration,
deploy, or publish unverified 2026 figures as part of this task.

Task 27 — Alert Radius & Notification Preferences is TESTING / VERIFICATION. The live-schema-safe
preference UI, deterministic matching helpers, unread/read workflow corrections, and review-only
database migration are in place. Remaining verification is migration/RLS review and execution,
browser verification of saved preferences, and real-device notification delivery/cross-device checks.
Do not execute the migration, deploy, provision SearXNG, or begin Task 25 as part of this task.

Task 28 — Profile / My Activity is TESTING / VERIFICATION. The public-profile privacy tightening,
bounded owner activity dashboard, exact activity counts, profile identity display, status handling,
and notification-preferences shortcut are in place. Remaining verification is browser testing at
desktop/tablet/mobile in light and dark mode, live RLS checks, and validation against real account
content. Do not execute SQL, deploy, provision SearXNG, or begin Task 25 as part of this task.

Task 29 — Contributor Leaderboard is TESTING / VERIFICATION. The all-time earned-reputation
leaderboard, deterministic tie ordering, optional signed-in position, public-safe contribution
metadata, bounded pagination, and review-only leaderboard RPC are in place. Remaining verification
is review/application of the new migration, live RLS/performance checks, and browser verification.
Do not execute SQL, deploy, provision SearXNG, or begin Task 25 as part of this task.

Task 30 — Admin Taxonomy is TESTING / VERIFICATION. Existing Article, Alert, Report and Page
taxonomy tables remain the source of controlled values; the admin surface now uses stable machine
values, editable display labels where supported, conservative editor/admin mutation, and archive
rather than destructive deletion. The review-only lifecycle/RLS migration is not executed.
Remaining verification is migration review/application, live RLS and referenced-value checks, and
browser verification of admin and public filters. Do not execute SQL, deploy, provision SearXNG, or
begin Task 25 as part of this task.

Task 42 — Public Page Heroes & News/Articles Naming is TESTING / VERIFICATION. Public navigation,
footer, search grouping, homepage discovery and article breadcrumbs now use News & Articles where
the editorial section is named, while /news and /news/$slug remain the compatible routes. A shared
compact PublicPageHero is applied to the principal public landing pages with local imagery only,
page-specific copy and real-route CTAs; the homepage flagship hero remains intact. Remaining
verification is browser review at desktop/tablet/mobile in light and dark mode, including contrast,
title wrapping, CTA navigation, image crops and route metadata. Do not execute SQL, deploy,
provision SearXNG, or begin Task 25 as part of this task.

Task 48 — Share Barabara Integration Audit & Release Preparation is TESTING / VERIFICATION. The
accumulated Tasks 26–31 and 42–47 worktree, review-only migration chain, Feed execution paths, push
dispatcher configuration, Mjengo Hub adapters, shared-file ownership and release risks have been
audited. No migration, staging, commit, push or deployment was performed. Remaining work is the
manual migration/RLS review and application, Supabase type regeneration, Cloudflare/VAPID setup,
browser/device verification, and resolving the documented Feed moderation gaps before release.

Task 49 — Release Blocker Remediation & Migration Hardening is TESTING / VERIFICATION. Feed block
management, staff review of post/comment reports, soft comment moderation, append-only moderation
audit history, server-enforced Feed blocking, explicit Feed database error states, AI fail-closed
parsing, and notification lifecycle hardening are implemented in a new review-only migration.
Prior migration applied status and non-idempotent DDL still require manual live-schema review;
browser, RLS and live notification verification remain.

Task 31 — Map & Location Architecture is TESTING / VERIFICATION. Existing optional Alert and Report
coordinates, county/road fields, road IDs, explicit coordinate validation, manual location entry,
clearable current-location capture, Article location feature detection, and admin/editorial point
editing are in place. The review-only location migration is not executed. Remaining verification is
SQL/RLS review, browser testing, live coordinate-quality checks, and selection of an approved map
tile/geocoder provider before enabling map-click or search features. Do not execute SQL, deploy,
provision SearXNG, or begin Task 25 as part of this task.

Task 43 — Theft, Vandalism & Content Taxonomy is TESTING / VERIFICATION. Existing Alert hazard
values remain stable while the review-only taxonomy migration adds optional parent/subtype metadata,
supported Theft/Vandalism values, optional Report incident classification, and matching Article
categories without rewriting historical content. Forms, public Alert/Report filters, admin taxonomy
context and Editorial AI controlled-value validation are prepared. Remaining verification is
migration/RLS review and application, live taxonomy data checks, and browser verification of forms,
filters and discovery. Do not execute SQL, deploy, provision SearXNG, or begin Task 25 as part of
this task.

Task 44 — Full Notification Customization is TESTING / VERIFICATION. The owner-scoped notification
settings surface, explicit alert/community/account groups, taxonomy parent/subtype include and
exclude rules, private geography, severity, mute, browser-channel gating, deterministic server-side
matching, and review-only customization migration are in place. Email and background push remain
reserved because no providers/service worker are configured. Remaining verification is migration/RLS
review and application, live taxonomy/road data checks, browser and real-device notification checks,
and cross-device delivery verification. Do not execute SQL, deploy, provision SearXNG, or begin
Task 25 as part of this task.

Task 45 — Mjengo Hub Content & Tracker Integration is TESTING / VERIFICATION. A bounded server-side Mjengo adapter now consumes the public RSS feed and documented public tracker/media HTML cards, with allowlisted URLs, schema-aware normalization, caching, timeout/fallback handling, attribution, and native preview modules on the homepage, News & Articles, Alerts, Reports, Statistics, and Media pages. Remaining verification is browser/source freshness checking and confirming the upstream HTML card contracts remain stable; Mjengo Hub does not currently expose public JSON endpoints for projects or media. Do not execute SQL, deploy, provision SearXNG, or begin Task 25 as part of this task.

Task 45 upstream response hardening is implemented on `codex/task45-upstream-contract-hardening`:
the adapter now rejects unexpected upstream content types before parsing while preserving
bounded response sizes, timeouts, allowlisted destinations, cache behavior, attribution and
graceful empty fallback. Live upstream freshness and browser acceptance remain pending.

Task 46 — Feed, Replies, Mentions & Community Notifications is TESTING / VERIFICATION. The public Feed
route, prominent navigation, moderated user-post model, automatic public-content stream, voting,
threaded discussion reuse, hashtags/trending seam, persistent block/report controls, server-side AI
triage, moderator review queue, Feed notification triggers and review-only migration are implemented.
Remaining verification is migration/RLS application, browser/mobile accessibility, live moderation and
notification behavior, and confirming the future community-event expansion does not bypass preferences.

Task 47 — Push Notification Delivery & Reliability is TESTING / VERIFICATION. The review-only push
subscription/outbox/attempt schema, foreground gating, service worker, Web Push encryption/VAPID
dispatcher seam, bounded retry handling, safe endpoint validation, scheduled dispatcher hook, and
admin diagnostics surface are in place. Background push remains configuration-gated until VAPID
keys, runtime bindings, migration application, and real-device delivery are verified. Remaining
verification is SQL/RLS review and application, Cloudflare scheduled-worker configuration, browser
subscription tests, and live push-service acceptance/device-display checks. Do not execute SQL,
deploy, provision SearXNG, or begin Task 25 as part of this task.

Task 50 — Dual Recycle Bin System is TESTING / VERIFICATION. The review-only recycle-bin migration,
owner/admin-separated UI, append-only history, server-authoritative soft deletion, guarded restoration,
retention metadata, permanent-delete confirmation, and public visibility filters are implemented.
Remaining verification is migration/RLS review and application, conversion of any remaining legacy hard
delete handlers, browser testing of owner/admin permissions and parent-child safety, and live retention
policy configuration. Do not execute SQL, deploy, provision SearXNG, or begin Task 25 as part of this task.

Task 51 — Production Database Migration Readiness is TESTING / VERIFICATION. The repository migration
chain, known-applied report/campaign patch, protected subscription boundary, dependency order, conflict
gates, backup/rollback plan and exact read-only Supabase inspection queries are documented. No live
database inspection or migration execution was performed because local configuration has no privileged
metadata access. Remaining work is running the read-only queries, confirming applied versions, taking a
backup, reviewing each migration against production, and executing the approved sequence manually.
The canonical readiness document heading was corrected from the stale Task 58 label to Task 51;
the existing verification-only status and execution blockers are unchanged.

Task 53 — Supabase Production Database Verification is TESTING / VERIFICATION. A single consolidated,
read-only SQL Editor audit now returns migration history, tables/columns, RLS policies, triggers,
functions, constraints, indexes, grants, extensions, dependency checks and expected-object conflicts
as one structured JSON result. A local comparison utility can analyze the exported JSON against the
repository migrations without treating missing history as proof of non-application. No SQL was
executed and no production data was changed. Remaining work is pasting the inspection query into
Supabase, exporting the JSON result, reviewing conflicts, confirming backup readiness and approving
the migration sequence manually. The protected subscription migration remains excluded.

Task 54 — Urgent Editorial AI Repair is TESTING / VERIFICATION. The repair adds strict structured-output
recovery for fenced and known wrapper responses, preserves schema/taxonomy validation, records only safe
diagnostic metadata, restores explicit Grok Auto-Populate routing, and collapses every shared Editorial AI
panel by default while preserving entered material. Generate remains Grok/xAI, Auto-Populate supports Groq
and Grok, and Update Existing requires a persisted record ID both in the UI and server function; create
forms do not expose Update Existing. All supported Article, Alert, Report, Campaign and Infrastructure
Issue editors use the shared provider-aware controls. Local validation passed: 368/368 full tests,
14/14 security tests and Bun production build. No migration was executed. Live Cloudflare provider
credentials and authenticated editorial sessions were unavailable locally, so real Groq/Grok generated
draft validation, authenticated production smoke testing and deployment remain pending; do not mark
production-verified or claim provider acceptance.

Task 56 — Share Barabara Public Website Repair is TESTING / VERIFICATION. Public navigation now presents
News & Articles, Alerts, Reports, Statistics, Media & Feed and Campaigns while preserving /feed and the
/contributors directory. Article rendering safely separates legacy paragraph markup, related-article
content is centered, article cards use accessible responsive aspect-ratio presentation, unsold ads link
to Partner With Us, ecosystem copy no longer uses sister-platform language, and Media & Feed has a
source-attributed Mjengo/social surface. Public Quick AI Summary can use bounded published article text
when server-side row resolution or external retrieval is unavailable, without claiming outside
verification. Remaining verification is browser/device visual review, configured social-link review,
Mjengo upstream freshness, and deployed public-AI runtime checks. No SQL, deployment, secret change or
SearXNG provisioning was performed.

Task 56 social-link hardening is implemented on `codex/task56-social-link-hardening`:
public footer and Media & Feed links now share an HTTPS platform allowlist, reject
credential-bearing URLs, and request only the fields required for rendering. Browser
and configured-channel acceptance remain pending.

Task 57 — Editorial AI Contracts & Update Existing is TESTING / VERIFICATION. The owner-supplied News
Article and Accident Report prompts are preserved verbatim as separate source documents, with a distinct
Alert contract derived from its actual fields. Generate remains Grok/xAI, Auto-Populate remains Groq, and
Update Existing is available below Auto-Populate on Article, Report and Alert editors. Updates read the
current unsaved form state, produce structured field-level proposals, preserve omitted/unknown values, and
require explicit human application and normal save/publish actions. SEO and supported featured-image metadata
are validated, and Featured Image follows SEO in rich editors. Remaining verification is Cloudflare runtime
credential/model confirmation, live provider checks, and browser review of all editorial forms; no SQL or
deployment was performed. Do not mark production-verified.

Task 58 — Share Barabara Production Database Audit & Migration Readiness is TESTING / VERIFICATION. The repository
migration chain, protected subscription boundary, known-applied report/campaign exception, feature
dependencies, conflict gates, backup precautions and exact owner action remain documented in
docs/production-database-migration-readiness.md. No SQL was executed and no production data was changed.

Task 59 — Share Barabara Production Database Migration Reconciliation is TESTING / VERIFICATION.
The owner-supplied 2 October 2026 audit export was validated and reconciled against the pending
migrations. The repository audit is complete, but production verification after each write,
backup/snapshot approval, migration-ledger reconciliation and owner approval remain pending. The
reconciliation report records the mixed production state, including present AI/report effects,
missing later feature objects, notification/vote conflicts and the dependency-aware execution plan.
No SQL was executed, no production data changed, the audit JSON was not committed, and protected
subscription work remains excluded.

Task 60 — Share Barabara Production Recovery, AI Functionality, Project Publishing and Deployment Audit is
TESTING / VERIFICATION. The repository-side audit covers the current AI action paths, deployment evidence,
project-publishing scope, Task 59 migration dependencies and recent public UI state. A safe primary-navigation
cleanup removes the duplicate Videos item while preserving /videos, footer and sitemap access. Production
deployment version, live AI behavior, project-publishing ownership/schema, and database migration readiness
remain unverified or owner-approved work as explicitly documented in the Task 60 reports. No SQL, deployment,
secret change or subscription work was performed.

Task 70 — Public Page Layout System is TESTING. The approved Task 70 public editorial layout, shared detail
architecture, advertising surfaces, Alerts and Accident Reports listing redesign, and global editorial-card date
removal are deployed to production. Continuing owner visual refinement remains open; do not mark this task
COMPLETED or begin later batches without approval. No database migration or hosted data change is part of this
release.

Global Admin CMS Listing Standardisation — DEPLOYED / BROWSER VISUAL ACCEPTANCE PENDING. The admin-only
standardisation is committed on `e1ed2d1` and the final reconciled tree is `51a0647`, which also cherry-picks
the approved concurrent public correction `2d088a8` after Cloudflare showed another instance had deployed it
while this work was in progress. Shared admin listing surfaces now use full-width responsive containers,
consistent management headers, compact responsive filter grids, zebra rows, restrained thumbnails and
accessible image metadata across Articles, Alerts, Accident Reports, Campaigns and Infrastructure Issues.
Existing route permissions, filters, actions, moderation, recycle-bin behavior and content-specific fields
were preserved. Focused admin/public checks passed (11/11), full regression passed (393/393), security tests
passed (14/14), `git diff --check` passed, and the production build passed. Worker `b4f1d5b2-1204-4254-8178-
ea0cfbe27833` receives 100% traffic; immediate rollback target is the concurrent public baseline Worker
`36ebab6b-40c8-4fd2-8cd2-32b7ecc5e287` (the earlier pre-admin baseline was `fc84339d-7b82-4e7c-b858-
8269d9155464`). Public and admin route HTTP smoke tests returned 200. Authenticated browser screenshots,
mobile/tablet visual review, and authenticated admin workflow acceptance remain pending because browser/CUA
access and an authorized admin session were unavailable. No migrations, advertisements, Task 70, Editorial AI,
authentication, or SearXNG changes were made by the admin workstream.

Admin Workspace Separation — TESTING. The authenticated management area now has dedicated admin chrome,
independent navigation, role-filtered management surfaces, admin-owned Article/Alert/Report authoring entry
points, Editorial AI access on editorial editors, and website preview actions. Public routes retain their
existing shell and permissions. Browser/device review and any follow-up management-surface refinements remain
open; no database migration or hosted data change is part of this release.

Editorial AI Repair — DEPLOYED / BROWSER AND LIVE-PROVIDER ACCEPTANCE PENDING. Repair commit
28ad0576aad267da12b090a6a21c77e59bea5a6f was deployed from the verified production tree rooted at
12bca0bfc3d6b9caefa605960e6cce02b701797f (the only difference from the integrated pre-repair tree was
the prior deployment bookkeeping entry). Worker version c5dc04bd-61d4-49a5-a486-6da16774ce85 is live;
rollback target is the pre-repair Worker bdc7101e-e32b-49dc-8acd-3d9dcbac68b3. Full tests passed
(368/368), security tests passed (14/14), and the production build passed. Public and authenticated route
shell smoke tests returned HTTP 200, and deployed Campaign and Infrastructure Issue bundles include the
shared Editorial AI controls. No live Grok/Groq provider call was performed because authorized production
credentials/test access were unavailable; mocked/provider-contract coverage is separate. No database
migration, Task 70, advertisement, unrelated authentication, or SearXNG activation was performed.

Editorial AI Source Fidelity Repair — DEPLOYED. Commit 39b24ff was deployed from the production
baseline documented above as Worker d734a020-67a1-4944-b385-0488beb8200e; rollback target is the
pre-repair Worker c5dc04bd-61d4-49a5-a486-6da16774ce85. Root cause was valid Article JSON being
truncated by the 1,200-token provider budget and the 5,000-character response cap before parsing,
combined with a generation prompt that required a long article plus multiple fields. The repair uses
a larger editorial JSON budget, a separate source-extraction contract, deterministic checks for
dates, locations, numbers and unknown casualties, safe request IDs/errors, and explicit field-preview
confirmation before application. Full tests passed (372/372), security tests passed (14/14), and
the production build passed. Public and admin route shells returned HTTP 200. Authenticated live
Grok/Groq generation remains pending because no authorized provider test session was available.
No migration, advertisement, Task 70, unrelated AI/authentication, or SearXNG change was made.

Global Editorial Preview System — IMPLEMENTED ON feat/global-editorial-preview / NOT DEPLOYED. The additive
GlobalEditorialPreview component is mounted on the homepage, News, Alerts, Accident Reports, Campaigns,
Infrastructure Issues, category/topic-filtered listing views, and the corresponding detail surfaces. Desktop
shows Latest plus up to two eligible categories ranked from the existing recorded-view RPCs; each populated
card uses one featured item and two compact items. Mobile keeps only Latest. Every module has canonical item
links and a visible View All link. Existing category/entity browsing cards remain unchanged. Sparse data
produces an explicit empty state rather than fabricated categories or engagement. Campaigns and Infrastructure
Issues currently have no recorded-view tables/RPCs, so their category ranking cards remain unranked until an
owner-approved backend capability exists; no schema or migration was added. The smallest safe future migration
would add separate public insert / moderator-read view tables and SECURITY DEFINER trending RPCs for campaigns
and infrastructure issues, each with a foreign key to its existing content table and public-status filtering.
This requires owner approval and production schema review before implementation. Focused preview tests, full
tests (373/373), security tests (14/14), build and whitespace checks pass. Browser desktop/mobile visual
acceptance is pending because browser automation initialization failed
before exposing a target surface. No deployment was performed.

Editorial AI UX Cleanup and Direct Field Population — DEPLOYED / BROWSER AND LIVE-PROVIDER ACCEPTANCE
PENDING. Code commit `7371afd1253348ad537ffcc61ff0c4618ab6c5f6` removes the obsolete preview/confirmation
UI, applies validated Generate, Groq Auto-Populate, Grok Auto-Populate and Update Existing results directly
to local editable form state, filters exact schema-label artifacts (`Title`, `Summary`, `Body`, and equivalent
field labels), preserves unrelated fields, and ignores stale responses after newer edits or requests. Update
Existing remains restricted to persisted authorized records server-side and no action saves or publishes
automatically. Focused Editorial AI tests passed (24/24), full regression passed (374/374), security tests
passed (14/14), and the production build passed. The release was deployed with the generated production
Wrangler environment workaround to Worker `4684cefb-d62b-4948-aafc-14860ddb2d7e`; rollback target is
`d734a020-67a1-4944-b385-0488beb8200e`. Production homepage, News, Alerts, Reports, Search and admin route
shells returned HTTP 200. Authenticated editor interaction and live Grok/Groq calls remain pending because
no authorized browser/provider test session was available; HTTP smoke checks do not establish visual or live
provider acceptance. No migration, Task 70, advertisement, unrelated AI/authentication, or SearXNG change was
made.

Editorial AI Source Textarea and Transient Provider Repair — DEPLOYED / LIVE AUTHENTICATED ACCEPTANCE
PENDING. Commit `012843a8e41b566ee78c1ff46e88b003b0ee9e0a` removes draft-derived source values from all
editorial AI controls and adds bounded retries only for transient provider failures. Worker
`9282cddd-d668-4da1-8d28-6a76b8d90e7d` receives 100% traffic; rollback target is
`4684cefb-d62b-4948-aafc-14860ddb2d7e`. No migration, advertisement, Task 70, unrelated authentication or
SearXNG change was made.

Cross-Device Admin Editorial AI Consistency — TESTING / DEPLOYMENT PENDING. Production inspection found
the HTML shell had no explicit revalidation policy while fingerprinted JS assets were immutable and the
push-only service worker did not cache application responses. The shared Editorial AI control now removes
only the exact legacy `Title: Summary: Body:` scaffold from its initial source value, preserves all other
editor-supplied material, exposes a non-sensitive UI version data attribute, and classifies authentication,
source-retrieval, transient-provider and invalid-response failures without logging source text or secrets.
HTML responses now use `Cache-Control: no-cache, must-revalidate` and expose an optional non-secret
`x-share-barabara-app-version` diagnostic header; static assets remain fingerprinted/immutable. Focused
Editorial AI tests pass (7/7), full regression passes (394/394 with a 30-second artifact-test timeout),
security tests pass (14/14), production build passes, and `git diff --check` passes. No browser/CUA or
authenticated mobile/provider session was available, so Phone A/Phone B live reproduction and real Grok/Groq
acceptance remain pending. No migration, public UI, advertisement, Task 70, unrelated AI/authentication,
or SearXNG change was made.

Cross-Device Admin Editorial AI Consistency — DEPLOYED / BROWSER AND LIVE-PROVIDER ACCEPTANCE PENDING.
The latest production deployment before this release was Worker `22348c43-daf0-409c-b5c1-2b61f90e00e7`,
associated with the production admin-listing commit `4b34ad9`; no newer deployed branch was merged. The
reconciled source commit `3d6cfb8ca5a442d9d12713e517862b2344227995` includes that production tree and the
cross-device Editorial AI/cache fix. It was deployed as Worker `b78fc802-e222-4951-a051-f98edc871f05`,
which receives 100% traffic; rollback target is `22348c43-daf0-409c-b5c1-2b61f90e00e7`. Focused Editorial
AI tests passed (7/7), full regression passed (395/395), security tests passed (14/14), production build
passed, and `git diff --check` passed. Production smoke checks returned HTTP 200 for `/`, `/news`,
`/reports`, `/alerts`, `/infrastructure-issues`, `/campaigns`, `/search` and `/admin/articles`. The live
HTML exposes `Cache-Control: no-cache, must-revalidate`; the deployed Editorial AI bundle contains the
non-sensitive UI diagnostic marker and no `Title: Summary: Body:` scaffold. Authenticated mobile browser
reproduction and real Grok/Groq calls remain pending because no authorized browser/provider session was
available. No migration, public UI, advertisement, Task 70, unrelated AI/authentication, or SearXNG change
was made.
# Global Editorial Discovery Final Corrections — DEPLOYED / VISUAL ACCEPTANCE PENDING

The independently verified pre-deployment production baseline was Git `053ce19cf4a4a3620c19f05cfc2090b35d1db7d2` with active Worker `e69cd270-9006-4f0e-8b9f-50ffdfaceefe`. Candidate commit `9170e13` included that baseline and was deployed as Worker `dfa7cb6f-195e-4c60-b4ca-f883443f147c` at 100%; rollback target is `e69cd270-9006-4f0e-8b9f-50ffdfaceefe`.

The global discovery renderer no longer emits the generic Keep Exploring / More from Share Barabara heading or its top spacer. It now considers News, Alerts, Accident Reports, Campaigns, Infrastructure Issues, published Statistics datasets when available, and featured Media when available. Source cards are chunked into three-column desktop rows and stacked three-card mobile groups, with one existing BannerAd after each complete group of three outer cards. Every card selects up to three genuine latest records, uses a large first item and two compact items, and never renders a fourth item. Statistics and Media fail closed when their optional tables are unavailable.

Page-level composite exclusion keys now remove the current record, earlier related/sidebar recommendations, and duplicate records across source cards, with candidate backfill from later eligible records. Detail-side recommendation lists were capped at three visible records. The mobile Article detail H1 is now `23.52px`; tablet and desktop Article sizing and all non-Article headline sizes remain unchanged. No database migration or unrelated AI/admin/authentication/moderation/advertisement/Task 70/SearXNG change was made.

Focused tests passed `21/21`; full suite passed `385/388`, with the three unchanged Editorial AI provider/source tests still failing under the repository's direct Node runner because of extensionless/`@/integrations` module resolution. Security tests passed `14/14`; production build and `git diff --check` passed. Public smoke routes `/`, `/news`, `/alerts`, `/reports`, `/campaigns`, `/infrastructure-issues`, `/statistics` and `/feed` returned HTTP 200. Browser visual verification remains pending because CUA initialization failed with `failed to write kernel assets: The system cannot find the path specified. (os error 3)`; HTTP smoke checks do not establish rendered visual acceptance. Live provider testing was not performed.

## SB 2 deployment gate — 2026-10-29

- Candidate `integration/sb2-canonical-incident-release` remains not deployed.
- Active production Worker rechecked: `c193a8dd-725d-403e-9334-0446d1c86236`,
  100% traffic. Wrangler reports `Unknown (deployment)` / `Unknown
  (version_upload)` and provides no Git SHA, tag or message.
- Application-only compatibility is code-verified: Statistics and the admin
  relationship panel retry legacy `accident_reports` reads when
  `duplicate_of_report_id` is absent. This does not replace live PostgreSQL
  acceptance.
- Full suite 462/462, security 14/14, production build and `git diff --check`
  pass. No production SQL or migration was executed.
- Deployment remains pending a verifiable production source/export so newer
  deployed changes cannot be overwritten. Browser/authenticated acceptance,
  disposable database/RLS testing, SB4 geography integration, migration
  approval and final user acceptance also remain open.
