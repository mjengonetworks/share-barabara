# Share Barabara AI audit and repair

Status: TESTING / VERIFICATION. The serialization repair is implemented and deployed to staging. The endpoint now has live HTTP evidence from Groq; browser rendering and authenticated acceptance remain required.

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

### Serialization diagnosis

The reported `Seroval Error (step: 3)` was reproduced only when a direct diagnostic request sent ordinary JSON such as `{ "data": { ... } }`. TanStack Start server functions do not accept that shape directly: the browser wrapper serializes its payload with Seroval and sends the resulting envelope. The framework rejected the malformed request while deserializing/serializing the server-function call, before an AI provider request. This was confirmed by sending the correct Seroval envelope: the same public endpoint returned HTTP 200, including a structured validation error for invalid input and a real Groq response for valid bounded evidence.

The application was also hardened so Quick AI Summary catches validation/provider/runtime failures and returns a normalized plain JSON-safe `PublicAIResult`. Successful results are normalized as well, preventing provider SDK objects, `Error` instances, streams, undefined values or circular data from crossing the server-function boundary.

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
- Staging deployment: repair commit `ed2ec86` is pushed and deployed to Worker `share-barabara-staging`, Cloudflare version `1831b2fa-33c1-46cb-94da-c13d09a5258c`. Existing bindings were preserved; no production deployment or migration was performed.
- Staging live smoke: `npx wrangler secret list --name share-barabara-staging` confirms the names `GROQ_API_KEY` and `XAI_API_KEY` without exposing values. A correctly serialized signed-out request returned HTTP 200 with a real Groq-generated summary grounded in supplied published-style evidence; an invalid request returned HTTP 200 with structured `invalid_request`. The direct test did not use an authenticated browser or a database-resolved article UUID.

## Remaining acceptance checks

Run representative published article, alert and report flows on staging, with featured and fallback source content. Verify browser rendering, the sign-in return path, signed-in contextual chat, desktop/mobile layout, and authorization boundaries. The remaining live blocker is an authenticated staging browser/session for UI and role acceptance, not secret configuration. Do not run migrations or change Task 70 objects or demonstration advertisements.
