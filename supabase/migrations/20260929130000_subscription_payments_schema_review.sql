-- REVIEW ONLY — do not apply until the application checkout/webhook cutover is ready.
--
-- This migration deliberately does not alter or delete public.subscriptions.
-- That table is the legacy profile-only entitlement store. Existing rows are
-- snapshotted as legacy_unclassified below; no row is inferred to be Blue or
-- Gold. The old table remains available during the application compatibility
-- window and can be retired in a separately reviewed migration.

-- ---------------------------------------------------------------------------
-- 1. Server-authoritative annual catalogue
-- ---------------------------------------------------------------------------
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('profile', 'page')),
  tier TEXT NOT NULL CHECK (tier IN ('blue', 'gold')),
  billing_period TEXT NOT NULL DEFAULT 'annual' CHECK (billing_period = 'annual'),
  amount_kes INTEGER NOT NULL CHECK (amount_kes > 0),
  currency TEXT NOT NULL DEFAULT 'KES' CHECK (currency = 'KES'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_type, tier),
  UNIQUE (id, subject_type)
);

COMMENT ON TABLE public.subscription_plans IS
  'Server-authoritative annual subscription prices. Clients may read the safe catalogue view only.';
COMMENT ON COLUMN public.subscription_plans.amount_kes IS
  'Locked catalogue price in whole KES. Provider adapters convert this to their required unit.';

INSERT INTO public.subscription_plans
  (subject_type, tier, billing_period, amount_kes, currency)
VALUES
  ('profile', 'blue', 'annual', 100, 'KES'),
  ('profile', 'gold', 'annual', 500, 'KES'),
  ('page', 'blue', 'annual', 500, 'KES'),
  ('page', 'gold', 'annual', 2000, 'KES');

CREATE OR REPLACE FUNCTION public.prevent_subscription_plan_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.subject_type IS DISTINCT FROM OLD.subject_type
     OR NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.billing_period IS DISTINCT FROM OLD.billing_period
     OR NEW.amount_kes IS DISTINCT FROM OLD.amount_kes
     OR NEW.currency IS DISTINCT FROM OLD.currency THEN
    RAISE EXCEPTION 'Subscription plan identity and price are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER subscription_plans_lock_price
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.prevent_subscription_plan_price_change();

REVOKE ALL ON public.subscription_plans FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Normalized subscription subject and lifecycle
-- ---------------------------------------------------------------------------
CREATE TABLE public.subscription_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('profile', 'page')),
  profile_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'failed')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((subject_type = 'profile' AND profile_user_id IS NOT NULL AND page_id IS NULL)
      OR (subject_type = 'page' AND page_id IS NOT NULL AND profile_user_id IS NULL)),
  CHECK (current_period_end IS NULL OR current_period_start IS NULL
      OR current_period_end > current_period_start),
  CHECK (cancelled_at IS NULL OR status = 'cancelled'),
  UNIQUE (id, subject_type),
  CONSTRAINT subscription_accounts_plan_subject_fk
    FOREIGN KEY (plan_id, subject_type)
    REFERENCES public.subscription_plans (id, subject_type)
);

COMMENT ON TABLE public.subscription_accounts IS
  'One normalized paid entitlement subject. Status is payment/webhook controlled, not client controlled.';
COMMENT ON COLUMN public.subscription_accounts.cancel_at_period_end IS
  'Cancellation stops renewal while preserving active access through current_period_end.';

CREATE UNIQUE INDEX subscription_accounts_one_open_profile_idx
  ON public.subscription_accounts (profile_user_id)
  WHERE subject_type = 'profile' AND status IN ('pending', 'active') AND profile_user_id IS NOT NULL;
CREATE UNIQUE INDEX subscription_accounts_one_open_page_idx
  ON public.subscription_accounts (page_id)
  WHERE subject_type = 'page' AND status IN ('pending', 'active') AND page_id IS NOT NULL;
CREATE INDEX subscription_accounts_profile_idx
  ON public.subscription_accounts (profile_user_id, status, current_period_end)
  WHERE profile_user_id IS NOT NULL;
