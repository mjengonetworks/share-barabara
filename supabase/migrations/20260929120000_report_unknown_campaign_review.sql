-- Repository record of the approved production patch already applied to Supabase.
-- Do not execute this file manually.

DROP POLICY IF EXISTS "reports_insert_own" ON public.accident_reports;
CREATE POLICY "reports_insert_own" ON public.accident_reports FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_suspended(auth.uid())
    AND (page_id IS NULL OR public.owns_page(auth.uid(), page_id))
    AND (
      status = 'pending'
      OR (status = 'approved' AND public.has_min_role(auth.uid(), 'moderator'))
    )
  );

ALTER TABLE public.accident_reports
  ALTER COLUMN vehicles_involved DROP DEFAULT,
  ALTER COLUMN vehicles_involved DROP NOT NULL,
  ALTER COLUMN casualties DROP DEFAULT,
  ALTER COLUMN casualties DROP NOT NULL,
  ALTER COLUMN fatalities DROP DEFAULT,
  ALTER COLUMN fatalities DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accident_reports_vehicles_involved_nonnegative'
      AND conrelid = 'public.accident_reports'::regclass
  ) THEN
    ALTER TABLE public.accident_reports
      ADD CONSTRAINT accident_reports_vehicles_involved_nonnegative
      CHECK (vehicles_involved IS NULL OR vehicles_involved >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accident_reports_casualties_nonnegative'
      AND conrelid = 'public.accident_reports'::regclass
  ) THEN
    ALTER TABLE public.accident_reports
      ADD CONSTRAINT accident_reports_casualties_nonnegative
      CHECK (casualties IS NULL OR casualties >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accident_reports_fatalities_nonnegative'
      AND conrelid = 'public.accident_reports'::regclass
  ) THEN
    ALTER TABLE public.accident_reports
      ADD CONSTRAINT accident_reports_fatalities_nonnegative
      CHECK (fatalities IS NULL OR fatalities >= 0) NOT VALID;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.sync_past_campaign_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _campaign RECORD;
  _staff_id UUID;
  _nairobi_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi')::date;
BEGIN
  FOR _campaign IN
    SELECT id, title
    FROM public.campaigns
    WHERE end_date < _nairobi_today
      AND NOT report_published
      AND NOT report_needs_review
  LOOP
    UPDATE public.campaigns
    SET report_needs_review = true
    WHERE id = _campaign.id
      AND NOT report_published
      AND NOT report_needs_review;

    IF FOUND THEN
      FOR _staff_id IN
        SELECT DISTINCT user_id
        FROM public.user_roles
        WHERE public.has_min_role(user_id, 'editor')
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
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_past_campaign_reports() FROM PUBLIC, anon, authenticated;
