# Share Barabara master task inventory

This file is the authoritative task tracker. Statuses use the release workflow
definitions in `docs/staging-release-workflow.md`:

- **PENDING** — not production-live, including staging-only work.
- **TESTING** — production-live and awaiting explicit owner acceptance.
- **COMPLETED** — production-live and explicitly owner-accepted.

Passing tests, a merged commit, a clean build, a staging deployment, or an HTTP
200 response do not establish owner acceptance. No task in this inventory is
marked COMPLETED without an explicit acceptance record.

## Baseline and evidence boundary

- Production source baseline: `0853b52c777501ea14be1520dd59252f8eb53d8b`.
- Staging candidate: `ebaa1c6ece51e76e9c7e470840c00752bdf7ea9b`.
- Staging Worker: `share-barabara-staging`, version
  `82db5894-0334-4d7d-abe1-75ce8b90f3bd`.
- Latest reported full test result: 301 passed.
- Production Worker version and exact deployed Git SHA are not independently
  available in this workspace. The source baseline is therefore not treated as
  owner acceptance or as proof that every source change is live.
- No privileged Supabase metadata connection is available locally. The
  repository audit query is read-only and must be run by an authorised owner.
  Prior audit statements about absent objects are retained as historical
  evidence, not treated as definitive ledger state.
- `20260929120000_report_unknown_campaign_review.sql` is the only migration
  recorded by repository evidence as **KNOWN APPLIED — DO NOT REPLAY**.
- `20260929130000_subscription_payments_schema_review.sql` is **PROTECTED /
  EXCLUDED** from the general migration sequence.

## Unnumbered future and correction work

**PENDING — internationalisation:** make the static `KENYA` in `SHARE BARABARA
KENYA` market-aware. Do not add geolocation or country detection as part of the
current homepage work.

**PENDING — real-device UI/editorial correction batch:** mobile navigation
drawer and profile fallback; removal of Mjengo Hub editorial branding; Groq
Auto-Populate verification; removable evidence attachments; performance-period
filters; semantic paragraph preservation; SEO Auto-Populate; article
breadcrumbs, category pills, summary styling and social-row fit; related and
latest article cards; responsive review at 320, 360, 390, 412, 768, 1024,
1280, 1440 and 1600+; and focused regression coverage.

## Task 24 — External AI Retrieval — PENDING

24.1 Local-first sufficiency decision; 24.2 provider-independent server
abstraction; 24.3 result normalization and evidence bundles; 24.4 source trust
classification; 24.5 server-owned citation IDs; 24.6 SSRF and URL security;
24.7 external-search rate limiting; 24.8 distinct retrieval/provider failure
states; 24.9 server-only provider configuration; 24.10 compatibility with
Task 25; and 24.11 SearXNG adapter and deployment readiness.

Repository implementation and safety tests exist. SearXNG has no verified live
endpoint, reviewed engine configuration, operational owner, or live retrieval
acceptance. Dependencies: approved provider, HTTPS/TLS/firewall controls,
health monitoring and fail-closed verification. Evidence:
`docs/external-retrieval-architecture.md` and `docs/searxng-deployment-plan.md`.

## Task 25 — Share Barabara Agent System — PENDING

External-discovery agents remain deferred until Task 24 has a configured and
live retrieval provider. Dependencies: Task 24, approved agent scope, rate
limits, source ownership and human review.

## Task 26 — Statistics Modernization — TESTING

Public/admin statistics, report semantics, provenance helpers and review-only
migration exist. Remaining acceptance: production schema/RLS and data review,
provenance/backfill decisions, and desktop/tablet/mobile light/dark browser
review. Dependency: Task 53 audit and approved migration sequence.

The interactive incident-map candidate is implemented on the feature branch
and remains staging-only pending production acceptance; its geographic context,
filters, clustering and real-coordinate safeguards are covered by focused
tests and browser review.

## Task 27 — Alert Radius & Notification Preferences — TESTING

Preference UI, deterministic matching, unread/read handling and review-only
migration exist. Remaining acceptance: live schema/RLS, notification triggers,
saved preferences and real-device/cross-device delivery. Dependencies: existing
notification objects and compatibility review before any migration write.

## Task 28 — Profile / My Activity — TESTING

Public-profile privacy, owner activity, counts, identity/status handling and the
notification shortcut exist. Remaining acceptance: live RLS, real-account data
and responsive browser review.

