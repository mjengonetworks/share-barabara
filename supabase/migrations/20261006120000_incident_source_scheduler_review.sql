-- Additive scheduling/claiming for the existing incident source operations.
-- The Worker calls the claim function; no external provider is assumed here.
ALTER TABLE public.incident_monitor_sources
  ADD COLUMN IF NOT EXISTS check_interval_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (check_interval_minutes BETWEEN 5 AND 10080),
  ADD COLUMN IF NOT EXISTS next_check_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0
    CHECK (consecutive_failures >= 0),
  ADD COLUMN IF NOT EXISTS last_run_status TEXT
    CHECK (last_run_status IS NULL OR last_run_status IN ('running','succeeded','failed','unavailable'));

CREATE INDEX IF NOT EXISTS incident_monitor_sources_due_idx
  ON public.incident_monitor_sources (enabled, next_check_at);
CREATE UNIQUE INDEX IF NOT EXISTS incident_monitor_runs_one_active_source_idx
  ON public.incident_monitor_runs (source_id)
  WHERE status = 'running';

CREATE OR REPLACE FUNCTION public.claim_due_incident_monitor_sources(p_limit INTEGER DEFAULT 3)
RETURNS TABLE (
  run_id UUID,
  source_id UUID,
  name TEXT,
  base_url TEXT,
  source_class TEXT,
  keywords TEXT[],
  check_interval_minutes INTEGER,
  consecutive_failures INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_row public.incident_monitor_sources%ROWTYPE;
  new_run UUID;
  bounded_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 3), 1), 10);
BEGIN
  -- A crashed Worker must not permanently strand a source.
  UPDATE public.incident_monitor_runs
  SET status = 'failed', completed_at = now(), error_message = 'Run lease expired before completion.'
  WHERE status = 'running' AND started_at < now() - interval '30 minutes';

  FOR source_row IN
    SELECT s.*
    FROM public.incident_monitor_sources AS s
    WHERE s.enabled
      AND s.next_check_at <= now()
      AND NOT EXISTS (
        SELECT 1 FROM public.incident_monitor_runs AS r
        WHERE r.source_id = s.id AND r.status = 'running'
      )
    ORDER BY s.next_check_at ASC, s.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT bounded_limit
  LOOP
    INSERT INTO public.incident_monitor_runs (source_id, started_at, status)
    VALUES (source_row.id, now(), 'running')
    RETURNING id INTO new_run;

    UPDATE public.incident_monitor_sources
    SET next_check_at = now() + make_interval(mins => source_row.check_interval_minutes),
        last_run_status = 'running'
    WHERE id = source_row.id;

    run_id := new_run;
    source_id := source_row.id;
    name := source_row.name;
    base_url := source_row.base_url;
    source_class := source_row.source_class;
    keywords := source_row.keywords;
    check_interval_minutes := source_row.check_interval_minutes;
    consecutive_failures := source_row.consecutive_failures;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_incident_monitor_sources(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_incident_monitor_sources(INTEGER) TO service_role;
