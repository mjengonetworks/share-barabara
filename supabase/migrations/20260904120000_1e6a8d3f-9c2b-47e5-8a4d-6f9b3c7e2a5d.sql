-- A campaign that has lapsed into the past is hidden from the public until
-- an admin/editor has actually written and published its report — the
-- auto-populated draft (event description copied verbatim) is a starting
-- point for staff, not something visitors should see as the real story.
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS report_published BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "campaigns_public_read" ON public.campaigns;
CREATE POLICY "campaigns_public_read" ON public.campaigns FOR SELECT
  USING (
    end_date >= CURRENT_DATE
    OR report_published
    OR public.has_min_role(auth.uid(), 'editor')
  );
