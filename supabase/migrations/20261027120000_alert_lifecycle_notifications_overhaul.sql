-- Review-only additive migration for alert lifecycle and notification routing.
-- Apply only after owner approval in a non-production database first.
-- Rollback guidance: remove the two notification triggers/functions, drop the
-- notification indexes, then drop alert_status_history and its trigger/function.
-- Do not drop the added notification columns if any deployed rows use them;
-- preserve those nullable columns until a separately approved data review.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_source_idx
  ON public.notifications (source_type, source_id);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_dedupe_idx
  ON public.notifications (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.alert_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alert_status_history_alert_idx
  ON public.alert_status_history (alert_id, changed_at DESC);
GRANT SELECT ON public.alert_status_history TO anon, authenticated;
GRANT INSERT ON public.alert_status_history TO authenticated;
GRANT ALL ON public.alert_status_history TO service_role;
ALTER TABLE public.alert_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alert_status_history_public_read ON public.alert_status_history;
CREATE POLICY alert_status_history_public_read ON public.alert_status_history
  FOR SELECT USING (true);
DROP POLICY IF EXISTS alert_status_history_staff_insert ON public.alert_status_history;
CREATE POLICY alert_status_history_staff_insert ON public.alert_status_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = changed_by AND public.has_min_role(auth.uid(), 'editor'));

CREATE OR REPLACE FUNCTION public.audit_alert_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() IS NULL OR NOT public.has_min_role(auth.uid(), 'editor') THEN
      RAISE EXCEPTION 'Only authorised moderators can change alert status';
    END IF;
    IF NEW.status NOT IN ('active', 'in_progress', 'resolved') THEN
      RAISE EXCEPTION 'Unsupported alert lifecycle status';
    END IF;
    INSERT INTO public.alert_status_history(alert_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    IF NEW.status IN ('in_progress', 'resolved') THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, source_type, source_id, dedupe_key)
      VALUES (NEW.user_id, 'alert_status', 'Your hazard alert status changed', NEW.title,
        '/alerts/' || NEW.id, 'alert', NEW.id, 'alert-status:' || NEW.id || ':' || NEW.status)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS alerts_status_audit ON public.alerts;
CREATE TRIGGER alerts_status_audit
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.audit_alert_status_change();

-- Ensure newly generated content notifications carry canonical destinations.
CREATE OR REPLACE FUNCTION public.populate_notification_destination()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.link IS NULL AND NEW.source_type IS NOT NULL AND NEW.source_id IS NOT NULL THEN
    NEW.link := CASE NEW.source_type
      WHEN 'alert' THEN '/alerts/' || NEW.source_id
      WHEN 'report' THEN '/reports/' || NEW.source_id
      WHEN 'feed_post' THEN '/feed#post-' || NEW.source_id
      WHEN 'comment' THEN '/feed#comment-' || NEW.source_id
      WHEN 'campaign' THEN '/campaigns/' || NEW.source_id
      WHEN 'infrastructure_issue' THEN '/infrastructure-issues/' || NEW.source_id
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notifications_destination ON public.notifications;
CREATE TRIGGER notifications_destination
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.populate_notification_destination();