CREATE INDEX subscription_accounts_page_idx
  ON public.subscription_accounts (page_id, status, current_period_end)
  WHERE page_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.can_manage_page_subscription(_page_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pages
    WHERE id = _page_id
      AND (owner_id = _user_id OR public.has_role(_user_id, 'admin'))
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_page_subscription(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_page_subscription(uuid, uuid) TO authenticated, service_role;

CREATE TRIGGER subscription_accounts_touch
BEFORE UPDATE ON public.subscription_accounts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

REVOKE ALL ON public.subscription_accounts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.subscription_accounts TO authenticated;
GRANT ALL ON public.subscription_accounts TO service_role;
ALTER TABLE public.subscription_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_accounts_read_subject
ON public.subscription_accounts FOR SELECT TO authenticated
USING (
  (subject_type = 'profile' AND profile_user_id = auth.uid())
  OR (subject_type = 'page' AND public.can_manage_page_subscription(page_id, auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);

-- No direct client INSERT/UPDATE/DELETE policies. Checkout creation,
-- webhook transitions, cancellation and admin overrides must use reviewed
-- SECURITY DEFINER RPCs/server functions that validate the transition and
-- append an immutable event.

-- ---------------------------------------------------------------------------
-- 3. Payment transaction and provider event history
-- ---------------------------------------------------------------------------
CREATE TABLE public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscription_accounts(id) ON DELETE RESTRICT,
  payer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL CHECK (length(trim(provider)) BETWEEN 1 AND 80),
  provider_reference TEXT,
  amount_kes INTEGER NOT NULL CHECK (amount_kes > 0),
  currency TEXT NOT NULL DEFAULT 'KES' CHECK (currency = 'KES'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled')),
  idempotency_key TEXT NOT NULL CHECK (length(trim(idempotency_key)) BETWEEN 8 AND 200),
  provider_payload JSONB,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  authorized_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, idempotency_key),
  UNIQUE (provider, provider_reference),
  CHECK (provider_reference IS NULL OR length(trim(provider_reference)) > 0)
);

CREATE INDEX subscription_payments_subscription_idx
  ON public.subscription_payments (subscription_id, created_at DESC);
CREATE INDEX subscription_payments_reconciliation_idx
  ON public.subscription_payments (provider, status, created_at DESC);

CREATE TABLE public.subscription_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.subscription_payments(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL CHECK (length(trim(provider)) BETWEEN 1 AND 80),
  provider_event_reference TEXT NOT NULL,
  event_type TEXT NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  replay_count INTEGER NOT NULL DEFAULT 0 CHECK (replay_count >= 0),
  UNIQUE (provider, provider_event_reference)
);

CREATE INDEX subscription_payment_events_payment_idx
  ON public.subscription_payment_events (payment_id, received_at DESC);
CREATE INDEX subscription_payment_events_unprocessed_idx
  ON public.subscription_payment_events (received_at)
  WHERE processed_at IS NULL;

CREATE TABLE public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscription_accounts(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN
    ('created', 'activated', 'renewed', 'expired', 'cancelled', 'cancellation_requested',
     'failed', 'refunded', 'admin_override')),
  from_status TEXT CHECK (from_status IS NULL OR from_status IN ('pending', 'active', 'expired', 'cancelled', 'failed')),
  to_status TEXT CHECK (to_status IS NULL OR to_status IN ('pending', 'active', 'expired', 'cancelled', 'failed')),
  payment_id UUID REFERENCES public.subscription_payments(id) ON DELETE RESTRICT,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('checkout', 'webhook', 'system', 'admin')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX subscription_events_subscription_idx
  ON public.subscription_events (subscription_id, created_at DESC);

REVOKE ALL ON public.subscription_payments, public.subscription_payment_events,
  public.subscription_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.subscription_payments, public.subscription_payment_events,
  public.subscription_events TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.request_subscription_cancellation(_subscription_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _subscription public.subscription_accounts;
BEGIN
  SELECT * INTO _subscription
  FROM public.subscription_accounts
  WHERE id = _subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;
  IF _subscription.subject_type = 'profile'
     AND _subscription.profile_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorised to manage this subscription';
  END IF;
  IF _subscription.subject_type = 'page'
     AND NOT public.can_manage_page_subscription(_subscription.page_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised to manage this page subscription';
  END IF;
  IF _subscription.status NOT IN ('pending', 'active') THEN
    RETURN;
  END IF;

  IF _subscription.status = 'pending' THEN
    UPDATE public.subscription_accounts
    SET status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid()
    WHERE id = _subscription_id;
  ELSE
    -- Active access remains valid through current_period_end. The webhook or
    -- scheduled lifecycle worker changes status to expired at that boundary.
    UPDATE public.subscription_accounts
    SET cancel_at_period_end = true
    WHERE id = _subscription_id;
  END IF;

  INSERT INTO public.subscription_events
    (subscription_id, event_type, from_status, to_status, actor_user_id, source, metadata)
  VALUES
    (_subscription_id, 'cancellation_requested', _subscription.status,
     CASE WHEN _subscription.status = 'pending' THEN 'cancelled' ELSE 'active' END,
     auth.uid(), 'system', jsonb_build_object('paid_through', _subscription.current_period_end));
END;
$$;

REVOKE ALL ON FUNCTION public.request_subscription_cancellation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_subscription_cancellation(uuid) TO authenticated, service_role;

-- Payment payloads, references and event bodies are service-role only. An
-- authenticated owner can see subscription status through the subscription
-- table but never payment internals.

-- ---------------------------------------------------------------------------
-- 4. Auditable admin override requests/history
-- ---------------------------------------------------------------------------
CREATE TABLE public.subscription_admin_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscription_accounts(id) ON DELETE RESTRICT,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('grant', 'extend', 'change_tier', 'cancel', 'restore', 'expire')),
  previous_status TEXT,
  previous_plan_id UUID REFERENCES public.subscription_plans(id),
  previous_period_end TIMESTAMPTZ,
  new_status TEXT,
  new_plan_id UUID REFERENCES public.subscription_plans(id),
  new_period_end TIMESTAMPTZ,
  reason TEXT NOT NULL CHECK (length(trim(reason)) >= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX subscription_admin_overrides_subscription_idx
  ON public.subscription_admin_overrides (subscription_id, created_at DESC);

REVOKE ALL ON public.subscription_admin_overrides FROM PUBLIC, anon;
GRANT SELECT ON public.subscription_admin_overrides TO authenticated;
GRANT ALL ON public.subscription_admin_overrides TO service_role;
ALTER TABLE public.subscription_admin_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscription_admin_overrides_read_staff
ON public.subscription_admin_overrides FOR SELECT TO authenticated
USING (public.has_min_role(auth.uid(), 'admin'));
-- No client write policy: the admin operation must atomically write this row,
-- the subscription change, and a subscription_events row server-side.

-- ---------------------------------------------------------------------------
-- 5. Safe legacy snapshot and public-safe views
-- ---------------------------------------------------------------------------
CREATE TABLE public.subscription_legacy_entitlements (
  legacy_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  legacy_active BOOLEAN NOT NULL,
  legacy_expires_at TIMESTAMPTZ,
  legacy_value TEXT NOT NULL,
  legacy_captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (legacy_value NOT IN ('blue', 'gold'))
);

COMMENT ON TABLE public.subscription_legacy_entitlements IS
  'Compatibility snapshot only. legacy_value is intentionally not a paid tier and never grants Blue or Gold.';

INSERT INTO public.subscription_legacy_entitlements
  (legacy_user_id, legacy_active, legacy_expires_at, legacy_value)
SELECT user_id, active, expires_at, tier
FROM public.subscriptions
ON CONFLICT (legacy_user_id) DO NOTHING;

REVOKE ALL ON public.subscription_legacy_entitlements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.subscription_legacy_entitlements TO service_role;
ALTER TABLE public.subscription_legacy_entitlements ENABLE ROW LEVEL SECURITY;

CREATE VIEW public.subscription_catalog AS
SELECT subject_type, tier, billing_period, amount_kes, currency
FROM public.subscription_plans
WHERE is_active;
GRANT SELECT ON public.subscription_catalog TO anon, authenticated;

CREATE VIEW public.public_subscription_entitlements AS
SELECT
  'profile'::TEXT AS subject_type,
  profile_user_id AS subject_id,
  p.tier
FROM public.subscription_accounts s
JOIN public.subscription_plans p ON p.id = s.plan_id
WHERE s.subject_type = 'profile'
  AND s.status = 'active'
  AND (s.current_period_end IS NULL OR s.current_period_end > now())
UNION ALL
SELECT
  'page'::TEXT AS subject_type,
  page_id AS subject_id,
  p.tier
FROM public.subscription_accounts s
JOIN public.subscription_plans p ON p.id = s.plan_id
WHERE s.subject_type = 'page'
  AND s.status = 'active'
  AND (s.current_period_end IS NULL OR s.current_period_end > now());

COMMENT ON VIEW public.public_subscription_entitlements IS
  'Minimum public badge entitlement surface; excludes payment references, amounts, payloads and lifecycle internals.';
GRANT SELECT ON public.public_subscription_entitlements TO anon, authenticated;

-- The old subscriptions table is intentionally not dropped or rewritten. Its
-- existing public read policy remains only for the compatibility window; the
-- application must move to public_subscription_entitlements before that
-- legacy policy is removed in a follow-up migration.
