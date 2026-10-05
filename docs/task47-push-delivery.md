# Task 47: Push delivery runtime configuration

Task 47 uses the existing Cloudflare Worker scheduled handler and Supabase
service-role client. The migration is intentionally not executed by the
application and must be reviewed/applied separately.

Required Worker bindings/secrets:

- `SUPABASE_URL` — the Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — the server-only Supabase service-role key.
- `WEB_PUSH_ENABLED=true` — enables the scheduled consumer.
- `WEB_PUSH_VAPID_PUBLIC_KEY` — base64url P-256 VAPID public key.
- `WEB_PUSH_VAPID_PRIVATE_KEY` — base64url 32-byte P-256 VAPID private key.
- `WEB_PUSH_VAPID_SUBJECT` — an `https:` URL or `mailto:` contact value.

Required browser build variable:

- `VITE_WEB_PUSH_ENABLED=true`.
- `VITE_WEB_PUSH_PUBLIC_KEY` — the same VAPID public key as the Worker binding.

Never put the private key or service-role key in `VITE_*` variables, the
service worker, client bundles, logs, or committed files. The cron schedule
is configured in `wrangler.jsonc`; each run claims at most 25 jobs and the
database claim function prevents concurrent delivery of the same leased job.
