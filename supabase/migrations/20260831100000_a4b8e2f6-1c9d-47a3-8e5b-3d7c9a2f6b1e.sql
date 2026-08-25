-- Upsert (INSERT ... ON CONFLICT DO UPDATE) requires UPDATE privilege to be
-- grantable/plannable even when the conflict branch never fires, the same
-- class of Postgres permission-check-at-parse-time gotcha hit earlier with
-- OR-branch RLS policies. Newsletter signup uses upsert (by email) so people
-- resubscribing get active flipped back to true instead of erroring.
GRANT UPDATE ON public.newsletter_subscribers TO anon, authenticated;
CREATE POLICY "newsletter_update_anyone" ON public.newsletter_subscribers FOR UPDATE
  USING (true) WITH CHECK (true);
