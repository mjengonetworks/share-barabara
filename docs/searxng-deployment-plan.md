# SearXNG deployment plan

This is a readiness plan only. No SearXNG instance is provisioned or configured by Task 24.11.

## Separation and access

Run SearXNG separately from the Share Barabara application runtime, preferably as a small Docker/OCI workload on a maintained host or service. This keeps search-engine dependencies, resource spikes, and updates away from the web application. Start with roughly 1–2 vCPU and 1–2 GB RAM for a modest low-volume deployment, then measure CPU, memory, response time, and engine failures before resizing. Actual requirements depend on enabled engines and concurrency.

Expose it through HTTPS and a dedicated subdomain only if an external route is genuinely needed. A private network endpoint is preferred when the Share Barabara server can reach it. Otherwise use firewall allowlisting, an authenticated reverse proxy or API gateway, and restrictive rate limits. Do not publish an unauthenticated general-purpose SearXNG endpoint. The Share Barabara application should use `SEARXNG_BASE_URL` as server configuration; credentials, if later required, remain in `SEARXNG_AUTH_TOKEN` and `SEARXNG_AUTH_HEADER` on the server.

Use DNS for a dedicated search hostname, TLS certificates with renewal monitoring, and a firewall that permits only the application egress path plus administrative access. Cloudflare can provide DNS, TLS, WAF, and rate limiting when the deployment is publicly routed, but proxying must be tested with the JSON API, timeout behavior, and any authentication headers. Do not treat Cloudflare as a substitute for origin firewall rules.

## SearXNG configuration

Enable the JSON format and use the `/search` API. Restrict request rate and result count at the application and proxy layers. Configure only reviewed engines and categories; avoid broad defaults that create excessive duplication, scraping load, or noisy results. Keep engine credentials in the SearXNG secret store if an engine requires them; never copy them into Share Barabara requests.

Logging should avoid full user queries where possible, and must not contain tokens, profiles, chat IDs, private content, or editorial drafts. Retain operational metrics and failure counters for a bounded period. Plan regular image/configuration updates, export or back up the reviewed configuration (not transient caches), and test rollback. Health checks should verify process readiness and a bounded JSON API request; they should not depend on a particular news story.

The application must tolerate unreachable, timed-out, rate-limited, invalid, empty, or all-rejected responses. Recovery is to restore the service/configuration or temporarily select another reviewed provider; no agent should bypass the shared retrieval interface.

## Reachability and future reuse

Share Barabara reaches the service only through the configured base URL and sends the minimum query plus supported search options. The future Task 25 agents—monitoring, accident, alert, infrastructure, verification, and statistics—reuse `searchExternal`; they do not call SearXNG directly. A live endpoint, reviewed engine configuration, firewall/TLS policy, and operational owner are required before those agents can be enabled.

## Future agent query strategy

These are retrieval-layer query patterns, not agent implementation instructions:

- Accident discovery: `location + crash/accident/collision`, with a recent freshness range.
- Alert discovery: `road/location + closure/diversion/flooding/roadworks`, with freshness.
- Infrastructure: `agency/project/road + construction/update/tender/opening` and a relevant period.
- Verification: `specific event/entity + corroborating terms`, preferably with source/domain preferences.
- Statistics: `authority/dataset + road safety statistics + relevant period`.

Each agent should pass a bounded query and retrieval options to `searchExternal`, inspect normalized evidence and source classification, and apply its own corroboration policy. It must not forward identity, thread, profile, editorial, or private-content fields.

## Starting engine/category recommendation

Begin with a small, reviewed set rather than every available engine:

- General web search: one or two reliable general engines, selected after checking Kenya coverage, availability, and rate limits.
- News: a limited news category with engines that consistently return original publisher URLs and publication dates.
- Kenya and authority coverage: prioritize official Kenyan government/authority sites through domain preferences or query terms, including transport and road agencies, county authorities, and emergency/public-safety sources.
- Global coverage: retain a small general/news fallback for major international road and infrastructure developments.

Avoid enabling engines known to produce mostly duplicates, unstable HTML-only results, low-quality aggregators, or aggressive rate limits until tested. SearXNG ranking and engine count are not source credibility; Share Barabara's source classifier and validation remain authoritative. Review duplicate rate, latency, HTTP errors, freshness, and original-domain quality before adding engines.

## Operational checklist

Before connecting production traffic, an operator must provide a live HTTPS/private endpoint, JSON API configuration, DNS/firewall/TLS controls, reviewed engines/categories, rate limits, health monitoring, backup/update ownership, and—only if needed—an authentication mechanism. Then configure `EXTERNAL_SEARCH_PROVIDER=searxng` and `SEARXNG_BASE_URL` server-side, run mocked and live verification, and confirm the application can fail closed.
