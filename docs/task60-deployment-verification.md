# Task 60 — Deployment Verification

## Current state

- Repository `main` and `origin/main` were at `3ee63a11d0021e88fcf14cadfb4c931fd0963634`
  at audit start.
- `wrangler.jsonc` names the Worker `share-barabara`, routes the production custom
  domain, and defines the scheduled trigger.
- There is no repository deployment script in `package.json`.
- Wrangler deployment metadata could not be retrieved in this environment, so the live
  Worker version and deployed Git commit are **UNVERIFIED**.
- Public HTTP 200 confirms reachability only, not code identity.
- Live and local asset hashes differ, so a stale or different deployment remains a
  plausible explanation for missing UI changes.

## Secret bindings

The source expects `GROQ_API_KEY` and `XAI_API_KEY` as server-only bindings. Their values
were not read or logged. The owner reports both production bindings exist; binding
availability in the Worker serving the public domain remains **UNVERIFIED**.

## Safe verification sequence

1. Identify the Cloudflare Worker deployment/version serving the custom domain.
2. Record the Git SHA used by that deployment and compare it with the approved `main`
   commit.
3. Build the approved commit with `npm.cmd run build` and retain the artifact manifest.
4. Confirm production bindings exist by a redacted health/diagnostic path or dashboard
   binding listing, never by printing values.
5. Deploy only after explicit approval, then run editorial AI smoke tests and public UI
   checks.
6. Keep database migration execution separate from this source deployment.

## Do not infer

A successful Git push, local build, HTTP 200, or visible one-page UI change does not prove
that the intended Worker version is live. Push delivery, Feed, Statistics, Recycle Bin,
and other migration-dependent features must remain configuration/schema-gated.
