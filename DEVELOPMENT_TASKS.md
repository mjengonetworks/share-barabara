# Share Barabara Development Tasks

## Homepage, statistics, navigation, engagement and advertising workstream

Status: deployed on 29 October 2026; implementation and automated verification complete, with live testing, user acceptance and migration approval still pending.

Baseline: `b8487ffc5f63326a98729839d7e0b103044466e8` (the deployed footer release).
Active production Worker: `c193a8dd-725d-403e-9334-0446d1c86236`.

### Completed before this workstream

- The public homepage, Statistics page, shared public layout, Quote of the Day module, newsletter component, BannerAd component, Partner With Us page and admin banner-ad surface already exist.
- Public accident reports are filtered to approved records in the existing homepage and Statistics queries.
- The homepage already has configured BannerAd placements and a Statistics destination preview.
- The deployed mobile article headline and footer releases remain part of this baseline and must not regress.

### This workstream

- [x] Audit and rebalance homepage hierarchy, spacing, cards, calls to action and responsive proportions.
- [x] Make a verified recorded-accident count the primary post-hero statistic, with an honest unavailable state when the approved source cannot provide it.
- [x] Improve the homepage Statistics preview using only real approved platform data.
- [x] Add one shared public Back to Top control with focus, reduced-motion and safe-area handling.
- [x] Make the existing quote module available consistently across public pages, excluding Merch and Partner With Us, without duplicate instances.
- [x] Redesign the homepage newsletter composition while preserving the existing NewsletterForm and footer styling.
- [x] Audit and repair ad placeholders and safe Partner With Us fallback links; existing active-ad selection remains in place.
- [x] Add migration-reviewed admin/public support for placement, lifecycle dates, priority, active filtering, fallback and edit/preview behavior. Migration remains unapplied pending approval.
- [x] Verify the Partner With Us advertising enquiry journey in source: validation, persistence contract and admin visibility are preserved; no real public enquiry was submitted.
- [x] Add focused regressions for statistics integrity, report hash navigation, Back to Top, quote coverage, newsletter behavior, ads, enquiry validation and admin contracts.
- [x] Resolve the four editorial-AI test failures with a test-only Node alias/raw-loader; all editorial-AI tests now pass.
- [x] Run focused/security/full tests, production build and `git diff --check`.
- [x] Complete candidate interactive browser verification at 320, 375, 390, 430, 440, 768, 1024, 1280 and 1440px using the hydrated Vite dev server; report hash navigation and responsive overflow checks pass.

### Dependencies and blockers

- Canonical incident identity and deduplication remain owned by SB 2. Do not create a competing statistics calculation or incident table.
- `20261029120000_banner_ad_placements_review.sql` is a review-only additive candidate; no migration may be applied without separate approval.
- The candidate preserves existing rows through defaults, keeps editor RLS, narrows public reads to active/in-window ads, and requires a staged rollback review before any column removal.
- The installed system Chrome verified the live production site at all required widths with no horizontal overflow and the expected public routes. Candidate interactive acceptance is complete against the hydrated Vite dev server. No authorised test credentials or staging environment are present, so authenticated submission and admin CRUD flows require owner-provided test access. Three 400 responses from unauthenticated data/API requests were observed, but no page errors or hydration warnings remain after the nested-link fix.
- Claims about ad enquiry delivery require evidence from the existing persistence or delivery path; code presence alone is insufficient.
- Repository-wide `npm run lint` remains blocked by 46,231 pre-existing Prettier CRLF errors across the checkout (including untouched files); focused lint reports the same line-ending baseline plus two formatting suggestions in the new selector, with no runtime lint rule failures.

### Acceptance gates

- [x] No unrelated public or admin behavior changes.
- [x] No database migration execution.
- [x] Existing deployed typography and footer contracts remain intact.
- [x] All new metrics are labeled as platform-recorded where applicable and exclude drafts, rejected records and duplicate incidents.
- [x] No fabricated values, charts, quotes, advertisers or enquiry outcomes.

### Verification evidence

- `npm run test:all`: 456 passed, 0 failed.
- `npm run test:security`: 14 passed, 0 failed.
- `npm run build`: passed; static, SSR and Cloudflare/Nitro artifacts generated.
- `git diff --check`: passed.
- Live production Chrome smoke check: homepage loaded at 320, 375, 390, 430, 440, 768, 1024, 1280 and 1440px with no body overflow, footer present and no page errors. This does not substitute for candidate acceptance.
- Candidate Chrome acceptance: all required widths rendered without overflow; `/reports#report-form` mounted and scrolled to the form after data load; reduced-motion mode was exercised; Partner With Us native validation rejected empty required fields; report-route hydration warnings were fixed by keeping action links outside incident-card links.
- Candidate preview root causes: Vite preview expects incompatible `dist/server/server.js`; Nitro preview rejects the generated Wrangler config's nested `env.staging`; the Vite dev server is the functional candidate browser harness and its client entry hydrated successfully.
- No database migration was executed. The placement migration remains review-only.

### Deployment record

- Approved and deployed application commit: `2025e9ccf340f0db0b6126919620df13b12edf82`.
- Cloudflare production Worker: `c193a8dd-725d-403e-9334-0446d1c86236`, created `2026-10-29T10:04:31.505Z`, receiving 100% traffic on `sharebarabara.co.ke`.
- Deployment used the built Cloudflare artifact after removing only the invalid generated `env.staging` block from the ignored artifact config; tracked production configuration was not changed.
- Live browser verification passed for homepage responsive widths 320, 375, 390, 430, 440, 768, 1024, 1280 and 1440px, with no horizontal overflow or page errors.
- Live report hash navigation mounted and scrolled to `#report-form`; Partner With Us loaded and rejected invalid required fields.
- The advertising placement migration remains unapplied and was not part of this deployment.