## Task 29 — Contributor Leaderboard — TESTING

Deterministic earned-reputation leaderboard, safe metadata, pagination and
review-only RPC exist. Remaining acceptance: RPC/index/RLS review, live
performance and browser verification. Dependency: compatible reputation and
profile schema.

## Task 30 — Admin Taxonomy — TESTING

Controlled machine values, editable labels, conservative mutation and archive
behavior exist. Remaining acceptance: migration/RLS application, referenced
value checks and admin/public filter review. Dependency: existing taxonomy
tables and Task 43 taxonomy metadata.

## Task 31 — Map & Location Architecture — TESTING

Optional Alert/Report coordinates, county/road fields, validation, manual and
current-location capture, Article location support and admin editing exist.
Remaining acceptance: live coordinate quality, RLS, SQL review and an approved
map tile/geocoder provider before map-click/search features.

## Task 41 — Cross-site discovery, content previews & ad inventory — PENDING

41.1 Article discovery; 41.2 Alert discovery; 41.3 Report discovery;
41.4 Homepage whole-platform previews; 41.5 Alert/Report category discovery;
41.6 Mjengo Hub/Mjengo Networks previews; 41.7 Expanded banner-ad inventory;
41.8 Responsive/performance/security verification.

Some implementation exists through Tasks 45 and 56, but the task has no owner
acceptance record. The current sitewide four-item distribution is tracked
separately as Task 62 and is not duplicated here.

## Task 42 — Public Page Heroes & News/Articles Naming — TESTING

Navigation, footer, search grouping, homepage discovery, breadcrumbs and shared
public heroes exist. Remaining acceptance: production visual review, contrast,
wrapping, CTA navigation, image crops and metadata.

## Task 43 — Theft, Vandalism & Content Taxonomy — TESTING

Stable Alert values, optional parent/subtype metadata, Report incident
classification, Article categories and controlled Editorial AI values exist.
Remaining acceptance: live taxonomy data/RLS and form/filter/discovery review.
Dependency: Task 30.

## Task 44 — Full Notification Customization — TESTING

Owner-scoped settings, groups, taxonomy inclusion/exclusion, private geography,
severity, mute and deterministic server matching exist. Remaining acceptance:
live schema/RLS, taxonomy/road data, browser and real-device delivery.
Dependencies: Tasks 27 and 43. Email and background push remain provider and
runtime gated.

## Task 45 — Mjengo Hub Content & Tracker Integration — TESTING

Bounded RSS and public tracker/media adapter, allowlists, normalization,
caching, fallback, attribution and native previews exist. Remaining acceptance:
source freshness, upstream HTML contract stability and production browser review.
No public JSON project/media API is assumed.

## Task 46 — Feed, Replies, Mentions & Community Notifications — TESTING

Feed route, moderated posts, automatic public-content stream, votes, threaded
discussion, hashtags/trending, blocks/reports, AI triage, moderator queue and
notification paths exist. Remaining acceptance: migration/RLS, mobile
accessibility, live moderation and notification behavior. Dependency: existing
comments/votes/notifications and Task 44.

## Task 47 — Push Notification Delivery & Reliability — TESTING

Review-only subscription/outbox/attempt schema, foreground gating, service
worker, VAPID dispatcher seam, retries, endpoint validation, scheduled hook and
admin diagnostics exist. Remaining acceptance: migration/RLS, VAPID bindings,
Cloudflare scheduling, subscription tests and real-device delivery. Dependencies:
Tasks 27 and 44. Push remains disabled in staging.

## Task 48 — Integration Audit & Release Preparation — TESTING

Tasks 26–31 and 42–47, migration boundaries, Feed paths, push configuration,
Mjengo adapters and release risks have been audited. Remaining acceptance:
production migration/RLS review, type regeneration if required, Cloudflare/VAPID
setup, browser/device checks and Feed moderation closure.

## Task 49 — Release Blocker Remediation & Migration Hardening — TESTING

Feed blocking, report review, comment moderation, moderation history,
server-enforced blocking, explicit Feed errors, fail-closed AI parsing and
notification hardening exist in review-only form. Remaining acceptance: live
schema compatibility, RLS, browser and notification verification. Dependency:
Task 46.

## Task 50 — Dual Recycle Bin System — TESTING

