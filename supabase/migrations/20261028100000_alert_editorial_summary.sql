-- Prepared for the editorial Alert Summary contract; do not apply as part of this UI workstream.
-- The field is nullable so existing alerts remain valid and the public UI can omit
-- the summary section until an editor saves one.
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS summary TEXT;
