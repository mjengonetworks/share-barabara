-- ===== SECURITY HARDENING (advisor follow-up) =====
-- role_rank was missing a pinned search_path like its sibling functions.
CREATE OR REPLACE FUNCTION public.role_rank(_role public.app_role)
RETURNS SMALLINT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _role
    WHEN 'member' THEN 0
    WHEN 'guest_author' THEN 1
    WHEN 'author' THEN 2
    WHEN 'moderator' THEN 3
    WHEN 'editor' THEN 4
    WHEN 'admin' THEN 5
  END;
$$;

-- These SECURITY DEFINER functions only ever run as triggers; a trigger
-- fires under its owner regardless of EXECUTE grants, so revoking direct
-- RPC access (auto-exposed by PostgREST for any public-schema function)
-- closes an unintended surface without touching their trigger behaviour.
REVOKE ALL ON FUNCTION public.guard_news_publish() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_page_verify() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_vote() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_reply() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_nearby_users_on_alert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_report_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_article_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_moderators_on_quote_submission() FROM PUBLIC, anon, authenticated;

-- ===== CAMPAIGNS FEATURED PICKS: split into day + week =====
UPDATE public.featured_picks SET slot = 'campaigns_profile_of_day' WHERE slot = 'campaigns_profile';
UPDATE public.featured_picks SET slot = 'campaigns_page_of_day' WHERE slot = 'campaigns_page';
INSERT INTO public.featured_picks (slot) VALUES
  ('campaigns_profile_of_week'), ('campaigns_page_of_week')
ON CONFLICT (slot) DO NOTHING;