Owner/admin UI separation, append-only history, server-authoritative soft delete,
restoration, retention metadata, permanent-delete confirmation and public
visibility filters exist. Remaining acceptance: migration/RLS, remaining legacy
delete handlers, parent-child safety and retention configuration. Dependency:
Task 49 and all source-table policy review.

## Task 51 — Production Database Migration Readiness — TESTING

Task 51 — Production Database Migration Readiness is TESTING / VERIFICATION.

Migration inventory, known-applied report/campaign patch, protected subscription
boundary, dependency order, conflict gates, backup/rollback plan and read-only
inspection SQL are documented. Remaining acceptance: owner-run ledger/catalog
inspection, backup, migration-by-migration review and approved execution.
Evidence: `docs/production-database-migration-readiness.md`.

## Task 53 — Supabase Production Database Verification — TESTING

Task 53 — Supabase Production Database Verification is TESTING / VERIFICATION.

No SQL was executed by Codex.

The consolidated read-only audit query and local comparison utility exist. The
query has not been run from this workspace because privileged access is
unavailable. Remaining acceptance: owner export, conflict review, backup
readiness and approval. The 2026-10-02 owner export is historical evidence
only, not current production verification. Missing history must not be
interpreted as proof of non-application. Evidence:
`docs/task53-production-database-verification.md`.

## Task 54 — Urgent Editorial AI Repair — TESTING

Cloudflare request environment binding, server system instructions, untrusted
source handling, provider-enforced JSON and safe diagnostics exist. Routing is
Groq for Auto-Populate/public AI and Grok/xAI for Generate/Update. Remaining
acceptance: deployed runtime binding, credentials/model behavior and live
provider checks. Evidence: `docs/task60-ai-functionality-matrix.md`.

## Task 56 — Share Barabara Public Website Repair — TESTING

Public navigation, Article rendering, related cards, unsold-ad destination,
ecosystem copy, Mjengo/social surface and bounded public AI evidence exist.
Remaining acceptance: production browser/device review, social configuration,
Mjengo freshness and deployed public-AI runtime.

## Task 57 — Editorial AI Contracts & Update Existing — TESTING

Owner-supplied Article and Report prompts, Alert contract, provider routing,
Update Existing proposals, unsaved-form preservation, SEO/image validation and
explicit human application exist. Remaining acceptance: runtime credentials,
live providers and all editorial-form browser review.

## Task 58 — Production Database Audit & Migration Readiness — TESTING

Repository migration chain, protected subscription boundary, known-applied
exception, dependencies, conflict gates and backup precautions are documented.
Production ledger status remains unconfirmed except for the documented
known-applied exception. Evidence: `docs/production-database-migration-readiness.md`.

## Task 59 — Production Database Migration Reconciliation — TESTING

The owner-supplied 2 October 2026 audit export was reconciled at catalog level.
Backup approval, ledger reconciliation after each write, production verification
and owner approval remain outstanding. Evidence:
`docs/production-database-migration-reconciliation.md`.

## Task 60 — Production Recovery, AI Functionality, Project Publishing & Deployment Audit — TESTING

Task 60 is in TESTING / VERIFICATION; repository evidence is recorded, while
production approval and any protected migration execution remain outstanding.
Production deployment version and exact deployed Git SHA remain unverified.

Repository-side recovery, AI, project-publishing scope and deployment audits
exist. Production Worker identity, live AI behavior, project-publishing
ownership/schema and migration readiness remain unverified or owner-approved.
No project publishing capability is present in this repository; Mjengo previews
are read-only. Evidence: `docs/task60-*.md`.

## Task 61 — Permanent Staging & Environment-aware Authentication — PENDING

Permanent staging Worker/domain, staging markers, noindex/nofollow, disabled
cron/push dispatch, shared-data warning, origin-aware OAuth/password/reset
callbacks and protected return destinations are implemented in the staging
candidate. Staging Worker evidence: `82db5894-0334-4d7d-abe1-75ce8b90f3bd`.
Automated auth contracts pass, but this is staging-only and interactive provider
login/owner acceptance is outstanding. Dependencies: staging review and explicit
production release approval; do not change the production Supabase Site URL.

## Task 62 — Sitewide Four-item Advertising Distribution — PENDING

