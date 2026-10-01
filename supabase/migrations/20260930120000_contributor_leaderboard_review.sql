-- REVIEW ONLY: Task 29 Contributor Leaderboard.
-- Do not execute until the function, public output, RLS assumptions, and
-- performance have been reviewed against the live Supabase schema.

-- The existing contributor metric is:
--   net votes on the user's alerts, reports and comments + referral_points.
-- This function calculates that same lifetime metric in the database so the
-- browser never downloads the whole contributor population or sorts it.
-- Subscription, role, page verification, account age, and post volume are
-- intentionally absent from the score.
CREATE OR REPLACE FUNCTION public.get_contributor_leaderboard(
  _limit integer DEFAULT 25,
  _offset integer DEFAULT 0,
  _query text DEFAULT NULL,
  _user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  score integer,
  rank_position bigint,
  published_articles bigint,
  approved_reports bigint,
  active_alerts bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH contributor_content AS (
  SELECT user_id, id FROM public.alerts
  UNION
  SELECT user_id, id FROM public.accident_reports
  UNION
  SELECT user_id, id FROM public.comments
),
vote_totals AS (
  SELECT content.user_id, COALESCE(SUM(votes.value), 0)::integer AS vote_points
  FROM contributor_content AS content
  LEFT JOIN public.votes AS votes ON votes.entity_id = content.id
  GROUP BY content.user_id
),
score_rows AS (
  SELECT
    profiles.id AS user_id,
    profiles.username,
    profiles.display_name,
    profiles.avatar_url,
    (COALESCE(vote_totals.vote_points, 0) + COALESCE(profiles.referral_points, 0))::integer AS score,
    (
      SELECT COUNT(*) FROM public.news
      WHERE news.author_id = profiles.id AND news.status = 'published'
    )::bigint AS published_articles,
    (
      SELECT COUNT(*) FROM public.accident_reports
      WHERE accident_reports.user_id = profiles.id AND accident_reports.status = 'approved'
    )::bigint AS approved_reports,
    (
      SELECT COUNT(*) FROM public.alerts
      WHERE alerts.user_id = profiles.id AND alerts.status = 'active'
    )::bigint AS active_alerts
  FROM public.profiles AS profiles
  LEFT JOIN vote_totals ON vote_totals.user_id = profiles.id
  WHERE COALESCE(profiles.suspended, false) = false
    AND (
      COALESCE(vote_totals.vote_points, 0) + COALESCE(profiles.referral_points, 0) <> 0
      OR EXISTS (
        SELECT 1 FROM contributor_content
        WHERE contributor_content.user_id = profiles.id
      )
    )
    AND (
      NULLIF(trim(_query), '') IS NULL
      OR lower(COALESCE(profiles.display_name, '')) LIKE '%' || lower(trim(_query)) || '%'
      OR lower(COALESCE(profiles.username, '')) LIKE '%' || lower(trim(_query)) || '%'
    )
),
ranked AS (
  SELECT score_rows.*, DENSE_RANK() OVER (ORDER BY score_rows.score DESC) AS rank_position
  FROM score_rows
)
SELECT
  ranked.user_id,
  ranked.username,
  ranked.display_name,
  ranked.avatar_url,
  ranked.score,
  ranked.rank_position,
  ranked.published_articles,
  ranked.approved_reports,
  ranked.active_alerts
FROM ranked
WHERE (_user_id IS NULL OR ranked.user_id = _user_id)
ORDER BY ranked.score DESC, ranked.user_id ASC
LIMIT LEAST(GREATEST(COALESCE(_limit, 25), 1), 100)
OFFSET GREATEST(COALESCE(_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.get_contributor_leaderboard(integer, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contributor_leaderboard(integer, integer, text, uuid) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS contributor_votes_entity_idx
  ON public.votes (entity_id);
CREATE INDEX IF NOT EXISTS contributor_profiles_active_idx
  ON public.profiles (suspended, id);
