# Share Barabara Development Tasks

## Homepage, statistics, navigation, engagement and advertising workstream

Status: implementation and automated verification complete; deployment approval pending on `feat/homepage-stats-engagement-ads`.

Baseline: `b8487ffc5f63326a98729839d7e0b103044466e8` (the deployed footer release).

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
- [ ] Complete candidate interactive browser verification at 320, 375, 390, 430, 440, 768, 1024, 1280 and 1440px.

### Dependencies and blockers

- Canonical incident identity and deduplication remain owned by SB 2. Do not create a competing statistics calculation or incident table.
- `20261029120000_banner_ad_placements_review.sql` is a review-only additive candidate; no migration may be applied without separate approval.
- The candidate preserves existing rows through defaults, keeps editor RLS, narrows public reads to active/in-window ads, and requires a staged rollback review before any column removal.
- The installed system Chrome verified the live production site at all required widths with no horizontal overflow and the expected public routes, but candidate interactive verification remains blocked: Vite preview returns HTTP 500 and Nitro preview rejects the generated Wrangler environment configuration; the local dev server emitted SSR without a hydrated client bundle. A browser session against a deployed candidate or a staging Worker is still required for computed styles, keyboard/focus behavior, post-load hash scrolling and authenticated flows.
- Claims about ad enquiry delivery require evidence from the existing persistence or delivery path; code presence alone is insufficient.
- Repository-wide `npm run lint` remains blocked by 46,231 pre-existing Prettier CRLF errors across the checkout (including untouched files); focused lint reports the same line-ending baseline plus two formatting suggestions in the new selector, with no runtime lint rule failures.

### Acceptance gates

- [ ] No unrelated public or admin behavior changes.
- [ ] No database migration execution.
- [ ] Existing deployed typography and footer contracts remain intact.
- [ ] All new metrics are labeled as platform-recorded where applicable and exclude drafts, rejected records and duplicate incidents.
- [ ] No fabricated values, charts, quotes, advertisers or enquiry outcomes.

### Verification evidence

- `npm run test:all`: 456 passed, 0 failed.
- `npm run test:security`: 14 passed, 0 failed.
- `npm run build`: passed; static, SSR and Cloudflare/Nitro artifacts generated.
- `git diff --check`: passed.
- Live production Chrome smoke check: homepage loaded at 320, 375, 390, 430, 440, 768, 1024, 1280 and 1440px with no body overflow, footer present and no page errors. This does not substitute for candidate acceptance.
- No database migration was executed. The placement migration remains review-only.
