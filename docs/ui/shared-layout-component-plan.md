# Shared public layout component plan

Implementation plan only; no application change is included.

## Component boundaries

| Component | Responsibility | Safeguards |
|---|---|---|
| PublicEditorialShell | Max width, hero rhythm, white/pale-blue bands, desktop rail and mobile ordering | Semantic heading ownership, token surfaces, no route logic |
| SectionHeader | Eyebrow, heading, description, result count and view-all | Sequential heading level and definition/status note |
| FeaturedLeadCard | Large image, lead title, summary and metadata | Fixed ratio, fallback, alt text and focus state |
| CompactContentCard | Dense secondary preview with thumbnail and metadata | Full accessible title, consistent ratio and null-safe metadata |
| ContentGrid | Responsive 1/2/3-column sections | Real content separate from ad slots; no hidden overflow |
| RelatedContentPreview | Typed Alert/Article/Report/Campaign/Statistics recommendation | Reason, href, visibility predicate and attribution |
| StatusBadge and SeverityBadge | Lifecycle and urgency styling | Explicit value mapping; never infer unknown as zero/current |
| LocationMeta | County, road/highway and optional map link | Null-safe, labelled icons and safe links |
| PublicSidebar | Sticky desktop modules and mobile post-content stack | Module IDs; intervals count real modules only |
| NewsletterModule | Existing NewsletterForm with contextual copy | Consent, provider/error state and no duplicate submit |
| AdSlot and AdCadence | Existing BannerAd with placement ID and cadence declaration | Paid priority, eligibility, one impression, real-item versus row counter |
| MediaFrame | Image/video/fallback and gallery affordances | object-fit: cover, alt/credit, keyboard/lightbox behavior |
| AsyncState | Loading, empty, error, retry and no-results states | aria-live, stable layout and route-specific copy |
| DetailFacts | Shared facts display for Alert/Report/Campaign/Statistics | Nullable values, verification/source labels, no contract mutation |
| RecommendationResolver | Deterministic contextual recommendation input | Relation/taxonomy/location precedence and permission filter |

## Layout invariants

- Use Share Barabara brand tokens and typography from styles.css; do not introduce Mjengo logos or colors.
- Desktop target: 12-column grid, primary content 8-9 columns, rail 3-4 columns. Tablet narrows/collapses the rail; mobile is one column.
- Media defaults: lead 16:9, compact 16:9, avatar 1:1. Use object-fit: cover and a purposeful fallback.
- Alternate only tokenized white and pale-blue surfaces. Avoid nested pale bands that reduce contrast.
- Use semantic surfaces/borders/text for dark mode, not hard-coded light assumptions.
- Keep one h1, sequential headings, visible focus, 44px touch targets, keyboard filters, descriptive links and async aria-live.

## Advertising contract

withAdPlacements and AdInterleave remain the source of truth for listing interleaving. Each route must declare one cadence unit:

1. Completed-row cadence: a rendered layout row after responsive column calculation, only where Task 62 explicitly requires rows.
2. Individual-card cadence: each real content card increments the counter; ads occur after real card four, eight, and so on.
3. Long-form midpoint: one named slot between complete content blocks; it does not increment listing/sidebar counters.
4. Sidebar interval: count real recommendation/module items only; ads do not reset or increment the content counter.

No component may count an ad marker as content, place an ad inside a structured fact block, duplicate an impression on rerender, or remove paid/eligibility/targeting behavior from BannerAd.

## Data and permission boundary

The layout layer receives view models; it does not invent counts, statuses, relationships or privacy decisions. Query hooks remain owners of Supabase/RPC contracts. Filter recommendations before rendering for public visibility, moderation, current alert status and feed privacy. Nullable casualties, missing images, absent roads, unknown sources and unavailable statistics render as explicit unknown/omitted states.

## State coverage

Every section has a stable skeleton or text loading state, an empty state with a useful next action, an error state with retry, and a media fallback with no large blank container. Empty filtered results distinguish no records from no matching records.

## Implementation order

1. Build shell, section header, lead/compact cards, grids, related preview, metadata/status, media fallback and async states.
2. Add the ad cadence wrapper without changing BannerAd behavior.
3. Migrate News listing and Article detail.
4. Owner visual review at agreed viewports.
5. Migrate Alerts/Reports, then Campaigns/Media/Feed.
6. Recompose Statistics after Task 26 exposes the stable map/data contract.
