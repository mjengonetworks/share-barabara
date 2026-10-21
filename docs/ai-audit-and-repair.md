# Share Barabara AI audit and repair

Status: TESTING / VERIFICATION. The repository repair is implemented and the production build passes. Staging runtime acceptance and live provider checks remain required.

## Inventory

| Feature | UI entry point | Backend | Provider/model | Access |
| --- | --- | --- | --- | --- |
| Article Generate | Admin Articles, Editorial AI | `generateEditorialDraft` | xAI/Grok, `XAI_MODEL` or `grok-3-mini` | Authenticated moderator/editor/admin |
| Article Auto-Populate | Admin Articles, Editorial AI | `generateEditorialDraft` | Groq, `GROQ_MODEL` or `openai/gpt-oss-120b` | Authenticated moderator/editor/admin |
| Article Update Existing | Admin Articles, Editorial AI | `generateEditorialDraft` | xAI/Grok | Authenticated moderator/editor/admin |
| Alert Generate/Auto-Populate/Update | Admin Alerts, Editorial AI | `generateEditorialDraft` | xAI/Grok for Generate/Update; Groq for Auto-Populate | Authenticated moderator/editor/admin |
| Accident Report Generate/Auto-Populate/Update | Admin Reports, Editorial AI | `generateEditorialDraft` | xAI/Grok for Generate/Update; Groq for Auto-Populate | Authenticated moderator/editor/admin |
| Quick AI Summary | Published article/report/alert detail | `quickAISummary` | Groq | Signed out or signed in; published evidence only |
| Public AI Chat | Header and contextual AI surface | `publicAIChat` | Groq | Authenticated; user-owned threads |
| External retrieval | Public AI when general/fresh evidence is insufficient | `searchExternal` | Optional Tavily, Exa or SearXNG | Server configuration only |
| Feed moderation/background agents | Feed moderation functions and agent documentation | Separate moderation paths | Configuration-gated; not activated by this repair | Server/admin boundaries |

The public path has no access to editorial prompts, unpublished drafts or administrator records. Editorial calls use the authenticated server function and role allowlist, and Update Existing reads only the authorized CMS record plus submitted current form state.

## Defects found and repaired

1. Content-scoped public AI assessed only database-resolved evidence. If that resolver failed, a valid bounded source text supplied by the published page was not considered sufficient.
2. Content-scoped requests could fall through to external search. This was unsafe for a summary of a specific published item and could produce unrelated evidence.
3. Resolver exceptions escaped before the page-context fallback could be used.
4. Alert and accident-report detail pages did not pass their already-rendered published content to Quick AI Summary or contextual chat.
5. The freshness detector ran before the direct-content check, so the summary prompt's own words such as “current” and “recent” could reject valid direct context.

The repair catches public-evidence resolver failures, evaluates the final bounded evidence set, gives direct published context precedence over the freshness detector, keeps content-scoped requests on the current published content, returns `insufficient_evidence` when that content is unavailable, and supplies bounded alert/report context from the page. Provider failures remain fail-closed; no fabricated summary is rendered.

## Authentication handoff

Signed-out visitors can request a summary. After a successful response, the existing contextual surface shows `Sign in to Chat` directly below it. The link uses the current internal path plus `#share-barabara-ai`; the auth route validates the return path, preserves it through password, signup-confirmation and OAuth flows, then returns to the exact page and focuses the existing contextual AI surface. Signed-in users receive the existing contextual composer instead of the sign-in prompt.

## Verification record

- `npm run build`: passed.
- Focused regression tests: added in `tests/ai-summary-flow.test.mjs`; run with `node --test tests/ai-summary-flow.test.mjs`.
- Local live-provider test: not available in this checkout because `GROQ_API_KEY` and `XAI_API_KEY` are not present. No credentials were printed or committed.
- SearXNG/external retrieval: repository integration exists, but no local provider is configured. Do not claim live retrieval acceptance until staging credentials and the selected provider are verified.
- Staging deployment: pending runtime deployment and browser acceptance.

## Remaining acceptance checks

Run representative published article, alert and report flows on staging, with featured and fallback source content. Verify signed-out summary generation, provider error and malformed-response messaging, the sign-in return path, signed-in contextual chat, desktop/mobile layout, and authorization boundaries. Do not run migrations or change Task 70 objects or demonstration advertisements.
