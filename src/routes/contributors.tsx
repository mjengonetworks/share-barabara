import { useState } from "react";
import type { FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useContributorLeaderboard } from "@/hooks/useContributorLeaderboard";
import { badgeForPoints, levelForPoints } from "@/lib/gamification";
import { UserAvatar } from "@/components/site/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicPageHero } from "@/components/site/public-page-hero";

export const Route = createFileRoute("/contributors")({
  head: () => ({
    meta: [
      { title: "Top Contributors: Share Barabara" },
      {
        name: "description",
        content: "Share Barabara contributors ranked by earned reputation.",
      },
    ],
  }),
  component: ContributorsPage,
});

const PAGE_SIZE = 25;

function ContributorsPage() {
  const { user } = useAuth();
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const { data: rows = [], isLoading, isError } = useContributorLeaderboard({
    search,
    limit: PAGE_SIZE,
    offset,
  });
  const { data: myPosition = [] } = useContributorLeaderboard({
    userId: user?.id,
    limit: 1,
    enabled: !!user,
  });
  const me = myPosition[0];

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOffset(0);
    setSearch(draftSearch.trim());
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <PublicPageHero
        eyebrow="Community"
        title="Contributor leaderboard"
        description="Recognising all-time earned reputation from road-safety contributions and legitimate referral points. Payment, roles and verification do not determine rank."
      />

      {me ? (
        <div className="mt-6 rounded-lg border border-accent/40 bg-accent/10 p-4">
          <p className="text-sm font-semibold">Your position</p>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
            <span className="font-bold">Rank {me.rank_position}</span>
            <span>{me.score} earned points</span>
            <span>{levelForPoints(me.score).icon} Level {levelForPoints(me.score).level}</span>
            <Link to="/u/$userId" params={{ userId: me.username ?? me.user_id }} className="underline">
              View your profile
            </Link>
          </div>
        </div>
      ) : null}

      <form onSubmit={submitSearch} className="mt-8 flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={draftSearch}
            onChange={(event) => setDraftSearch(event.target.value)}
            placeholder="Find a contributor by name or username"
            aria-label="Find a contributor"
            className="pl-9"
          />
        </div>
        <Button type="submit">Search</Button>
        {search ? (
          <Button type="button" variant="ghost" onClick={() => { setDraftSearch(""); setSearch(""); setOffset(0); }}>
            Clear
          </Button>
        ) : null}
      </form>

      {isLoading ? <p className="mt-8 text-sm text-muted-foreground">Loading contributors…</p> : null}
      {isError ? (
        <div className="mt-8 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
          The earned-reputation leaderboard is not available in this environment yet. It requires
          the reviewed leaderboard database function; no fallback ranking is shown.
        </div>
      ) : null}
      {!isLoading && !isError && rows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {search ? "No eligible contributors match that search." : "No eligible contributors yet."}
        </div>
      ) : null}

      {!isError && rows.length > 0 ? (
        <ol className="mt-8 space-y-3">
          {rows.map((row) => {
            const level = levelForPoints(row.score);
            const badge = badgeForPoints(row.score);
            return (
              <li key={row.user_id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 card-elevated">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 font-bold text-accent-foreground">
                  {row.rank_position}
                </span>
                <UserAvatar url={row.avatar_url} name={row.display_name} className="size-11" />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/u/$userId"
                    params={{ userId: row.username ?? row.user_id }}
                    className="font-semibold text-brand-blue hover:underline"
                  >
                    {row.display_name || "Road user"}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {level.icon} Level {level.level} · {row.score} earned points
                    {badge ? ` · ${badge.label}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.published_articles} published articles · {row.approved_reports} approved reports · {row.active_alerts} active alerts
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      {!isError && rows.length > 0 ? (
        <div className="mt-6 flex justify-between gap-3">
          <Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
            Previous
          </Button>
          <Button variant="outline" disabled={rows.length < PAGE_SIZE} onClick={() => setOffset(offset + PAGE_SIZE)}>
            Next
          </Button>
        </div>
      ) : null}

      <p className="mt-8 text-xs text-muted-foreground">
        All-time only: the current reputation system stores cumulative values, not dated point events.
        Equal scores share a rank and use a stable user ID order for display.
      </p>
    </div>
  );
}
