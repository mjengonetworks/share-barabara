# AI administrator workflow follow-up

Status: TESTING / VERIFICATION. Repository implementation is complete for the available code paths. The latest contextual-chat repair is deployed to staging at commit `e621d58`, Worker version `8c1d63a2-2a07-46cb-94da-c13d09a5258c`. Staging acceptance remains dependent on the existing AI secrets and review/application of the related accident-report draft schema migration.

## Migration review: `20261021130000_accident_report_admin_drafts_review.sql`

- Schema change: replaces the existing accident-report status check so it accepts `draft` in addition to `pending`, `approved`, and `rejected`. Existing rows and values are not rewritten.
- RLS change: replaces `reports_insert_own` so owners can insert `draft` or `pending`, while `approved` inserts require `has_min_role(auth.uid(), 'moderator')`. It replaces `reports_read_approved` so approved rows remain public, owners can read their own rows, and moderators can read all rows.
- Data impact: no direct data mutation is present, but the new read policy intentionally exposes an authenticated owner's own non-approved report to that owner. It does not make drafts public.
- Reversibility: not automatically reversible. A rollback would need an explicit SQL change to restore the prior status constraint and policy definitions. Dropping the matching check constraint dynamically also makes rollback dependent on the live constraint name/definition.
- Production effect: because staging and production share Supabase, applying this migration changes production database behavior immediately. It is therefore not to be run as part of Worker deployment or without explicit database approval.
- Without the migration: direct `approved` publishing can work through the existing status constraint and server-side role check. `Save draft` cannot work because `draft` violates the current database check constraint; the UI must remain treated as blocked until the migration is reviewed and applied.

## Secure staging secret commands

Run these from an authenticated deployment shell. Wrangler prompts for each value; do not put values in chat, shell history, source files, or logs:

```text
npx wrangler secret put GROQ_API_KEY --name share-barabara-staging
npx wrangler secret put XAI_API_KEY --name share-barabara-staging
npx wrangler secret list --name share-barabara-staging
```

The list command verifies names only. It does not reveal secret values. The current audit found no staging secrets.

## Supported administrator forms

| Content type | Add New | Edit | Generate | Auto-Populate | Update Existing |
| --- | --- | --- | --- | --- | --- |
| News / Articles | `ArticleForm` in admin Articles | Admin Articles editor | Yes | Yes | Yes |
| Alerts | Shared `AlertForm` in admin Alerts | Admin Alerts editor | Yes | Yes | Yes |
| Accident Reports | Shared `ReportForm` in admin Reports | Admin Reports editor | Yes | Yes | Yes |
| Infrastructure Issues | Existing admin form | Existing admin form | Not supported by the current editorial backend/schema | Not supported | Not supported |
| Campaigns | Existing campaign form | Existing campaign form | Not supported by the current editorial backend/schema | Not supported | Not supported |

The repository contains one editorial `autopopulate` operation, distinct from `generate` and `update`. It uses Groq and the conservative form-completion prompt. Generate and Update Existing use xAI/Grok. No second backend Auto-Populate contract exists in the repository; no superficial duplicate was introduced. The two existing Auto-Populate placements are now the Add and Edit form workflows for Alerts and Accident Reports, alongside the already-supported Article workflows.

## Repairs

- Restored role-gated AI controls to the shared Alert and Accident Report Add forms. Public users do not see administrator Editorial AI controls.
- Preserved Generate, Auto-Populate and Update Existing on Alert and Accident Report Edit forms.
- Made Generate and Auto-Populate application non-destructive: blank or null model fields do not erase manually entered values. Update Existing remains proposal-based and requires explicit application.
- Corrected Accident Report Add behavior: moderator/editor/admin users see `Publish report` and `Save draft`; public contributors still see `Submit report for review`.
- Hardened `submitAccidentReport`: staff can request `approved` or `draft`, while all non-staff requests are forced to `pending` server-side.
- Added review-only migration `20261021130000_accident_report_admin_drafts_review.sql` to add the `draft` status and matching insert/read policies. It is not executed automatically.

## Provider and prompt contracts

- Generate: xAI/Grok, content-specific editorial prompt, JSON field allowlist.
- Auto-Populate: Groq, conservative field-completion prompt, JSON field allowlist.
- Update Existing: xAI/Grok, current-record baseline plus new evidence, reviewable proposal.
- Supported Editorial AI content types remain Article, Alert and Report. Infrastructure Issues and Campaigns have no established prompt/schema/backend contract and remain explicitly unsupported rather than receiving non-functional buttons.

## Verification

- New workflow regression tests: `tests/ai-admin-workflow.test.mjs`.
- Live provider tests remain blocked by missing staging `GROQ_API_KEY` and `XAI_API_KEY` secrets; no secret values were read.
- Staging smoke check: `https://staging.sharebarabara.co.ke/` returned HTTP 200 with server-rendered HTML. `npx wrangler secret list --name share-barabara-staging` returned no secrets, so provider-backed Generate, Auto-Populate, Update Existing and Quick AI Summary acceptance is still blocked. Required secret names are `GROQ_API_KEY` and `XAI_API_KEY`; values must be configured out of band.
- The staging deployment preserved the existing `AI_RATE_LIMITER`, assets, `DEPLOYMENT_ENV=staging` and `WEB_PUSH_ENABLED=false` bindings. No production deployment was performed.
- Quick AI Summary: code-path and security tests pass. Signed-out generation is intentionally public and content-grounded; provider-backed rendering is blocked by the missing staging Groq secret. The authentication return path now reopens the exact content AI surface and contextual composer after sign-in; live browser acceptance remains pending.
- Quick AI Summary live acceptance: **BLOCKED**. Both secret names are now present, but a real signed-out POST to the deployed public server-function endpoint returned HTTP 500 with `Seroval Error (step: 3)` for both content-scoped and minimal public requests. No summary was accepted as generated, and no fabricated fallback was shown.
- Sign in to Chat: return-path validation and context ownership checks pass in code tests. Live signed-out-to-signed-in and contextual continuation acceptance remains blocked by the live Quick AI 500 and the absence of an authenticated staging browser session.
- Administrator publish and public moderation: server-side role checks and public-pending tests pass; live admin publish, public submission, and unauthorized bypass tests were not claimed because no authenticated staging session was available. Save Draft remains blocked pending migration approval/application.
- Infrastructure Issues and Campaigns: remaining content-type AI integration is DESIGN / NOT IMPLEMENTED. See `docs/ai-content-type-expansion-design.md`; no nonfunctional controls were added.
- Draft publishing acceptance additionally requires review/application of the related migration because the current report status constraint is `pending/approved/rejected`.
- No database migration was executed. Task 70, sharing fixes and demonstration advertisements were not modified.
