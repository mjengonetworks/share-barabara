-- REVIEW ONLY: idempotent publication bridge from canonical editorial records
-- to the existing public Feed. Do not execute without backup, rehearsal and
-- separate production approval.

CREATE TABLE IF NOT EXISTS public.editorial_feed_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('article','report','alert','infrastructure','campaign')),
  source_id UUID NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  href TEXT NOT NULL,
  image_url TEXT,
  published_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS editorial_feed_entries_public_idx
  ON public.editorial_feed_entries (active, published_at DESC);
CREATE INDEX IF NOT EXISTS editorial_feed_entries_source_idx
  ON public.editorial_feed_entries (source_type, source_id);

ALTER TABLE public.editorial_feed_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS editorial_feed_entries_public_read ON public.editorial_feed_entries;
CREATE POLICY editorial_feed_entries_public_read ON public.editorial_feed_entries
  FOR SELECT USING (active = true);
GRANT SELECT ON public.editorial_feed_entries TO anon, authenticated;
GRANT ALL ON public.editorial_feed_entries TO service_role;

CREATE OR REPLACE FUNCTION public.sync_editorial_feed_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_id UUID := COALESCE(NEW.id, OLD.id);
  v_source_type TEXT := TG_ARGV[0];
  row JSONB;
  eligible BOOLEAN := false;
  title_value TEXT;
  excerpt_value TEXT;
  href_value TEXT;
  image_value TEXT;
  published_value TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.editorial_feed_entries AS entry SET active = false, updated_at = now()
    WHERE entry.source_type = v_source_type
      AND entry.source_id = v_source_id;
    RETURN OLD;
  END IF;

  row := to_jsonb(NEW);

  title_value := NULLIF(btrim(COALESCE(row->>'title', '')), '');
  excerpt_value := COALESCE(NULLIF(row->>'summary', ''), NULLIF(row->>'description', ''), NULLIF(row->>'body', ''));
  image_value := COALESCE(NULLIF(row->>'image_url', ''), NULLIF(row->>'featured_image_url', ''));
  published_value := COALESCE(NULLIF(row->>'published_at', '')::TIMESTAMPTZ, NULLIF(row->>'created_at', '')::TIMESTAMPTZ);

  IF v_source_type = 'article' THEN
    eligible := COALESCE(row->>'status' = 'published', false) AND row->>'deleted_at' IS NULL;
    href_value := '/news/' || COALESCE(row->>'slug', v_source_id::TEXT);
  ELSIF v_source_type = 'report' THEN
    eligible := COALESCE(row->>'status' = 'approved', false) AND row->>'deleted_at' IS NULL;
    href_value := '/reports/' || v_source_id::TEXT;
  ELSIF v_source_type = 'alert' THEN
    eligible := (row->>'status' IS NULL OR row->>'status' IN ('active','in_progress','under_resolution','resolved')) AND row->>'deleted_at' IS NULL;
    href_value := '/alerts/' || v_source_id::TEXT;
  ELSIF v_source_type = 'infrastructure' THEN
    eligible := COALESCE(row->>'status' = 'approved', false) AND row->>'deleted_at' IS NULL;
    href_value := '/infrastructure-issues/' || v_source_id::TEXT;
  ELSIF v_source_type = 'campaign' THEN
    eligible := row->>'deleted_at' IS NULL;
    href_value := '/campaigns/' || COALESCE(row->>'slug', v_source_id::TEXT);
  END IF;

  INSERT INTO public.editorial_feed_entries
    (source_type, source_id, title, excerpt, href, image_url, published_at, active, updated_at)
  VALUES
    (v_source_type, v_source_id, COALESCE(title_value, v_source_type || ' update'), excerpt_value, href_value, image_value, published_value, eligible, now())
  ON CONFLICT (source_type, source_id) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    href = EXCLUDED.href,
    image_url = EXCLUDED.image_url,
    published_at = EXCLUDED.published_at,
    active = EXCLUDED.active,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- The triggers are additive and idempotent. Existing community feed_posts are
-- untouched and remain the canonical community-authored source.
DROP TRIGGER IF EXISTS editorial_feed_article_sync ON public.news;
CREATE TRIGGER editorial_feed_article_sync AFTER INSERT OR UPDATE OR DELETE ON public.news
  FOR EACH ROW EXECUTE FUNCTION public.sync_editorial_feed_entry('article');
DROP TRIGGER IF EXISTS editorial_feed_report_sync ON public.accident_reports;
CREATE TRIGGER editorial_feed_report_sync AFTER INSERT OR UPDATE OR DELETE ON public.accident_reports
  FOR EACH ROW EXECUTE FUNCTION public.sync_editorial_feed_entry('report');
DROP TRIGGER IF EXISTS editorial_feed_alert_sync ON public.alerts;
CREATE TRIGGER editorial_feed_alert_sync AFTER INSERT OR UPDATE OR DELETE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.sync_editorial_feed_entry('alert');
DROP TRIGGER IF EXISTS editorial_feed_infrastructure_sync ON public.infrastructure_issues;
CREATE TRIGGER editorial_feed_infrastructure_sync AFTER INSERT OR UPDATE OR DELETE ON public.infrastructure_issues
  FOR EACH ROW EXECUTE FUNCTION public.sync_editorial_feed_entry('infrastructure');
DROP TRIGGER IF EXISTS editorial_feed_campaign_sync ON public.campaigns;
CREATE TRIGGER editorial_feed_campaign_sync AFTER INSERT OR UPDATE OR DELETE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.sync_editorial_feed_entry('campaign');

REVOKE ALL ON FUNCTION public.sync_editorial_feed_entry() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_editorial_feed_entry() TO service_role;
