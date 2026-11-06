# Isolated staging environment plan

Status: preparation only. No Supabase project was created, no migration was executed, and no Worker was deployed.

## Required resources

| Resource | Staging requirement |
| --- | --- |
| Cloudflare Worker | Existing `share-barabara-staging` only |
| Domain | Existing `staging.sharebarabara.co.ke`, custom-domain route only |
| Supabase project | New project, separate from production, with a new project URL and publishable key |
| Browser configuration | `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the staging project only |
| Worker configuration | `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the staging project only; service-role value must remain a Worker secret and never enter the browser build |
| Environment | `DEPLOYMENT_ENV=staging`, `WEB_PUSH_ENABLED=false`; no cron triggers |
| AI | Staging-only `GROQ_API_KEY`/`XAI_API_KEY` only if provider review is required; otherwise omit them |
| External side effects | Omit `RESEND_*`, VAPID keys, payment credentials, production webhooks and production analytics credentials |
| Cloudflare bindings | `ASSETS`; a staging-specific rate-limit namespace is preferred instead of reusing production namespace `1001` |

## Migration assessment

The repository contains 87 timestamp-ordered migrations. They must be applied to the new Supabase project in filename order using Supabase's migration tool, after linking the new project. Do not point the CLI at the production project.

Special handling is required for:

- The initial schema and later additive review migrations, which must be applied as one ordered history.
- Seed-heavy migrations such as `20260818100110_*`, `20260828120000_*` and `20260830090000_*`, which insert demo/public rows and, in one case, auth identities. These are acceptable only in the new empty staging project after review; they must never run against production.
- `20261030210000_editorial_feed_sources_review.sql` and subsequent feed/media migrations, which are required for the unified feed and protected media tables.
- Review migrations that create scheduler/notification structures. They may be applied to staging for schema compatibility, but scheduling and delivery must remain disabled at the Worker and secret-configuration layers.

No migration creates the required Storage buckets in the repository. The staging project must separately create `media` (public editorial media) and `feed-media` (private community media), then apply staging-only storage policies matching the application paths. Do not copy production objects or private media.

## Sanitized staging data plan

Use only synthetic, non-personal rows in the new project:

- Three published articles, two active alerts, two approved accident reports, two approved infrastructure issues, two current campaigns and three featured videos.
- Three approved community posts and two published administrator updates with synthetic authors.
- Draft, pending-review, rejected, hidden and soft-deleted rows for negative visibility tests.
- Synthetic profiles and roles only; no production users, emails, tokens, avatars or protected media.
- Synthetic media objects in the two staging buckets, including one missing/invalid image reference to exercise fallbacks.

The dataset must be inserted only after the new project is migrated and only through a staging seed process approved by the owner. It is not part of this preparation commit.

## Isolation checklist before deployment

1. Confirm the Supabase hostname/project ID differs from production.
2. Confirm browser bundle contains only the staging URL and staging publishable key.
3. Confirm Worker secret names point only to staging values; do not copy production service-role, VAPID, Resend, payment or webhook secrets.
4. Confirm `wrangler.json` has no cron trigger and has `DEPLOYMENT_ENV=staging`, `WEB_PUSH_ENABLED=false`.
5. Confirm `staging.sharebarabara.co.ke` is the only route and the Worker name is `share-barabara-staging`.
6. Confirm Storage bucket names and policies belong to the staging project.
7. Confirm anonymous public reads for the supported content sources.
8. Confirm authenticated staging writes affect only staging and cannot reach production.
9. Confirm email, notification, payment, push and scheduler side effects are disabled or use test-only providers.
10. Run negative mutation tests and verify production row counts, deployment IDs and configuration are unchanged.

## Owner actions required

Create the separate Supabase project and provide its project URL, publishable key and server-only service-role secret through the approved secret channel. Configure Auth redirect URLs for `https://staging.sharebarabara.co.ke`, create the two staging Storage buckets/policies, and approve the isolated seed dataset. No production credential is reusable for this environment.
