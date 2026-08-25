-- The upsert path (ON CONFLICT DO UPDATE) implicitly RETURNING requires SELECT
-- visibility on the affected row, which only admins have here — so upsert
-- can never work cleanly without exposing subscriber emails more broadly.
-- Simpler and safer: the client does a plain INSERT and treats a unique
-- violation (already subscribed) as success. Drop the open UPDATE policy
-- added for the upsert attempt — letting any anon flip any other
-- subscriber's `active` flag by guessing their email was overreach.
DROP POLICY IF EXISTS "newsletter_update_anyone" ON public.newsletter_subscribers;
REVOKE UPDATE ON public.newsletter_subscribers FROM anon, authenticated;
