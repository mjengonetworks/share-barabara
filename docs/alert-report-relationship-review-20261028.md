# Alert-to-Report relationship review — 2026-10-28

Status: **BLOCKED pending a reviewed relationship model.** This review is
read-only. No database migration was created or executed, and no production
records were changed.

## Findings

| Requirement | Repository evidence | Result |
|---|---|---|
| Link an existing Alert to its corresponding Accident Report | `alerts` has no canonical report foreign key or link table; the public and admin Alert workflows do not persist one | **Not supported** |
| Use canonical incident identity | `accident_reports.duplicate_of_report_id` supports reviewed report-to-report merges only; it does not identify an Alert as the same incident | **Reports only** |
| Prevent double counting | Statistics use approved `accident_reports` and exclude rows with `duplicate_of_report_id`; Alerts are intentionally not merged into report totals | **Safe fail-closed behavior** |
| Editor review | `incident_duplicate_suggestions` is staff-readable and reviewable, but a suggestion is not a persisted Alert→Report relationship and has no canonical-link action | **Partial; no link review workflow** |
| Correct an incorrect link | `merge_duplicate_report` can reject a duplicate Report into an approved canonical Report; there is no Alert-link correction workflow | **Reports only** |
| Preserve existing records | Existing report merges are review-gated and retain the source row as rejected; no Alert records are rewritten by the current workflow | **Preserved** |
| RLS and ownership | Duplicate suggestions are editor-scoped with reviewer self-attribution; report merge is an editor-only `SECURITY DEFINER` function. A future cross-content link must preserve these boundaries | **Existing controls preserved; future design required** |

Similarity and duplicate suggestions are evidence for review only. They must
not be treated as canonical identity, and title, date, location, or text
similarity must not automatically collapse an Alert into a Report.

## Safe migration boundary

The smallest reviewed design is an additive `incident_content_links` table
with a canonical approved `report_id`, `content_type`, `content_id`, review
status, reviewer, timestamps, correction/audit fields, a unique content
identity constraint, and RLS. It must support only confirmed links, reject
self-links and non-approved canonical Reports, and expose editor-only review
and correction operations. Statistics may consume confirmed links only after
that schema and its production data are reviewed.

Dependencies to verify before any migration approval:

- existing `alerts` and `accident_reports` columns, publication statuses and
  ownership policies;
- `public.has_min_role`, `public.auth.uid()` and the existing editor/admin role
  model;
- approved-report uniqueness and the existing
  `duplicate_of_report_id` merge semantics;
- audit/history and notification behavior for link, unlink and correction;
- a production backup and a read-only catalog/RLS audit.

The proposal must remain separate from the already review-only
`20261005120000_accident_duplicate_merge_review.sql` and
`20261006110000_incident_duplicate_suggestions_review.sql` migrations. Do not
replay or apply either migration as a substitute for the missing relationship
model.

## Production and ancestry evidence

- Candidate branch: `fix/editorial-ai-source-fidelity`.
- Candidate HEAD at review: `b8048dcae76d41924ff3ba9aad1e524c7e07c981`.
- The candidate ancestry includes the reviewed report editor/statistics line
  through `82dd9f1` and the local production baseline represented by Worker
  `cb214516-732d-47c0-9560-63ff7c34005e`.
- Read-only Wrangler verification found the active production Worker
  `share-barabara` at 100% on version
  `149c9345-8d0e-44d7-a898-086fe95aab11`, created 2026-10-28 20:25 UTC.
  Cloudflare reports its source as `Unknown (version_upload)` and exposes no
  Git SHA, so that deployment cannot be reconciled to a repository commit by
  metadata alone. No competing branch was rebased, reset, or overwritten.

## Acceptance boundary

Automated review confirms the fail-closed statistics behavior, report merge
authorization, duplicate-suggestion RLS, record preservation, and migration
readiness checks. Browser/authenticated acceptance could not be attempted: the
available browser inventory contained no browser and creating the in-app
browser returned `Browser is not available: iab`. A user-provided authorized
browser session plus a reviewed relationship migration is required before
claiming Alert→Report linking acceptance.
