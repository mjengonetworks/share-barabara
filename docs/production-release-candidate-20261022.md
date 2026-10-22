# Production release candidate — 2026-10-22

Status: **Awaiting explicit owner approval; not deployed**.

## Baselines

- Production Worker: `share-barabara`, Cloudflare version
  `d5c96a2a-9cd6-4a8f-b21b-346449e5ceea`, serving the production candidate
  commit `70a67c7`.
- Latest verified staging Worker: `e6e87490-ef4a-4f70-b0f1-669048655bd1`,
  with the verified server-function repair and Vite 7.3.7 toolchain.
- Candidate branch: `release/production-20261022`.
- Candidate source tip before this documentation update: `21ad326`.
- This candidate is not deployed; the final documentation commit will be the
  release-candidate tip presented for approval.

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
