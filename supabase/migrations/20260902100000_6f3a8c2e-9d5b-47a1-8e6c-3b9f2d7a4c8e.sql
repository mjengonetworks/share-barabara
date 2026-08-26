-- ===== REFERRAL SYSTEM =====
-- 5 points to the referrer when their referee signs up, +15 more when that
-- referee subscribes to premium. Award state lives on public.referrals so
-- both events are idempotent even if triggered more than once (e.g. a
-- subscription being reactivated later doesn't pay out twice).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_points INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  candidate TEXT;
BEGIN
  LOOP
    candidate := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 7));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_referral_code ON public.profiles;
CREATE TRIGGER profiles_set_referral_code BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

-- Backfill codes for accounts that already existed.
UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code_used TEXT NOT NULL,
  signup_awarded_at TIMESTAMPTZ,
  subscribe_awarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (referrer_id <> referee_id)
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
-- No direct INSERT/UPDATE policies: writes only happen through
-- apply_referral_code() and the subscription-award trigger below, both
-- SECURITY DEFINER, so a client can't fabricate or double-claim a referral.
CREATE POLICY "referrals_read_own_or_staff" ON public.referrals FOR SELECT TO authenticated
  USING (
    auth.uid() = referrer_id OR auth.uid() = referee_id OR public.has_min_role(auth.uid(),'moderator')
  );

-- Called by the newly-signed-up user (any auth method) with the code they
-- arrived with, or one they typed in manually as a fallback. Safe to call
-- more than once: no-ops once this user already has a referral row.
CREATE OR REPLACE FUNCTION public.apply_referral_code(_code TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _referrer_id UUID;
  _referee_id UUID := auth.uid();
BEGIN
  IF _referee_id IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;
  IF _code IS NULL OR trim(_code) = '' THEN
    RETURN FALSE;
  END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referee_id = _referee_id) THEN
    RETURN FALSE;
  END IF;
  SELECT id INTO _referrer_id FROM public.profiles WHERE referral_code = upper(trim(_code));
  IF _referrer_id IS NULL OR _referrer_id = _referee_id THEN
    RETURN FALSE;
  END IF;
  INSERT INTO public.referrals (referrer_id, referee_id, code_used, signup_awarded_at)
  VALUES (_referrer_id, _referee_id, upper(trim(_code)), now());
  UPDATE public.profiles SET referral_points = referral_points + 5 WHERE id = _referrer_id;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_referral_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;

-- Fires whenever a subscription becomes active (manual admin activation
-- today, a future payment webhook later) and pays the +15 bonus once.
CREATE OR REPLACE FUNCTION public.award_referral_subscribe_bonus()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _referrer_id UUID;
BEGIN
  IF NEW.active AND (TG_OP = 'INSERT' OR NOT COALESCE(OLD.active, false)) THEN
    SELECT referrer_id INTO _referrer_id FROM public.referrals
    WHERE referee_id = NEW.user_id AND subscribe_awarded_at IS NULL
    FOR UPDATE;
    IF _referrer_id IS NOT NULL THEN
      UPDATE public.referrals SET subscribe_awarded_at = now() WHERE referee_id = NEW.user_id;
      UPDATE public.profiles SET referral_points = referral_points + 15 WHERE id = _referrer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_award_referral ON public.subscriptions;
CREATE TRIGGER subscriptions_award_referral AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.award_referral_subscribe_bonus();
