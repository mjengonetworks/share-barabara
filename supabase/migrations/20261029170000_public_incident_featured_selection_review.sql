-- Review-only additive migration for editorial Featured Reports and Alerts.
-- Publication, soft-delete, duplicate and role policies remain authoritative.

ALTER TABLE public.accident_reports
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS accident_reports_featured_idx
  ON public.accident_reports (featured, occurred_at DESC)
  WHERE status = 'approved' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS alerts_featured_idx
  ON public.alerts (featured, created_at DESC)
  WHERE status = 'active' AND deleted_at IS NULL;

COMMENT ON COLUMN public.accident_reports.featured IS
  'Editorial selection for the public Featured Reports section; independent of status, severity, popularity and canonical eligibility.';

COMMENT ON COLUMN public.alerts.featured IS
  'Editorial selection for the public Featured Alerts section; independent of status, severity, popularity and expiry.';

-- Existing moderator/admin update policies authorise the toggle while the
-- public policies continue to expose only approved/active, non-deleted rows.
