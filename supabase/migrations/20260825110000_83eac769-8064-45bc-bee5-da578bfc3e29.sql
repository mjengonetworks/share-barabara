-- ===== PAGES (organisation profiles) =====
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  description TEXT,
  county TEXT,
  logo_url TEXT,
  website_url TEXT,
  phone TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pages TO authenticated;
GRANT ALL ON public.pages TO service_role;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages_public_read" ON public.pages FOR SELECT USING (true);
CREATE POLICY "pages_insert_own" ON public.pages FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "pages_update_own" ON public.pages FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pages_delete_own" ON public.pages FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE INDEX pages_owner_idx ON public.pages (owner_id);
CREATE INDEX pages_category_idx ON public.pages (category);
CREATE TRIGGER pages_touch BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Verification is a paid, admin-activated status (see /subscribe): an owner
-- can edit their own page freely but cannot flip verified themselves.
CREATE OR REPLACE FUNCTION public.guard_page_verify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified
     AND NOT public.has_role(auth.uid(),'admin')
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Only an admin can change page verification';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pages_guard_verify BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.guard_page_verify();
