# Pending

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

Task 53 — Supabase Production Database Verification is TESTING / VERIFICATION. A single consolidated,
read-only SQL Editor audit now returns migration history, tables/columns, RLS policies, triggers,
functions, constraints, indexes, grants, extensions, dependency checks and expected-object conflicts
as one structured JSON result. A local comparison utility can analyze the exported JSON against the
repository migrations without treating missing history as proof of non-application. No SQL was
executed and no production data was changed. Remaining work is pasting the inspection query into
Supabase, exporting the JSON result, reviewing conflicts, confirming backup readiness and approving
the migration sequence manually. The protected subscription migration remains excluded.

Task 54 — Urgent Editorial AI Repair is TESTING / VERIFICATION. The Cloudflare request environment is
now bound for normal requests, editorial instructions are delivered as a server system instruction,
source material remains explicitly untrusted user evidence, and editorial provider calls request
provider-enforced JSON output before server-side field validation. Groq remains locked to Auto-Populate,
Grok/xAI remains locked to Generate and Update, and the public AI path remains Groq. Safe configuration,
provider and malformed-response diagnostics are surfaced without secrets. Remaining verification is
deployment/runtime binding confirmation and mocked/live provider checks; no migration or deployment was
performed. Keep the Contributors Directory & Sitewide Discovery task pending.

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

Task 57 — Editorial AI Contracts & Update Existing is TESTING / VERIFICATION. The owner-supplied News
Article and Accident Report prompts are preserved verbatim as separate source documents, with a distinct
Alert contract derived from its actual fields. Generate remains Grok/xAI, Auto-Populate remains Groq, and
Update Existing is available below Auto-Populate on Article, Report and Alert editors. Updates read the
current unsaved form state, produce structured field-level proposals, preserve omitted/unknown values, and
require explicit human application and normal save/publish actions. SEO and supported featured-image metadata
are validated, and Featured Image follows SEO in rich editors. Remaining verification is Cloudflare runtime
credential/model confirmation, live provider checks, and browser review of all editorial forms; no SQL or
deployment was performed. Do not mark production-verified.
