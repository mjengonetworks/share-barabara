# Editorial AI Functional Acceptance Matrix

Status: Deployed — Functional Acceptance Pending

Production baseline: Worker `09634464-d413-496f-816b-c4d02b179bcb`, deployed code `7f3f4e334ddb11ffee8666d2ab63cd0df0de8bf7`.

## Required access

The owner must provide an authorized browser session already signed in to the Share Barabara production admin CMS, with an editor/moderator role permitted to open all five editors. Do not share passwords, API keys or session tokens. The session must be able to reach `https://sharebarabara.co.ke/admin` without an authentication error. Provider credentials remain server-side; no provider key is needed in the browser.

## Draft-only matrix

Run each action with non-sensitive, clearly fictional draft text such as “Acceptance test only — do not publish.” Do not click Save, Save & publish, Publish, or any persistence control. For Update Existing, open an existing record only for review, add a harmless unsaved note, and verify that the saved values are preserved in the proposal; discard the page afterward.

| Content type | Generate with Grok | Auto-Populate with Groq | Auto-Populate with Grok | Update Existing with Grok |
| --- | --- | --- | --- | --- |
| News & Articles | Open Add Article; submit source; verify editable title/body/SEO proposal | Verify extraction into supported article fields | Verify same fields and provider label | N/A on new Article; confirm no Update action is shown |
| Accident Reports | Open Add Report; include an ISO `occurred_at`; verify editable proposal | Verify `occurred_at` and nullable casualty values | Verify same, with unknown values still null/blank | Open an existing report; verify only intended supported fields change |
| Alerts | Open Add Alert; verify editable advisory proposal | Verify hazard, county, road and severity mapping | Verify same mapping | Open an existing alert; verify summary and existing values are preserved |
| Campaigns | Open Add Campaign; include ISO datetime source; verify date-only editor values | Verify location, description and date-only fields | Verify same mapping | Open an existing campaign; verify only intended fields are proposed |
| Infrastructure Issues | Open Add Issue; verify supported issue fields | Verify road, county, authority and structure mapping | Verify same mapping | Open an existing issue; verify geographic values are preserved/gated |

## Acceptance checks for every cell

1. Confirm the displayed provider and action label are correct.
2. Confirm loading disables duplicate requests and the editor remains usable after completion.
3. Confirm proposals are editable and are not saved automatically.
4. Change one existing field while the request is in flight; confirm the AI result does not replace that changed value.
5. Submit malformed/insufficient source text; confirm the error identifies authentication, provider, retrieval or field/schema failure and existing values remain unchanged.
6. Confirm null/unknown values remain blank or null and are never converted to zero, false or invented facts.
7. Record browser console errors, failed network requests, request status, displayed diagnostics and provider/action observed. Do not capture secrets or sensitive editorial content.
