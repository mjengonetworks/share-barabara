# Public-page layout rollout plan

Planning only. Do not update PENDING.md during the concurrent edit window; the entry below is proposed for the tracker maintainer. Do not deploy, write data, run migrations, or change production/staging configuration.

## Phases and exit criteria

### 1. Foundation

Implement the shared shell, section headers, lead/compact cards, three-column grids, related previews, metadata/status badges, sidebar modules, newsletter wrapper, media fallback and async states. Preserve route/query/data contracts. Add focused tests for nulls, accessibility labels, fallbacks, dark mode and deterministic recommendation ordering.

Exit: components render at mobile/tablet/desktop widths and ad behavior is unchanged.

### 2. Representative pages

Migrate /news, then /news/$slug. Keep category, author, date, source, comments, share controls, Mjengo attribution and editorial permissions. Keep the existing long-form midpoint slot and declare the listing cadence unit.

Exit: owner visual review approves hierarchy, ratios, rail, dark mode, keyboard behavior, state handling and ads.

### 3. Incident pages

Migrate /alerts, /alerts/$alertId, /reports and /reports/$reportId. Keep alert lifecycle and report verification distinct. Preserve unknown casualty semantics, evidence privacy, discussion and moderation.

Exit: status/verification tests pass; expired alerts do not appear in current sections; unknown values never render as zero.

### 4. Campaigns and community

Migrate /campaigns, /campaigns/$slug, /media and /feed. Preserve campaign status/actions, signed-in/signed-out feed behavior, moderation, votes, comments and attachments.

Exit: permission regression tests and representative browser review pass.

### 5. Statistics coordination

Coordinate with Task 26 before changing /statistics. Consume the approved map interface, definitions, provenance and report-count semantics. Do not duplicate map code or infer geographic completeness.

Exit: charts, filters and map remain functional; accessible summaries and incomplete-data labels are present; Task 26 owner accepts the boundary.

### 6. Responsive and regression review

Review 320, 360, 390, 412, 768, 1024, 1280, 1440 and 1600+ widths, light/dark modes, keyboard navigation, reduced motion, long titles, no-result filters, failed queries, slow media, anonymous users, signed-in users and eligible/ineligible ad inventory.

Exit: no horizontal overflow, lost interaction or duplicate impression; owner approves evidence.

### 7. Controlled staging integration

Only after approval, integrate the reviewed commits into the active development path. Run the staging release workflow, verify public routes, then obtain explicit owner acceptance. Production remains outside this plan.

## Task 62 advertising conflicts

The brief says after four completed content rows while existing code supports item-based interleaving. These are not equivalent on three-column desktop and one-column mobile. Before migrating each route, record placement ID, cadence unit, pagination offset, viewport behavior, midpoint slot, sidebar interval, paid-priority rule and impression key. Preserve Task 62 semantics until the owner explicitly approves a change.

## Task 26 dependency

Statistics redesign is downstream of the interactive incident map candidate and its production data/provenance acceptance. This plan may define the shell and map slot contract, but must not alter map implementation or infer completeness. Task 26 remains responsible for the statistics browser/device review boundary.

## Proposed tracker entry (do not apply in this run)

    ## Task 70 — Public Page Layout System & Editorial Content Flow — PENDING

    Planning audit and implementation matrix are prepared on the isolated
    feature/public-page-layout-system branch. Scope covers Mjengo-inspired but
    Share Barabara-native public listing/detail hierarchy for Alerts, News &
    Articles, Accident Reports, Statistics, Campaigns, Media and Feed; shared
    editorial cards, related previews, sidebars, newsletter, media fallbacks,
    responsive behavior and explicit Task 62 ad cadence boundaries.

    No application code, data, permissions, migrations or deployment changed
    in the planning phase. Dependencies: owner visual approval; Task 26
    Statistics map/data contract; Task 62 advertising acceptance; existing
    content/privacy/moderation contracts; and the staging release workflow.
    Evidence: docs/ui/public-page-layout-audit.md,
    docs/ui/public-page-implementation-matrix.md,
    docs/ui/shared-layout-component-plan.md, and
    docs/ui/public-page-rollout-plan.md.

## Owner decisions needed

1. Confirm the first implementation pair: /news and /news/$slug.
2. Confirm whether each listing ad cadence is row-based or individual-card-based; keep Task 62 behavior if undecided.
3. Approve recommendation precedence: explicit relation, shared taxonomy/location, bounded recency fallback.
4. Confirm the Task 26 map/data interface and whether Statistics joins the same visual batch.
5. Confirm newsletter copy/provider readiness and the staging visual-review owner.
