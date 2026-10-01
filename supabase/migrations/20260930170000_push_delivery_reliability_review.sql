-- REVIEW ONLY: Task 47 Push Notification Delivery & Reliability.
-- Do not execute until Tasks 27, 43 and 44 have been reviewed/applied and
-- push configuration, RLS, worker behavior and real-device delivery are ready.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'invalid')),
  UNIQUE (endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS push_subscriptions_health_idx ON public.push_subscriptions (status, last_failure_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY push_subscriptions_update_own ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.notification_delivery_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('push')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'retrying', 'failed', 'cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 8),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (notification_id, channel)
);

CREATE INDEX IF NOT EXISTS notification_delivery_jobs_ready_idx
  ON public.notification_delivery_jobs (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS notification_delivery_jobs_created_idx
  ON public.notification_delivery_jobs (created_at DESC);
ALTER TABLE public.notification_delivery_jobs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.notification_delivery_jobs TO authenticated;
GRANT ALL ON public.notification_delivery_jobs TO service_role;
CREATE POLICY notification_delivery_jobs_admin_read ON public.notification_delivery_jobs
  FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.notification_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.notification_delivery_jobs(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.push_subscriptions(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('accepted', 'failed', 'invalid')),
  http_status integer,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_delivery_attempts_job_idx
  ON public.notification_delivery_attempts (job_id, created_at DESC);
ALTER TABLE public.notification_delivery_attempts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.notification_delivery_attempts TO authenticated;
GRANT ALL ON public.notification_delivery_attempts TO service_role;
CREATE POLICY notification_delivery_attempts_admin_read ON public.notification_delivery_attempts
  FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(), 'admin'));

-- Every server-created notification gets one idempotent push job. Whether the
-- job is dispatched is decided server-side from current preferences and the
-- existence of an active subscription; no browser can nominate recipients.
CREATE OR REPLACE FUNCTION public.enqueue_notification_push_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notification_delivery_jobs (notification_id, channel)
  VALUES (NEW.id, 'push')
  ON CONFLICT (notification_id, channel) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_enqueue_push ON public.notifications;
CREATE TRIGGER notifications_enqueue_push
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.enqueue_notification_push_job();

REVOKE ALL ON FUNCTION public.enqueue_notification_push_job() FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.push_subscriptions IS
  'Owner-scoped Web Push endpoints. Keys are browser subscription material, never VAPID private keys.';
COMMENT ON TABLE public.notification_delivery_jobs IS
  'Server-owned idempotent push outbox. A delivered job means the push service accepted the request, not that a device displayed it.';
COMMENT ON TABLE public.notification_delivery_attempts IS
  'Admin-only delivery diagnostics without exposing endpoint keys or payload secrets.';
