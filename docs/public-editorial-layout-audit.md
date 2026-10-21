# Public editorial layout consistency audit

## Scope

This audit covers the public frontend only. The production sharing toolbar, Task 70 database objects,
demonstration advertisements, admin permissions and hosted data are out of scope.

## Baseline

News article details already use the strongest reusable pattern: a compact breadcrumb strip, constrained
70/30 detail shell, white content card, contextual sidebar, newsletter-first ordering, compact previews,
ecosystem cards and existing ad slots. `public-layout.tsx`, `public-ui.tsx`, `article-detail-sidebar.tsx`
and `discovery-sections.tsx` contain the reusable primitives.

## Findings

| Surface | Existing condition | Consistency gap | Batch 1 action |
| --- | --- | --- | --- |
| News detail | Approved article shell and contextual sidebar | Strongest baseline; preserve sharing and metadata | Reuse as regression baseline |
| Alerts detail | 70/30 shell, but route-owned newsletter and alert-only lists | Sidebar, ecosystem and ad ordering diverged from News | Move to shared `EditorialSidebar`; retain severity, status, location and timestamps |
| Accident report detail | 70/30 shell, but route-owned newsletter and report-only lists | Sidebar and recommendation treatment diverged | Move to shared `EditorialSidebar`; retain facts, maps, verified casualty semantics and discussion |
| Campaign detail | Shell present with newsletter only | No shared ecosystem/ad treatment | Adopt shared sidebar; preserve campaign status, dates, location and attachments |
| Infrastructure issue detail | Older max-width, no breadcrumb, narrow fixed sidebar | Older typography, spacing and sidebar hierarchy | Adopt shared breadcrumb, width and sidebar shell; preserve issue-specific fields |
| Discovery sections | Shared cross-category recommendations | Ecosystem copy and heading contained legacy promotional wording | Use approved ecosystem descriptions and neutral platform label |
| Listings, feed and statistics | Purpose-built listing/map/feed layouts | Require separate follow-up audit; forcing detail cards here would harm function | No indiscriminate redesign in Batch 1 |

## Shared architecture

Batch 1 introduces `EditorialSidebar`, which owns the public detail sidebar sequence: newsletter, route-owned
contextual modules, ecosystem previews and the configured advertisement slot. It is intentionally compositional
so alerts, reports, campaigns and infrastructure issues retain their own facts and recommendations without
duplicating the surrounding shell.

## Responsive and accessibility requirements

The shared shell uses `minmax(0, 1fr)` plus a bounded 30% sidebar at large widths, natural-height cards,
mobile stacking, visible focus rings and compact preview rows. Browser screenshots at 390, 768 and 1440px
remain required before visual acceptance; compilation and source tests are not visual approval.

## Remaining batches

1. Add cross-category related queries to campaign and infrastructure detail where supported by existing data.
2. Audit listing/category/search layouts and their ad cadence without changing functional feed/statistics/map UX.
3. Verify desktop/tablet/mobile rendering, dark mode, accessibility and no-overflow behavior in a browser.
4. Stage the approved batch and perform route smoke tests before owner review.