Reusable placement logic inserts listing banners after four real items, midpoint
banners in long-form content, and interval banners in related sidebars while
preserving paid ads, house-ad fallback, targeting and tracking boundaries.
Candidate evidence: commit `ebaa1c6ece51e76e9c7e470840c00752bdf7ea9b`, staging
Worker `82db5894-0334-4d7d-abe1-75ce8b90f3bd`, and 301 passing tests reported.
It is staging-only. Remaining acceptance: production render checks across public
templates, representative inventory/content, responsive viewports and duplicate
impression verification.

## Task 63 — Editorial Updates — PENDING

Shared public Alerts/Reports chronology, staff authoring and role/policy
boundaries exist, including review-only migration
`20261005100000_editorial_updates_review.sql`. The prior tracker omitted this as
a standalone task. Production ledger state, RLS, browser behavior and owner
acceptance remain unverified. Dependencies: existing Alert/Report parents and
Task 53 ledger review.

## Task 64 — Incident Source Operations & Scheduler — PENDING

Source lifecycle, bounded execution/claiming, retry state, duplicate metadata,
admin operations and scheduler seams exist. Review-only migrations include
`20261006100000_incident_source_operations_review.sql` and
`20261006120000_incident_source_scheduler_review.sql`. Production cron,
ledger/RLS and safe scheduler execution are not verified. Dependencies: source
ownership, Task 25 retrieval boundaries and production scheduler approval.

## Task 65 — Duplicate Detection, Suggestions & Merging — PENDING

Staff-controlled accident duplicate merge, cross-content suggestions and
canonical incident linking exist in review-only form. Evidence includes
`20261005120000_accident_duplicate_merge_review.sql`,
`20261006110000_incident_duplicate_suggestions_review.sql` and related
implementation commits. Production schema, permissions, audit behavior and
owner acceptance remain unverified. Dependencies: approved Reports, source
operations and moderation/RLS review.

## Task 66 — Paystack Subscription Payments — PENDING / DEFERRED

The protected subscription-payment design is present in
`20260929130000_subscription_payments_schema_review.sql`, but Paystack
provider/webhook activation is explicitly outside the general migration
sequence. No provider activation, payment acceptance or owner approval is
claimed. Dependencies: separate payment-owner review, webhook/security plan,
backup and explicit release approval.

## Task 67 — Resend Newsletters — PENDING

Newsletter subscriber storage, admin surfaces and server-side delivery seams
exist. Resend provider configuration, sender/domain verification, production
delivery, unsubscribe/compliance checks and owner acceptance are not evidenced.
Dependencies: approved provider credentials, deliverability review and safe
production test plan.

## Task 68 — Public Search & Saved AI Chats — PENDING

Public search coverage and owner-scoped saved Share Barabara AI chats exist in
the source history. Production deployment identity, live RLS/ownership and
owner acceptance are not independently verified. Dependencies: Task 53 schema
review and Task 54 runtime verification.

## Task 69 — Project Publishing & Schema — PENDING / DEFERRED

Task 60 audits confirmed that this repository has no project-generation,
project-autopopulate or project-publishing capability and no confirmed Share
Barabara `projects` schema. Mjengo project previews are read-only. Do not add a
fake route or infer ownership. Next action requires an explicit product owner,
schema decision and separate scope approval.

## Migration and release dependencies

The safe dependency order is: read-only Task 53 audit; backup/snapshot and
ledger reconciliation; Statistics; Task 27 preferences; leaderboard; taxonomy;
Article location; Theft/Vandalism metadata; notification customization; push
schema/configuration; Feed; moderation; Recycle Bin last. The protected
subscription migration remains separate. Never replay a migration solely
because its history row was absent from an earlier export, and never delete
migration history as rollback.

Staging remains separate from production. Staging uses shared mutable data,
has no scheduled trigger, disables push dispatch, emits `noindex, nofollow`,
serves disallow-all robots and displays `STAGING · SHARED DATA`. Staging review
does not authorize production deployment.

## Current inventory summary

- **PENDING:** Tasks 24, 25, 41 and 61–69, plus the unnumbered work above.
- **TESTING:** Tasks 26–31, 42–50, 51, 53, 54, 56–60.
- **COMPLETED:** none; no explicit owner acceptance record was found.

The TESTING statuses preserve the existing production-baseline classification;
they are not COMPLETED. Exact production Worker identity and owner acceptance
remain outstanding and must be resolved before any status changes.
