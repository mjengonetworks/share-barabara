# Share Barabara staging and release workflow

The permanent review environment is `https://staging.sharebarabara.co.ke`.
It is a separate Cloudflare Worker (`share-barabara-staging`) from the
production Worker (`share-barabara`).

## Release flow

```text
feature/*
  -> focused tests, full tests, build, diff/security review
  -> staging
  -> https://staging.sharebarabara.co.ke
  -> user visual/functional review
  -> explicit approval for this exact staging candidate
  -> main
  -> https://sharebarabara.co.ke
  -> live verification
  -> explicit user acceptance
```

Staging review is not production release. A passing test suite or staging
approval is not production approval. Future Codex runs must not deploy `main`
or production unless the user explicitly approves releasing the relevant
staging candidate.

## Status meanings

- **PENDING** — not production-live, including work deployed only to staging.
- **TESTING** — production-live and awaiting explicit user acceptance.
- **COMPLETED** — production-live and explicitly accepted by the user.

## Safety boundaries

- Staging and production are separate Worker services and custom domains.
- Staging has no scheduled trigger. Its scheduled handler also exits if invoked,
  so it cannot run the Incident Source scheduler or push dispatcher.
- Staging disables web-push dispatch. Other application writes and integrations
  must be reviewed per candidate.
- Staging initially uses the same Supabase project as production. Database and
  mutable data are **not isolated**: staging writes can affect real production
  data. Do not create test records or run destructive/admin actions casually.
- No Supabase migrations are part of a staging deployment.
- Staging emits `noindex, nofollow`, serves a disallow-all `robots.txt`, and
  shows `STAGING · SHARED DATA`. Production has none of these staging markers.

## Commands

```text
npm run build:staging
npm run deploy:staging
```

Production remains an explicit operation:

```text
npm run deploy:production
```

Only run that production command after explicit approval for the exact staging
candidate, then perform live verification and await acceptance.