## Pending Live Testing / User Acceptance

These items remain intentionally open after deployment. Deployment does not mark the workstream fully complete.

### SB1-HPA-01 — Report submission and navigation

Status: **Pending Live Testing**

- Tested and passed: automated return-target contracts; candidate browser verification of `/reports#report-form`, conditional form mounting after data load, hash scrolling, responsive layout and unauthenticated navigation.
- Still unverified: authenticated live form opening, submission, validation, persistence, server errors, success feedback and post-submission routing/refresh behavior.
- Dependency: owner-provided authorized test account or safe staging environment; do not create an actual public report without explicit test authorization.
- Acceptance criteria: an authorized user reaches the mounted form from the footer/hash route, submits an approved test payload, sees correct validation and success/error feedback, persistence is confirmed, and no unauthorized path can submit or expose data.

### SB1-HPA-02 — Partner With Us enquiry flow

Status: **Pending Live Testing**

- Tested and passed: source-level validation and existing `partner_enquiries` persistence contract; candidate/live browser rendering; invalid required fields are rejected; no real production enquiry was created.
- Still unverified: valid live submission, database persistence, administrator visibility, confirmation behavior, duplicate handling and production error feedback.
- Dependency: authorized test account or an owner-approved disposable test procedure that avoids unwanted production records.
- Acceptance criteria: a valid enquiry is safely accepted or clearly rejected, persistence and admin visibility are confirmed, validation errors are actionable, confirmation is accurate, and test data is removed or retained only under owner direction.

### SB1-HPA-03 — Advertising administration

Status: **Pending Live Testing**

- Tested and passed: admin route contracts, edit controls, placement/date/priority fields, admin gating tests and safe URL-selection tests.
- Still unverified: authenticated administrator creation, editing, activation/deactivation, scheduling, priority changes, preview behavior and unsafe URL rejection against the live application.
- Dependency: authorized administrator test access; the public site must not be granted inventory-management permissions.
- Acceptance criteria: only authorized administrators can manage ads; placement, lifecycle, priority and safe destination rules persist correctly; inactive, expired and unsafe records cannot serve publicly.

### SB1-HPA-04 — Advertising migration review and approval

Status: **Pending Owner Approval**

- Tested and passed: additive migration inspection, compatibility fallback, default preservation for existing rows, public active-window policy design and editor RLS review.
- Still unverified: owner approval, controlled execution, live schema inspection, rollback rehearsal and post-migration data verification.
- Dependency: separate owner approval for `supabase/migrations/20261029120000_banner_ad_placements_review.sql`; migration is **not applied**.
- Acceptance criteria: migration is reviewed for RLS, permissions, indexes, constraints, existing-ad compatibility and rollback; execution is separately authorized and logged; no production SQL runs before approval.

### SB1-HPA-05 — Live advertising behavior

Status: **Pending Live Testing**

- Tested and passed: automated placement selection, priority ordering, active/inactive filtering, start/end-date filtering, unsafe URL exclusion and legacy-schema fallback; live assigned advertisements and Partner With Us links were observed.
- Still unverified: complete live matrix across named placements, legacy advertisements, date boundaries, expired ads, priority ties and empty-slot fallback after real admin data changes.
- Dependency: authorized admin access and, for new placement/date fields, approved execution of the advertising migration.
- Acceptance criteria: the correct active ad serves in each placement; priority and date windows are deterministic; expired/inactive/unsafe ads never serve; empty placements show `Your Ad Here` and link to `/partner-with-us`; legacy ads continue working before migration.

### SB1-HPA-06 — Accident statistics integrity

Status: **Pending User Acceptance**

- Tested and passed: approved-report filtering, duplicate exclusion contracts, unknown casualty preservation, honest unavailable states and non-fabrication regressions.
- Still unverified: owner/user acceptance of the deployed count and presentation against current approved-report data, including duplicate incidents and unknown casualty examples.
- Dependency: SB 2 canonical incident identity/statistics infrastructure and an owner-approved review of representative live records.
- Acceptance criteria: homepage and Statistics values count unique approved incidents, exclude drafts/rejected records and duplicate reports, never treat unknown casualties as zero, and clearly distinguish platform-recorded data from national totals.

### SB1-HPA-07 — Live authenticated security

Status: **Pending Live Testing**

- Tested and passed: automated RBAC/RLS/security contracts, signed-out return-target validation, server-side role checks and fail-closed public data rules.
- Still unverified: live authorized and unauthorized account behavior for report submission, Partner enquiries, advertising administration and related persistence paths.
- Dependency: authorized accounts representing signed-out, ordinary signed-in and administrator roles, or a safe staging environment.
- Acceptance criteria: unauthorized users are rejected, ordinary users cannot manage ads or access private records, authorized actions persist only permitted data, RLS remains enforced, and no sensitive error details or cross-user data are exposed.

### SB1-HPA-08 — Final visual acceptance

Status: **Pending User Acceptance**

- Tested and passed: Chrome responsive checks at 320, 375, 390, 430, 440, 768, 1024, 1280 and 1440px; no horizontal overflow; homepage, footer, report hash navigation and Partner With Us layouts rendered without page errors.
- Still unverified: owner review of the deployed homepage hierarchy, accident statistics, advertisements, report navigation and Partner With Us presentation on representative desktop and mobile devices.
- Dependency: owner review of the live production URL; authenticated visual states may require test access.
- Acceptance criteria: owner confirms the deployed layouts are visually acceptable, controls remain readable and accessible, no clipping/overlap occurs, and the homepage, reports, ads and Partner With Us sections preserve the intended Share Barabara design.
