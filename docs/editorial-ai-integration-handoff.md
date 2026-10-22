# Editorial redesign and AI integration handoff

Status: TESTING / UNIFIED STAGING CANDIDATE READY. No staging or production deployment was performed from this integration branch.

## Compatibility audit

- Current staging Worker reported by the owner: `d399af90-e933-4239-b637-95ba2111b1cf`. A read-only Wrangler deployment audit found a newer staging deployment, `1831b2fa-33c1-46b2-9c4e-9efb225f99c6`, plus later secret-change versions. This is evidence of another staging deployment after the reported baseline, so this candidate was not deployed over it.
- The current staging deployment was built from the editorial Batch 3 line and does not contain AI commits `607568e` or `e621d58` in its source ancestry.
- The clean integration branch is `integration/editorial-ai-acceptance` and contains the editorial Batch 1–3 line plus the reviewed AI commits `16a552b`, `b839ae2`, `53d3417`, `6963640` and `c2f0e8e`.
- The remaining AI release-line commits are deployment-status documentation only or are outside this candidate. They remain separate until the AI instance confirms no concurrent edits are in progress.
- `c2f0e8e` is the integration-branch equivalent of verified repair `ed2ec86`; the implementation matches the verified normalization and safe-error behavior. Documentation commit `6afdd5e` remains on the release line and was not blindly cherry-picked because this branch has its own integration handoff records.

## AI changes included

The integration branch includes the administrator Alert/Report AI workflow repair, role-gated controls, non-destructive field application, report publishing safeguards, contextual chat handoff, direct published-context grounding, resolver-failure fallback, bounded alert/report source context, safe Worker-serializable Quick AI responses, and the associated static regression tests. It also includes the review-only accident-report draft migration file. That migration is not executed by this work and must remain a separate database approval step.

The approved public sharing toolbar was not changed by these cherry-picks.

## Bindings and secrets

Repository configuration confirms the required binding names and AI code paths: `AI_RATE_LIMITER`, `GROQ_API_KEY`, and `XAI_API_KEY`. The Wrangler configuration exposes only the non-secret binding/configuration metadata; secret values were not read or logged. Current staging secret presence cannot be independently confirmed from this audit, and the existing AI handoff records provider-backed acceptance as blocked until the staging secrets are configured out of band.

No production configuration, database object, Task 70 demonstration advertisement, or hosted data was changed.

## Visual acceptance checklist

Run with browser screenshots or viewport interaction before moving any batch out of TESTING:

| Route                                                       | Desktop 1440/1024                                                              | Tablet 768                                       | Mobile 390/360                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------- |
| `/news`, `/news/$slug`                                      | Hero/list density, lead/supporting hierarchy, 70/30 detail shell, ads, toolbar | Two-column collapse and readable article measure | Single-column order, gutters, no overflow, compact toolbar |
| `/alerts`, `/alerts/$alertId`                               | Severity/status prominence, timestamp, sidebar and recommendations             | Facts remain above recommendations               | Status/location readable; no clipped urgency data          |
| `/reports`, `/reports/$reportId`                            | Incident facts, verified casualty semantics, map, sidebar                      | Map and facts remain usable                      | Unknown casualties stay unknown; no horizontal scroll      |
| `/campaigns`, `/campaigns/$slug`                            | Campaign status/date/action hierarchy and related content                      | Card and sidebar collapse                        | Natural-height cards and actions                           |
| `/infrastructure-issues`, `/infrastructure-issues/$issueId` | Issue facts, recommendations and sidebar                                       | No stretched desktop layout                      | Compact content flow                                       |
| `/statistics`                                               | Charts/map use full available width without editorial-card forcing             | Functional controls remain usable                | Charts/maps do not overflow                                |
| `/feed`                                                     | Feed density, media previews and permissions                                   | Responsive feed controls                         | Signed-in/out visibility preserved                         |
| `/search`                                                   | Result spacing, filters and preview consistency                                | Narrow filter layout                             | No clipped result rows                                     |

Across every route check dark mode, focus states, image fallbacks, canonical/OG metadata, newsletter placement, paid-ad eligibility, `YOUR AD HERE` fallback, recommendation deduplication and alert/report data integrity.

## Verification limits and blockers

- No browser or screenshot tooling was available in this environment, so visual acceptance is not claimed.
- No authenticated staging session was available, so admin AI controls and role-denial behavior remain unverified live.
- Combined regression suites pass: 43/43 tests across AI summary, AI security, admin AI workflow, editorial AI, platform editorial layout and sharing coverage. `npm run build` passes.
- The unified candidate has not been deployed. Before deployment, confirm the AI instance has no competing Worker deployment and preserve the existing staging bindings and secret references.
- Provider-backed AI generation cannot be accepted until staging secret presence is confirmed out of band; configured secret names are not evidence that live provider calls work.
- The review-only draft migration was not run; Save draft remains database-dependent.
- Existing targeted lint findings remain in unrelated Feed/Statistics `any` usage; they are not introduced by this integration.
- Read-only smoke checks against the current staging hostname returned HTTP 200 for `/news`, `/alerts`, `/reports`, `/campaigns`, `/infrastructure-issues`, `/statistics`, `/feed` and `/search?q=road`; these checks do not prove that the integrated candidate is deployed.
- Quick AI Summary provider execution was not accepted live: current staging is owned by a newer deployment, browser interaction/authentication was unavailable, and secret values were not read.
- The integration branch is not production-ready or deployable without review of the later AI branch changes and the above acceptance gates.
