-- SB 2 corrective migration: align the public report-count RPC with
-- canonical_accident_statistics. This is separate from the four applied
-- relationship/statistics migrations and must not rerun them.

CREATE OR REPLACE FUNCTION public.published_accident_report_count()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM public.accident_reports
  WHERE status = 'approved'
    AND duplicate_of_report_id IS NULL
    AND deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.published_accident_report_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.published_accident_report_count() TO anon, authenticated, service_role;
