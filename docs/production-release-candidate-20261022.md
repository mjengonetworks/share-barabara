# Production release candidate — 2026-10-22

Status: **Deployed to production; acceptance testing remains open**.

## Baselines

- Production Worker before release: `share-barabara`, Cloudflare version
  `d5c96a2a-9cd6-4a8f-b21b-346449e5ceea`, serving commit `70a67c7`.
- Production deployment: commit `9b3fa93d447fc14e2b77fae8bd765163e9289`,
  Cloudflare version `79645807-c816-4fc8-bb93-09f262ca8970`, created at
  `2026-10-22T09:03:19Z`.
- Latest verified staging Worker: `e6e87490-ef4a-4f70-b0f1-669048655bd1`,
  with the verified server-function repair and Vite 7.3.7 toolchain.
- Candidate branch: `release/production-20261022`.
- Release documentation tip before the deployment update: `9b3fa93`.

## Included

- Editorial Batches 1–3 and the verified AI server-function/Vite repair.
- Admin Generate and Auto-Populate workflows, public Quick AI grounding and
  structured error handling, and contextual chat handoff code.
- Task 41.8 bounded homepage discovery fields.
- Task 45 upstream content-type validation.
- Task 56 shared public social-link allowlisting.
- Task 51 and Task 24 readiness documentation/tests.
- Existing sharing, canonical metadata, content, advertising and payment code
  from the production baseline.

## Explicit exclusions

- The accident-report draft migration is excluded and was not executed.
- Live SearXNG integration is explicitly PENDING; no infrastructure or provider
  configuration is included.
- Task 70 database objects, demonstration advertisements and unrelated changes
  are excluded.

## Approval and rollback

Production deployment requires explicit owner approval after the candidate build,
regression suites, artifact registration check and binding-name audit pass. The
rollback target is the previous production Worker version
`d5c96a2a-9cd6-4a8f-b21b-346449e5ceea`.

## Validation evidence

- Relevant regression suite: **130/130 passed**.
- `bun install --frozen-lockfile`: passed; Vite resolved to **7.3.7**.
- `bun run build`: passed; Cloudflare Nitro artifact generated.
- Deployable Worker server-function registration test: passed.
- Production secret-name audit: `GROQ_API_KEY`, `XAI_API_KEY`, and existing
  VAPID secret names present; values were not read.

## Production acceptance evidence

- Public smoke checks: `/`, `/news`, `/alerts`, `/reports`,
  `/infrastructure-issues`, `/campaigns`, `/statistics`, `/feed` and `/search`
  all returned HTTP 200.
- Published article SSR metadata: `og:title`, `og:description`, `og:image`,
  `og:url`, `twitter:card`, `twitter:image` and matching canonical URL were
  present in the initial HTML. The featured image was absolute, public and
  returned HTTP 200 with `image/webp`.
- Worker bindings remained `AI_RATE_LIMITER`, `ASSETS`,
  `DEPLOYMENT_ENV=production` and `WEB_PUSH_ENABLED=true`; secret names were
  confirmed without reading values.
- A short post-deploy error tail observed no error events. Browser clipboard,
  browser-rendered Quick AI, authenticated admin AI/publishing, contextual
  chat handoff and responsive visual acceptance are still pending because no
  browser session was available. Direct CLI server-function probing received
  an edge HTTP 403 and is not evidence of a provider failure.
- Save Draft remains migration-dependent and Live SearXNG remains pending.

## Acceptance update — Quick AI edge blocker

On 2026-10-22, the published article page returned HTTP 200 and retained its
server-rendered AI surface. An ordinary JSON POST to the Quick AI server
function reached the Worker and returned the expected serialized `Seroval Error
(step: 3)` for a malformed request. A locally generated Seroval envelope using
the same client protocol and a published article UUID received a plain
Cloudflare HTTP 403 (`Server: cloudflare`, `Forbidden`) before a serialized
application response. This is evidence of an edge/WAF or browser-access
condition, not evidence of a successful Groq call. Browser access was
unavailable, so Quick AI, authenticated admin AI, Sign in to Chat, Copy Link
click behavior and responsive acceptance remain pending. No speculative hotfix
was made.

## Acceptance update — signed-out Quick AI verified

A correctly generated Seroval request with no cookies/session context and the
published article UUID `d7aa6440-9544-4f70-9479-98aba3527cdf` returned HTTP 200
at `2026-10-22T09:15:11Z`, with `x-tss-serialized: true`,
`provenance: share_barabara`, and a grounded 6,209-byte answer. This verifies
the live signed-out Worker-to-Groq path. The earlier 403 at
`2026-10-22T09:09:43Z` had Ray ID `a4e75d602f1ab14b-LOS`, plain Cloudflare
`Forbidden`, `Content-Type: text/plain`, and no application serialization
header; it was not reproducible. Cloudflare Security Events access is not
available in this session, so the exact rule/action remains owner verification.
Browser rendering and authenticated acceptance remain open.

## Production AI UI hotfix

Commit `73b35fe` adds the auth-loading gate and shared contextual AI controls:
signed-out users receive a prominent `Sign in to Chat` button and explanation;
authenticated users receive `Continue Chatting` while retaining the composer.
Focused AI/security/editorial tests pass **28/28** and the Bun/Vite 7.3.7
production build passes. The hotfix was deployed as Worker
`2daa3dbf-7f2c-419c-8f13-5ee8d3dd2b53`; the affected report route returned
HTTP 200 and its served bundle contains both new labels. Browser login-return,
responsive and authenticated admin Generate/Auto-Populate acceptance remain
unverified because no browser/session surface is available.
