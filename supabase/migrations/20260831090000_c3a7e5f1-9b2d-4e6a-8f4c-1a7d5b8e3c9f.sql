-- ===== Usernames, classification fields, newsletter, content requests =====

-- ----- Unique usernames for profiles, used as the public profile URL slug -----
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Backfill existing profiles with a slug derived from display_name, deduped
-- with a short fragment of their id (guarantees uniqueness without a loop).
UPDATE public.profiles
SET username = trim(both '-' from regexp_replace(lower(coalesce(display_name, 'user')), '[^a-z0-9]+', '-', 'g'))
  || '-' || substr(replace(id::text, '-', ''), 1, 6)
WHERE username IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1), 'Road user'),
    trim(both '-' from regexp_replace(
      lower(COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1), 'user')),
      '[^a-z0-9]+', '-', 'g'
    )) || '-' || substr(replace(NEW.id::text, '-', ''), 1, 6)
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- ----- "Who was involved" classification for alerts and accident reports -----
-- Free-form controlled list (kept as text[] rather than an enum so the
-- front-end constant list can grow without a migration each time).
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS parties_involved TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS parties_involved TEXT[] NOT NULL DEFAULT '{}';

-- ----- Featured image for accident reports (news already has image_url) -----
ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ----- Admin-editable click-through link on a hub_stats tile -----
ALTER TABLE public.hub_stats ADD COLUMN IF NOT EXISTS link_url TEXT;

-- ----- Newsletter subscribers -----
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletter_insert_anyone" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "newsletter_admin_read" ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ----- Requests to edit or remove an alert / report / article you submitted -----
-- Lightweight submission only for now; the review queue for these lands
-- alongside the rest of the admin/moderator tooling.
CREATE TABLE public.content_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  request_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT ON public.content_requests TO authenticated;
GRANT ALL ON public.content_requests TO service_role;
ALTER TABLE public.content_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_requests_insert_own" ON public.content_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "content_requests_read_own_or_staff" ON public.content_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role(auth.uid(), 'moderator'));
