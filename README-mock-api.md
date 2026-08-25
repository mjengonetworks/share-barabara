# Local mock API (no real database touched)

For testing UI that depends on the pending migration (article submission and
review, votes, notifications, roads, subscriptions, ratings, banner ads,
videos, merch, quote of the day) before that migration is applied anywhere.

## Use it

1. `bun run dev`, then open `http://localhost:8080/?mock=1` once. This flips
   a `localStorage` flag, so it stays on across reloads and navigation until
   you turn it off.
2. A yellow "Mock API active" badge appears at the top of every page while
   it's on.
3. **Click links to navigate, don't retype the URL or hard-refresh.** This is
   a server-rendered app: the very first load (and any hard refresh, or
   typing a URL directly) fetches its data on the server, before the mock
   worker has registered in the browser, so that one render still shows real
   data. Every navigation after that, done by clicking a link inside the
   app, is client-side and correctly hits the mock. Confirmed working this
   way in testing.
4. Turn it off with `http://localhost:8080/?mock=0`.

While active, your account is automatically treated as **admin**, so you can
reach `/moderate` and publish/reject articles regardless of your real role.

## What's mocked vs real

Mocked (fully, in-memory, resets on page reload): `news`, `alerts`,
`accident_reports`, `comments`, `votes`, `notifications`,
`notification_preferences`, `roads`, `subscriptions`, `user_ratings`,
`banner_ads`, `partner_enquiries`, `videos`, `site_quote`,
`quote_submissions`, `merch_items`, `merch_orders`, `news_views`, the
`trending_news` RPC, and `user_roles` reads (always returns admin for
whichever user is signed in).

Still real (Supabase Auth): signing in/up, sessions. You still need a real
account - only the *data* is faked, not authentication.

Everything else (profiles, existing statistics tables, etc.) hits the real
Supabase project as normal, mock mode or not.

## How it works

`src/mocks/handlers.ts` intercepts requests to those tables via
[MSW](https://mswjs.io) and serves them from an in-memory store
(`src/mocks/db.ts`) instead of the network, mimicking basic PostgREST query
syntax (`eq.`, `neq.`, `in.`, `ilike.`, `order`, `limit`). It is not a
complete PostgREST implementation - complex filters may not behave exactly
like the real thing.
