# Share Barabara public-page layout audit

Status: planning only. No application code, schema, data, permissions, deployment, or tracker file was changed.

## Evidence

Reference pages inspected as rendered HTML/text:

- https://mjengohub.co.ke/articles
- https://mjengohub.co.ke/projects
- https://mjengohub.co.ke/feed
- https://mjengohub.co.ke/

Local source inspected in the Mjengo Hub repository includes templates/articles.html, article_detail.html, projects.html, project_detail.html, tracker partials, banner-ad partials, and static/css/main.css. Share Barabara source was inspected on origin/staging at 1597879325ef00baed6e6c8e206a9cd667f9ab96.

https://staging.sharebarabara.co.ke returned an internal error during this audit; staging pixel-level verification is unavailable. Exact live ad inventory, impression records, RLS decisions, and live database contents remain unverified.

## Mjengo patterns worth adapting

- Editorial lead plus compact previews: the Articles page uses a page heading, breaking/lead treatment, then Latest, Featured, Trending, Prime, most-viewed and topic feeds. The first item has visual priority; later items are dense rows or cards.
- Browse by meaning: Projects combine search/filter controls with category, status, county/region and financing browse groups, with result counts and active-filter state.
- Contextual cross-links: articles connect to projects, related articles and feed activity; projects connect to articles, updates, milestones and nearby/contextual projects. Share Barabara must resolve equivalent links only from real relationships, taxonomy or location keys.
- Desktop rail, one mobile flow: newsletter, recommendations, compact feeds and ads live in a contextual rail on desktop and become ordered blocks below the main content on small screens.
- Alternating editorial sections: white and pale-blue bands improve long-page scanning. Use Share Barabara semantic tokens, not Mjengo colors or branding.
- Image hierarchy: lead images are wide; secondary previews use consistent landscape thumbnails; absent media has a purposeful fallback. Use object-fit: cover and meaningful alt text.
- Tracker composition: hero/search/filter, latest strip, KPI/category/status groups and paginated results are a useful reference for Alerts, Reports and Statistics, but incident semantics and incomplete-data warnings must remain native.
- Advertising as a layout primitive: local tracker partials and article detail include row-aware/inline advertising. Real content rows/items must be counted separately from ad markers.

## Current Share Barabara baseline

Reusable pieces already present:

- PublicPageHero for branded heroes, breadcrumbs and CTAs.
- featured-cards.tsx, ad-interleave.tsx, BannerAd, and ad-placement.ts.
- SeverityBadge, UserLink, VoteButtons, CommentSection, ShareButtons, AttachmentGallery, NewsletterForm, and MjengoPreviews.
- Shared header/footer, Tailwind tokens in styles.css, shadcn primitives, dark-mode support and existing route-level query hooks.

Current limitations:

- Public routes use individually authored grids/lists rather than one editorial hierarchy.
- There is no shared typed recommendation contract that explains why a card is relevant.
- Ad helpers exist, but route boundaries do not document whether cadence counts cards, complete rows, long-form blocks, or sidebar items.
- Alerts/reports/feed need explicit lifecycle, verification, privacy and moderation display contracts before cards are unified.
- Statistics is functional and includes map/chart work; its redesign must consume Task 26's stable contract rather than duplicate it.

## Page audit summary

### Alerts

/alerts and /alerts/$alertId already have latest/trending data, county/hazard filters, severity, road/profile metadata, votes, discussion, submission, contributor ranking, ads and Mjengo context. Make active alerts the lead, group expired/resolved items separately, and surface severity, county, road, type and recency. Never infer current status from age alone.

### News & Articles

/news and /news/$slug have category filtering, article cards, featured flags, date/source metadata, interleaving, rich text, sharing, comments, related content and ads. This is the safest representative listing/detail pair because it most closely matches the Mjengo editorial model.

### Accident Reports

/reports and /reports/$reportId have taxonomy, report metrics, location, media, votes/comments, related discovery and ads. Confirmed facts must be distinct from unverified information; nullable casualty helpers must never render unknown as 0.

### Statistics

/statistics already has data queries, charts, filters, report-count semantics, map surface and Mjengo context. Put definitions/provenance beside key statistics, then charts/map/trends/comparisons. Task 26 is a dependency for the final map composition.

### Campaigns

/campaigns and /campaigns/$slug have admin authoring and public status/date/location/organiser/action data. Active/upcoming/completed must come from stored status/date semantics; do not invent outcomes or participation figures.

### Media & Feed

/media and /feed have media/social and community/moderation paths. Feature media editorially without changing signed-out visibility, moderation, voting, commenting, attachments or private-content boundaries.

## Responsive and accessibility findings

Use the existing review set at 320, 360, 390, 412, 768, 1024, 1280, 1440 and 1600+ widths. Desktop may use a 12-column content/rail composition; tablet reduces or collapses the rail; mobile is one ordered flow. Use semantic headings, visible focus, keyboard-operable filters, aria-live for async state, stable aspect ratios, object-fit, alt text and dark-mode tokens.

## Explicitly unverified

- Pixel-level staging behavior (staging returned an internal error).
- Live ad eligibility, paid priority, frequency/impression logging and duplicate-impression behavior.
- Exact cross-content database relationships and the final Task 26 map contract.
- Mjengo pages are not assumed defect-free; local CSS contains historical fixes for sidebar sizing, detail whitespace, mobile controls and media overlays. Those are pitfalls to avoid, not code to copy.
