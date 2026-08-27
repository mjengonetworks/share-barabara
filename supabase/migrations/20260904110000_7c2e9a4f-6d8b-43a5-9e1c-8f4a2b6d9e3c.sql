-- Campaigns: proper event details (location), extra media galleries for both
-- the event announcement and the after-the-fact report, and automation for
-- flagging a campaign's report for admin review once it lapses into the past.
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS report_attachments JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS report_needs_review BOOLEAN NOT NULL DEFAULT false;

-- Nobody can write a first-hand report for an event before it happens, so a
-- report is never required at creation time. Once end_date passes with no
-- report yet, default it to the event description (the closest thing to a
-- "past tense" account we can generate without a human or an LLM) and flag
-- it for an editor to actually rewrite/expand, notifying editor+ staff.
CREATE OR REPLACE FUNCTION public.sync_past_campaign_reports()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _campaign RECORD;
  _staff_id UUID;
BEGIN
  FOR _campaign IN
    SELECT id, title, description FROM public.campaigns
    WHERE end_date < CURRENT_DATE AND report_content IS NULL AND NOT report_needs_review
  LOOP
    UPDATE public.campaigns
      SET report_content = _campaign.description, report_needs_review = true
      WHERE id = _campaign.id;

    FOR _staff_id IN
      SELECT DISTINCT user_id FROM public.user_roles WHERE public.has_min_role(user_id, 'editor')
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        _staff_id,
        'campaign_report_due',
        'Campaign report needs review',
        _campaign.title,
        '/admin/campaigns'
      );
    END LOOP;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_past_campaign_reports() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
-- cron.schedule() re-scheduling a job with the same name updates it in place.
SELECT cron.schedule(
  'sync-past-campaign-reports',
  '0 3 * * *',
  $$SELECT public.sync_past_campaign_reports()$$
);
