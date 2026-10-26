# Global Editorial AI audit

## Current architecture

`src/lib/ai/editorial.functions.ts` is the server-side entry point. It requires an authenticated Supabase user, checks the `moderator`, `editor` or `admin` role server-side, applies the editorial rate limiter, loads active controlled taxonomy values, routes Generate/Update to xAI Grok and Auto-Populate to Groq, requests provider JSON, filters to a content-type allowlist, validates values, and returns a local draft or an explicit Update proposal. `EditorialAIButton` applies only non-empty draft values to local form state; Update proposals require explicit application. Persistence, moderation and publishing remain in each form's existing workflow.

Public AI uses a separate server path and Groq provider. It does not call the editorial function and does not receive draft CMS material. API keys remain server-only. SearXNG is still pending; direct source URLs are retrieved only when the supplied URL is public HTTP(S), bounded and successfully fetched.

## Supported content types

| Type | Existing form/workflow | Generate | Auto-Populate | Source URL/text | Structured fields | Review/save/publish |
| --- | --- | --- | --- | --- | --- | --- |
| News & Articles | Admin article editor; contributor submission and editorial review | Yes | Yes | Yes | Yes | Existing workflow preserved |
| Alerts & Advisories | Admin alert editor; moderated public submission | Yes | Yes | Yes | Yes | Existing workflow preserved |
| Accident Reports | Admin report editor; moderated public submission | Yes | Yes | Yes | Yes | Existing workflow and unknown casualty semantics preserved |
| Campaigns | Admin campaign create/edit and post-campaign report | Yes | Yes | Yes | Existing title/location/description/date fields only | Existing save and report publication preserved |
| Infrastructure Issues | Admin moderation/edit queue; public submissions | Yes | Yes | Yes | Existing issue fields only | Existing approve/reject/publish workflow preserved |
| Jobs | No Share Barabara publishing form or route found | No | No | No | No | Blocked by missing module |
| Tenders | No Share Barabara publishing form or route found | No | No | No | No | Blocked by missing module |
| Events | No Share Barabara publishing form or route found | No | No | No | No | Blocked by missing module |

No database tables or routes were invented. No migration is required for this extension.

## Safety boundaries

Alerts have a short alert-specific contract and cannot invent closures, emergency instructions or incidents. Accident casualty values remain `null` when unknown and the update-preservation path prevents an unconfirmed number from replacing a known unknown. Campaign prompts do not invent partners, sponsors, outcomes or dates. Infrastructure prompts do not invent agencies, repair schedules or completion dates. Every generated value remains editable and publication is never automatic.

## Remaining acceptance

Run the production build, browser-check each authorized admin editor, verify deployed Grok/Groq bindings with approved provider checks, and coordinate release with the concurrent UI workstream. Live SearXNG acceptance remains pending and is out of scope.
