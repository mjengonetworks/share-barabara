# Editorial field ownership inventory

This inventory is the shared CMS, AI and public-display contract. It is based
on the current forms, `src/lib/ai/editorial.functions.ts`, public detail
loaders and the existing database migrations. It does not authorize a schema
change or production migration.

| Content type | Canonical editorial fields | Structured incident fields | AI mapping | Public display |
| --- | --- | --- | --- | --- |
| Article (`news`) | `title`, `summary`, `body`, `categories`, `source`, featured image metadata, SEO fields | Optional article location (`location_label`, `location_type`, `county`, `road`, coordinates) when the reviewed location columns exist | Title, summary, body, category, SEO and image metadata only; no incident casualty/severity fields | Headline, publication metadata, source, summary, image, body and related content |
| Accident Report (`accident_reports`) | `title`, `summary`, description, image metadata, SEO fields | County, road, incident type, severity, occurrence datetime, vehicles, injuries, fatalities, parties and casualty breakdown | Report fields only; unknown casualty values remain `null` | Report headline, incident metadata, summary, description, media and related content |
| Alert (`alerts`) | `title`, editorial `summary`, advisory description, image metadata | County, road, hazard type, severity, lifecycle status, parties and attachments | Alert fields only; AI Summary is separate from editorial Summary | Headline, metadata, editorial Summary, AI Summary, expandable blue advisory and related content |
| Campaign (`campaigns`) | `title`, summary/description, image metadata | Location and start/end dates | Campaign fields only; dates normalize to `YYYY-MM-DD` | Campaign headline, dates, content, image and related content |
| Infrastructure Issue (`infrastructure_issues`) | `title`, summary, content, image metadata, editor note | Road name/scope, county, authority, structure type, optional verified coordinates | Infrastructure fields only | Issue headline, location metadata, content, image and related content |

Accident-specific fields are rendered only by the Report editor. Article
location is an optional editorial location contract, not an incident report;
it does not include occurrence time, casualty counts, severity or collision
classification.

All AI actions use the same content-type-specific strict response schema.
Provider output is parsed, normalized, taxonomy-checked and mapped into an
editable proposal. AI never persists or publishes a proposal automatically.

Cross-content links use `editorial_content_relationships` through the reviewed
permission-aware RPCs. Required reciprocal targets are Article ↔ Accident
Report, Article ↔ Campaign, Accident Report ↔ Campaign and Alert ↔ Campaign.
The public related-content RPC exposes only public endpoints; the migration is
review-only and must be applied before authenticated relationship writes work.
