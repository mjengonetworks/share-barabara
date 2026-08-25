import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CarFront, MessageSquare, Newspaper, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { longDate, timeAgo } from "@/lib/format";
import { levelForStars, badgeForPoints } from "@/lib/gamification";
import { SeverityBadge } from "@/components/site/severity-badge";
import { StarRatingWidget } from "@/components/site/star-rating";
import { ShareButtons } from "@/components/site/share-buttons";
import { Button } from "@/components/ui/button";
import { useRoleLabels, primaryRoleLabel } from "@/hooks/useRoles";
import { useAuth } from "@/hooks/useAuth";
import { useContributorScore } from "@/hooks/useContributorScore";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/u/$userId")({
  head: () => ({
    meta: [
      { title: "Contributor Profile: Share Barabara" },
      {
        name: "description",
        content:
          "Everything a Share Barabara contributor has published: hazard alerts, accident reports and discussion comments.",
      },
      { property: "og:title", content: "Contributor Profile: Share Barabara" },
      {
        property: "og:description",
        content: "Alerts, accident reports and comments contributed by this road user.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContributorPage,
});

function ContributorPage() {
  const { userId: routeParam } = Route.useParams();
  const { user: viewer } = useAuth();
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", routeParam],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq(UUID_RE.test(routeParam) ? "id" : "username", routeParam)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Canonicalise to the username URL once the profile has loaded, so the
  // address bar (and therefore ShareButtons) always reflects the username.
  useEffect(() => {
    if (profile?.username && profile.username !== routeParam) {
      navigate({ to: "/u/$userId", params: { userId: profile.username }, replace: true });
    }
  }, [profile, routeParam, navigate]);

  const userId = profile?.id;

  const { data: subscription } = useQuery({
    queryKey: ["subscription", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("active, expires_at")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const isVerified =
    !!subscription?.active &&
    (!subscription.expires_at || new Date(subscription.expires_at) > new Date());

  const { data: viewerSubscription } = useQuery({
    queryKey: ["subscription", viewer?.id],
    enabled: !!viewer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("active, expires_at")
        .eq("user_id", viewer!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const viewerCanRate =
    !!viewer &&
    !!userId &&
    viewer.id !== userId &&
    !!viewerSubscription?.active &&
    (!viewerSubscription.expires_at || new Date(viewerSubscription.expires_at) > new Date());

  const { data: score } = useContributorScore(userId);
  const level = levelForStars(score?.totalStars ?? 0);
  const badge = badgeForPoints(score?.points ?? 0);

  const { data: roleMap = {} } = useRoleLabels(userId ? [userId] : []);

  const { data: alerts = [] } = useQuery({
    queryKey: ["user-alerts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: submitted = [] } = useQuery({
    queryKey: ["user-reports", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .eq("user_id", userId!)
        .order("occurred_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: reviewed = [] } = useQuery({
    queryKey: ["user-reviewed", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .eq("reviewed_by", userId!)
        .order("reviewed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["user-articles", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, category, published_at")
        .eq("author_id", userId!)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["user-comments", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const name = profile?.display_name ?? "Road user";
  const role = userId ? primaryRoleLabel(roleMap[userId]) : "";

  if (!profileLoading && !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <Link to="/" className="mt-4 inline-block underline">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className={isVerified ? "bg-muted/40" : undefined}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
          {role}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="mt-2 flex items-center gap-2 text-4xl font-extrabold">
            {name}
            {isVerified ? (
              <BadgeCheck className="size-7 text-accent" aria-label="Subscribed member" />
            ) : null}
          </h1>
          {!!userId && viewer?.id === userId ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">Edit profile</Link>
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-muted-foreground">
          {profile?.occupation ? `${profile.occupation} · ` : ""}
          {profile?.county ? `${profile.county} · ` : ""}
          {profile?.created_at ? `Contributing since ${longDate(profile.created_at)}` : ""}
        </p>
        <div className="mt-3">
          <ShareButtons title={`${name} on Share Barabara`} />
        </div>
        {profile?.bio ? <p className="mt-3 max-w-2xl text-foreground/90">{profile.bio}</p> : null}
        {profile?.road_safety_message ? (
          <p className="mt-3 max-w-2xl border-l-4 border-accent pl-4 italic text-muted-foreground">
            "{profile.road_safety_message}"
          </p>
        ) : null}
        {profile?.mjengo_networks_url || profile?.mjengo_hub_url ? (
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {profile.mjengo_networks_url ? (
              <a
                href={profile.mjengo_networks_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Mjengo Networks profile
              </a>
            ) : null}
            {profile.mjengo_hub_url ? (
              <a
                href={profile.mjengo_hub_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Mjengo Hub profile
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${
              level.level >= 8
                ? "bg-caution/20 text-caution"
                : level.level >= 5
                  ? "bg-accent/20 text-accent-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {level.icon} Level {level.level}
          </span>
          <span className="text-sm text-muted-foreground">
            {score?.totalStars ?? 0} stars from {score?.ratingCount ?? 0} ratings
          </span>
          {badge ? (
            <span className="rounded-full bg-safe/15 px-3 py-1 text-xs font-semibold text-safe">
              {badge.label} · {score?.points ?? 0} pts
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{score?.points ?? 0} points</span>
          )}
        </div>

        {viewerCanRate ? (
          <div className="mt-4 flex items-center gap-3">
            <p className="text-sm text-muted-foreground">Rate this contributor:</p>
            <StarRatingWidget ratedUserId={userId!} />
          </div>
        ) : viewer && viewer.id !== userId ? (
          <p className="mt-4 text-xs text-muted-foreground">
            <Link to="/subscribe" className="underline">
              Subscribe
            </Link>{" "}
            to rate other contributors.
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Alerts", value: alerts.length },
            { label: "Reports filed", value: submitted.length },
            { label: "Reports approved", value: reviewed.length },
            { label: "Articles", value: articles.length },
            { label: "Comments", value: comments.length },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-border bg-card p-5 card-elevated"
            >
              <p className="font-display text-3xl font-extrabold">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <CarFront className="size-5 text-accent" /> Accident reports
          </h2>
          {submitted.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No reports published yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {submitted.map((r) => (
                <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge value={r.severity} />
                    <Link
                      to="/reports/$reportId"
                      params={{ reportId: r.id }}
                      className="font-semibold text-brand-blue hover:underline"
                    >
                      {r.title}
                    </Link>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {longDate(r.occurred_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.county}
                    {r.road ? ` · ${r.road}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Newspaper className="size-5 text-accent" /> Articles
          </h2>
          {articles.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No articles published yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {articles.map((a) => (
                <li key={a.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-accent/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
                      {a.category}
                    </span>
                    <Link
                      to="/news/$slug"
                      params={{ slug: a.slug }}
                      className="font-semibold text-brand-blue hover:underline"
                    >
                      {a.title}
                    </Link>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {longDate(a.published_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {reviewed.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-2xl font-bold">Reports approved and edited</h2>
            <ul className="mt-4 space-y-3">
              {reviewed.map((r) => (
                <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                  <span className="font-semibold">{r.title}</span>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.county} · approved {r.reviewed_at ? timeAgo(r.reviewed_at) : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <TriangleAlert className="size-5 text-caution" /> Hazard alerts
          </h2>
          {alerts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No alerts posted yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {alerts.map((a) => (
                <li key={a.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge value={a.severity} />
                    <Link
                      to="/alerts/$alertId"
                      params={{ alertId: a.id }}
                      className="font-semibold text-brand-blue hover:underline"
                    >
                      {a.title}
                    </Link>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {timeAgo(a.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.county}
                    {a.road ? ` · ${a.road}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <MessageSquare className="size-5 text-accent" /> Comments
          </h2>
          {comments.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No comments yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-foreground/90">{c.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    on a {c.entity_type} · {timeAgo(c.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
