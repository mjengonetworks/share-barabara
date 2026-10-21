# AI content-type expansion design

Status: DESIGN / NOT IMPLEMENTED. Infrastructure Issues and Campaigns do not currently have an established Editorial AI backend contract. No AI controls were added to those forms.

## Infrastructure Issues

The existing admin form edits `infrastructure_issues` fields: `title`, `road_name`, `county`, `authority`, `structure_type`, `summary`, `content`, and `editor_note`. The AI contract should use the existing `generateEditorialDraft` server-only provider abstraction with a new `infrastructure_issue` content type and a dedicated prompt. The controlled values must come from the existing county, road-authority, and structure-type taxonomies. `status`, `reviewed_by`, `reviewed_at`, `user_id`, `page_id`, anonymity, and image fields must never be AI-controlled.

Generate should create a reviewable draft from supplied evidence. Auto-Populate should fill only supported blank or explicitly requested editorial fields and must preserve manually entered values. Any update operation should return a proposal for review rather than save or publish.

## Campaigns

The campaign event form edits `title`, `location`, `description`, `image_url`, `start_date`, `end_date`, and attachments. Its report subform separately edits `report_content`, `report_image_url`, `report_published`, and report attachments. These are different editorial contracts. Campaign AI must not change dates, publication flags, slugs, attachments, or report publication state without explicit human action.

The first safe contract is Generate and Auto-Populate for the event fields, using a campaign-specific prompt that prohibits invented dates, venues, sponsors, partners, budgets, attendance, outcomes, or calls to action. A separate report-writing contract may later support `report_content` only from supplied post-event evidence; it must never set `report_published` automatically. Both contracts require field-level schemas and authorization tests before any UI control is exposed.

## Provider mapping

Generate and any reviewable Update Existing operation use the established xAI/Grok path. Auto-Populate uses Groq. API keys remain server-only. Public AI must not receive campaign drafts, unpublished reports, administrator notes, or infrastructure moderation metadata.

## Acceptance required before implementation

- Define and review the exact JSON schemas and prompt fixtures.
- Add server role checks, allowlists, malformed-response handling, and non-destructive form application.
- Add Add/Edit regression tests for Generate and Auto-Populate.
- Run real staging provider tests after `GROQ_API_KEY` and `XAI_API_KEY` are configured.
- Only then add buttons to the corresponding forms.
