# Share Barabara external retrieval architecture

## Audit snapshot

| Surface | Server path | Provider | Local evidence | Persistence/boundary |
| --- | --- | --- | --- | --- |
| Public Share Barabara AI | `publicAIChat` | Groq | Published news, active alerts, approved reports | Authenticated; chat rows are user-owned by RLS |
| Quick AI Summary | `quickAISummary` | Groq | Same public resolver | Public request; no private content is accepted |
| Header AI | `HeaderShareBarabaraAI` -> `publicAIChat` | Groq | General public resolver | Authenticated chat |
| Authenticated chat | `publicAIChat` | Groq | Server-resolved context plus persisted history | Composite thread/message ownership and RLS |
| Editorial Generate/Update | `editorial.functions.ts` | xAI/Grok | Editorial server inputs | Moderator/editor/admin authorization |
| Editorial Auto-Populate | `editorial.functions.ts` | Groq | Editorial server inputs | Moderator/editor/admin authorization |

Provider routing is intentionally unchanged: Editorial Generate = xAI/Grok, Editorial Auto-Populate = Groq, Editorial Update Existing = xAI/Grok, and Public Share Barabara AI = Groq. External retrieval is a separate capability and never changes this matrix.

## Retrieval contract

`searchExternal({ query, maxResults, topic, freshness, allowedDomains, blockedDomains })` is server-only. `EXTERNAL_SEARCH_PROVIDER` selects an adapter; the currently supported adapter names are `tavily` and `exa`, but neither is selected by default. Their credentials are `TAVILY_API_KEY` and `EXA_API_KEY` respectively. No `VITE_*` variable is used.

The public flow is local resolution -> deterministic sufficiency assessment -> optional external retrieval -> validation/ranking -> evidence bundle -> Groq -> citation ID filtering. Local evidence remains preferred. A small local result set is not, by itself, a reason to search. Current/latest language, absent direct evidence, or an unrelated local match can trigger the controlled fallback.

External results are untrusted evidence. Source classes and verification state are preserved; social sources are marked `investigate`, never authoritative by default. The LLM receives source IDs only. URLs and source metadata come from validated server results, and the browser receives only approved citation objects.

No external search result is simulated when configuration is absent. The runtime returns `external_search_unavailable`; provider failures, invalid results, rejected sources, and rate limits remain separate states.

## Security and privacy

Queries are normalized, bounded, and stripped of control characters. The retrieval layer does not fetch user-provided URLs. Result URLs must be HTTP(S), have no embedded credentials, and cannot target localhost, loopback, private, link-local, or internal destinations. Provider-specific payloads remain server-side. Only the minimum question/query is sent; profile, email, admin, draft, ownership, and authentication data are not included.

## Provider comparison (selection intentionally deferred)

| Consideration | Tavily | Exa |
| --- | --- | --- |
| Current/news search | Search API has an explicit news topic and time-range shape | Search API supports web search and date-oriented options through its request model |
| Metadata | URL, title, snippet/content fields can be normalized | URL, title, highlights/content fields can be normalized |
| Extraction | Search response can include extracted context depending on request | Highlights/contents can be requested separately in the search payload |
| API shape | Straightforward server-side HTTP API | Straightforward server-side HTTP API |
| Monitoring suitability | Requires project-level review of freshness, quotas, and repeated polling cost | Requires project-level review of freshness, quotas, and repeated polling cost |
| Public fallback suitability | Fits the interface if reviewed and configured | Fits the interface if reviewed and configured |
| Pricing and rate limits | Not verified in this repository; confirm current vendor terms before selection | Not verified in this repository; confirm current vendor terms before selection |
| Credential | `TAVILY_API_KEY` | `EXA_API_KEY` |

This is an integration comparison, not a provider recommendation. The next task may reuse this retrieval contract for monitoring, discovery, source verification, duplicate/merge, and statistics agents without creating separate search implementations.
