-- REVIEW ONLY: administrator accident-report drafts.
-- Do not execute automatically. Apply only after production/staging schema review.

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.accident_reports'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%pending%approved%rejected%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.accident_reports DROP CONSTRAINT %I', constraint_name);
  END IF;
END
$$;

ALTER TABLE public.accident_reports
  ADD CONSTRAINT accident_reports_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected'));

DROP POLICY IF EXISTS "reports_insert_own" ON public.accident_reports;
CREATE POLICY "reports_insert_own" ON public.accident_reports FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_suspended(auth.uid())
    AND (page_id IS NULL OR public.owns_page(auth.uid(), page_id))
    AND (
      status IN ('draft', 'pending')
      OR (status = 'approved' AND public.has_min_role(auth.uid(), 'moderator'))
    )
  );

DROP POLICY IF EXISTS "reports_read_approved" ON public.accident_reports;
CREATE POLICY "reports_read_approved" ON public.accident_reports FOR SELECT
  USING (
    status = 'approved'
    OR auth.uid() = user_id
    OR public.has_min_role(auth.uid(), 'moderator')
  );
