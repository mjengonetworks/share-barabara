-- REVIEW ONLY: dedicated editorial summaries for public Reports and Alerts.
-- Additive and safe for existing rows; production execution requires separate approval.
ALTER TABLE public.accident_reports
  ADD COLUMN IF NOT EXISTS summary TEXT;

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS summary TEXT;

COMMENT ON COLUMN public.accident_reports.summary IS
  'Concise independently edited editorial summary; NULL means no summary has been supplied.';
COMMENT ON COLUMN public.alerts.summary IS
  'Concise independently edited editorial summary; NULL means no summary has been supplied.';
