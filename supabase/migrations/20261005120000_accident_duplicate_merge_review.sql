-- Review-only: staff-controlled duplicate detection/merge workflow for reports.
ALTER TABLE public.accident_reports
  ADD COLUMN IF NOT EXISTS duplicate_of_report_id UUID REFERENCES public.accident_reports(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS duplicate_merge_note TEXT;

ALTER TABLE public.accident_reports
  DROP CONSTRAINT IF EXISTS accident_reports_not_self_duplicate;
ALTER TABLE public.accident_reports
  ADD CONSTRAINT accident_reports_not_self_duplicate
  CHECK (duplicate_of_report_id IS NULL OR duplicate_of_report_id <> id);

CREATE INDEX IF NOT EXISTS accident_reports_duplicate_idx
  ON public.accident_reports (duplicate_of_report_id)
  WHERE duplicate_of_report_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.merge_duplicate_report(
  _duplicate_report_id UUID,
  _canonical_report_id UUID,
  _note TEXT DEFAULT 'Merged into the canonical incident report.'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  duplicate_row public.accident_reports;
  canonical_row public.accident_reports;
  note_text TEXT := left(trim(coalesce(_note, 'Merged into the canonical incident report.')), 1000);
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_min_role(auth.uid(), 'editor') THEN
    RAISE EXCEPTION 'Only editors can merge duplicate reports';
  END IF;
  IF _duplicate_report_id IS NULL OR _canonical_report_id IS NULL OR _duplicate_report_id = _canonical_report_id THEN
    RAISE EXCEPTION 'Choose two different reports';
  END IF;

  SELECT * INTO duplicate_row FROM public.accident_reports WHERE id = _duplicate_report_id FOR UPDATE;
  SELECT * INTO canonical_row FROM public.accident_reports WHERE id = _canonical_report_id FOR UPDATE;
  IF duplicate_row.id IS NULL OR canonical_row.id IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;
  IF canonical_row.status <> 'approved' THEN RAISE EXCEPTION 'Canonical report must be approved'; END IF;
  IF duplicate_row.duplicate_of_report_id IS NOT NULL THEN RAISE EXCEPTION 'Report has already been merged'; END IF;

  UPDATE public.accident_reports
  SET status = 'rejected',
      rejection_reason = note_text,
      duplicate_of_report_id = canonical_row.id,
      duplicate_merge_note = note_text,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = duplicate_row.id;

  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = duplicate_row.user_id
      AND type = 'account'
      AND link = '/reports/' || canonical_row.id::text
      AND title = 'Your report was linked to an existing incident'
  ) THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      duplicate_row.user_id,
      'account',
      'Your report was linked to an existing incident',
      'Our editors found that your report describes the same incident as an existing Share Barabara report. You can add useful information to the canonical report.',
      '/reports/' || canonical_row.id::text
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_duplicate_report(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_report(uuid, uuid, text) TO authenticated, service_role;
