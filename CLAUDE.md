# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Share Barabara — a road safety website for Kenya (news, crash statistics, hazard alerts, accident reports, comments). Scaffolded and synced via [Lovable](https://lovable.dev): commits pushed to the connected branch sync back into the Lovable editor. **Do not rewrite published git history** (force push, rebase/amend/squash already-pushed commits) — it breaks Lovable's sync and can lose project history.

## Commands

Package manager is **bun** (see `bun.lock`, `bunfig.toml`), though scripts also work with npm.

- `bun run dev` — start dev server (vite dev)
- `bun run build` — production build
- `bun run build:dev` — development-mode build
- `bun run preview` — preview a production build
- `bun run lint` — eslint over the whole repo
- `bun run format` — prettier --write .

There is no test suite configured in this repo currently.

`bunfig.toml` enforces a 24h supply-chain guard (`minimumReleaseAge`) on new dependency versions; only a short allow-list of `@lovable.dev/*` packages bypasses it. Adding another exclusion requires user confirmation.

## Architecture

**Stack**: TanStack Start (file-based routing via TanStack Router) + React 19 + Vite, styled with Tailwind v4 and shadcn/ui (`new-york` style, see `components.json`). Backend is Supabase (Postgres + Auth), accessed directly from the client with Row Level Security — there are currently no `createServerFn` server functions in the app; all data access goes through the Supabase JS client under RLS policies.

### Routing (`src/routes/`)

File-based routing per `src/routes/README.md` — read it before adding routes. Key points: no `src/pages/` or Next/Remix conventions; dynamic segments are bare `$` (`u.$userId.tsx`); `__root.tsx` is the only root layout and must keep `<Outlet />`; `routeTree.gen.ts` is auto-generated, never hand-edit it.

- `_authenticated/route.tsx` is a pathless layout route that gates its children: `beforeLoad` calls `supabase.auth.getUser()` and redirects to `/auth` if unauthenticated (`ssr: false`). `dashboard.tsx` and `moderate.tsx` live under it.
- Public routes (`index`, `news.*`, `alerts`, `reports`, `safety`, `statistics`, `u.$userId`, `auth`) read Supabase directly; write actions additionally check `useRoles()`.

### Auth & Supabase clients (`src/integrations/supabase/`)

Several files here are marked "automatically generated. Do not edit it directly." — treat them as generated/regenerable rather than hand-maintained:

- `client.ts` — browser/SSR-shared client (publishable key), session persisted via `previewAuthStorage.ts` (a storage brokered for the Lovable preview iframe). Import as `import { supabase } from "@/integrations/supabase/client"`.
- `client.server.ts` — service-role admin client that **bypasses RLS**. Server-only; must be dynamically imported inside server handlers (`await import(...)`), never imported at the top of a route file or `*.functions.ts` (those ship to the client bundle).
- `auth-middleware.ts` (`requireSupabaseAuth`) / `auth-attacher.ts` (`attachSupabaseAuth`) — a function-middleware pair for validating/attaching a bearer token on TanStack `serverFn` RPCs. Registered globally in `src/start.ts` but not yet consumed by any server function in the app.
- `types.ts` — generated Supabase `Database` types, used as the generic on every `createClient<Database>` call.

`src/start.ts` also wires a CSRF middleware for server functions and a top-level error middleware that renders a fallback error page instead of leaking a raw 500. `src/server.ts` wraps the Nitro/h3 server entry to catch cases where h3 swallows an in-handler throw into an opaque `{"unhandled":true}` JSON 500 and replaces it with the same rendered error page.

### Auth/roles on the client

- `useAuth()` (`src/hooks/useAuth.ts`) — subscribes to `supabase.auth.onAuthStateChange` for session/user state.
- `useRoles()` (`src/hooks/useRoles.ts`) — fetches the current user's rows from `user_roles`; exposes `isAdmin`, `isModerator`, `canReview` (admin or moderator). `useRoleLabels(ids)` / `primaryRoleLabel(roles)` do the same for displaying other users' roles (e.g. bylines, `moderate.tsx`).

### Database (`supabase/migrations/`)

Migrations are the source of truth for schema — read them rather than assuming. Tables: `profiles`, `user_roles` (enum `app_role`: `admin` | `moderator` | `member`), `news`, `alerts`, `accident_reports`, `comments` (polymorphic via `entity_type`/`entity_id`), and stats tables (`yearly_stats`, `county_stats`, `victim_stats`, `monthly_stats`, `cause_stats`, `vehicle_stats`, `time_of_day_stats`, `road_class_stats`).

Conventions used throughout, follow them for new tables/policies:
- Every table has RLS enabled; public content is readable by `anon`, writes go through explicit policies.
- `public.has_role(user_id, role)` (`SECURITY DEFINER`) is the standard way to check roles in policies — don't inline subqueries against `user_roles`.
- `handle_new_user()` trigger auto-creates a `profiles` row and a default `member` role on signup (`auth.users` insert).
- `touch_updated_at()` trigger keeps `updated_at` current; attach it to any new mutable table.
- Ownership pattern: `*_insert_own`/`*_update_own`/`*_delete_own` policies check `auth.uid() = user_id`, with admins (and moderators, for `accident_reports` review) additionally allowed via `has_role`.
- New migration files are named `<timestamp>_<uuid>.sql` (Lovable/Supabase convention) — don't reuse or renumber existing ones.

### Env vars

`SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` (server) and `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (client, Vite-injected) plus `SUPABASE_PROJECT_ID`/`VITE_SUPABASE_PROJECT_ID`. `.env` is intentionally committed (Lovable Cloud convention) and contains only the publishable key, not a service-role secret. `SUPABASE_SERVICE_ROLE_KEY` (used by `client.server.ts`) is not present in `.env` — it must be supplied via the deployment environment, not committed.

### Path alias

`@/*` → `src/*` (see `tsconfig.json` / `vite-tsconfig-paths`). shadcn/ui aliases in `components.json` mirror this (`@/components`, `@/lib`, `@/hooks`, `@/components/ui`).

### Linting/formatting

ESLint (`eslint.config.js`) bans importing the Next.js `server-only` package — TanStack Start uses `*.server.ts` filename convention or `@tanstack/react-start/server-only` instead. Prettier config: 100-char width, double quotes, semicolons, trailing commas everywhere — run `bun run format` rather than hand-formatting.
