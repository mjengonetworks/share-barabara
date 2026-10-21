# AI administrator workflow follow-up

Status: TESTING / VERIFICATION. Repository implementation is complete for the available code paths. Deployed to staging at commit `607568e`, Worker version `1fd5d006-57b3-47c2-afd4-df496382c0cd`. Staging acceptance remains dependent on the existing AI secrets and review/application of the related accident-report draft schema migration.

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
- Draft publishing acceptance additionally requires review/application of the related migration because the current report status constraint is `pending/approved/rejected`.
- No database migration was executed. Task 70, sharing fixes and demonstration advertisements were not modified.
