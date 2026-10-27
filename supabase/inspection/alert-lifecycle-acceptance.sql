-- Alert lifecycle acceptance test. Run only against an authorised non-production
-- Supabase database with psql variables supplied; every data change rolls back.
-- Required variables: alert_id, owner_id, editor_id, other_user_id.
-- Example: psql "$DATABASE_URL" -v alert_id='...' -v owner_id='...' \
--   -v editor_id='...' -v other_user_id='...' -f this-file.sql

\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.alert_status_history') IS NULL THEN
    RAISE EXCEPTION 'Lifecycle migration is not applied';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.alerts'::regclass AND tgname = 'alerts_status_audit'
  ) THEN
    RAISE EXCEPTION 'Alert status audit trigger is missing';
  END IF;
END $$;

-- Verify the selected fixture exists and retain its initial status for checks.
SELECT id, user_id, status AS initial_status
FROM public.alerts
WHERE id = :'alert_id'::uuid AND user_id = :'owner_id'::uuid;

-- A normal authenticated owner must not be able to change lifecycle status.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'owner_id', true);
DO $$
BEGIN
  BEGIN
    UPDATE public.alerts SET status = 'resolved' WHERE id = :'alert_id'::uuid;
    RAISE EXCEPTION 'ordinary owner status update unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'ordinary owner status update unexpectedly succeeded' THEN RAISE; END IF;
  END;
END $$;

-- An unrelated authenticated account must also be rejected.
SELECT set_config('request.jwt.claim.sub', :'other_user_id', true);
DO $$
BEGIN
  BEGIN
    UPDATE public.alerts SET status = 'resolved' WHERE id = :'alert_id'::uuid;
    RAISE EXCEPTION 'cross-account status update unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'cross-account status update unexpectedly succeeded' THEN RAISE; END IF;
  END;
END $$;

-- An editor may move an alert through the supported lifecycle and reopen it.
SELECT set_config('request.jwt.claim.sub', :'editor_id', true);
UPDATE public.alerts SET status = 'in_progress' WHERE id = :'alert_id'::uuid;
UPDATE public.alerts SET status = 'resolved' WHERE id = :'alert_id'::uuid;
UPDATE public.alerts SET status = 'active' WHERE id = :'alert_id'::uuid;

SELECT status FROM public.alerts WHERE id = :'alert_id'::uuid;
SELECT previous_status, new_status, changed_by
FROM public.alert_status_history
WHERE alert_id = :'alert_id'::uuid
ORDER BY changed_at DESC
LIMIT 3;

-- Unsupported values must be rejected even for staff.
DO $$
BEGIN
  BEGIN
    UPDATE public.alerts SET status = 'legacy_test_value' WHERE id = :'alert_id'::uuid;
    RAISE EXCEPTION 'unsupported lifecycle value unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'unsupported lifecycle value unexpectedly succeeded' THEN RAISE; END IF;
  END;
END $$;

ROLLBACK;
