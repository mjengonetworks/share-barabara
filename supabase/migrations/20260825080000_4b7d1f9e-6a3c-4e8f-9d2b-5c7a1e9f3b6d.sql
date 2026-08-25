
-- ===== QUOTE OF THE DAY =====
CREATE TABLE public.site_quote (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  quote TEXT NOT NULL,
  author TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.site_quote (id, quote, author)
VALUES (1, 'Every journey home should end at home.', 'Share Barabara')
ON CONFLICT (id) DO NOTHING;
GRANT SELECT ON public.site_quote TO anon, authenticated;
GRANT UPDATE ON public.site_quote TO authenticated;
GRANT ALL ON public.site_quote TO service_role;
ALTER TABLE public.site_quote ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_quote_public_read" ON public.site_quote FOR SELECT USING (true);
CREATE POLICY "site_quote_editor_write" ON public.site_quote FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));

CREATE TABLE public.quote_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quote TEXT NOT NULL,
  author TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.quote_submissions TO authenticated;
GRANT SELECT, UPDATE ON public.quote_submissions TO authenticated;
GRANT ALL ON public.quote_submissions TO service_role;
ALTER TABLE public.quote_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quote_submissions_insert_own" ON public.quote_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quote_submissions_read" ON public.quote_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role(auth.uid(),'moderator'));
CREATE POLICY "quote_submissions_update_editor" ON public.quote_submissions FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));

CREATE OR REPLACE FUNCTION public.notify_moderators_on_quote_submission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id FROM public.user_roles WHERE public.role_rank(role) >= public.role_rank('moderator')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (r.user_id, 'quote_submission', 'New quote of the day suggestion', NEW.quote);
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER quote_submissions_notify AFTER INSERT ON public.quote_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_moderators_on_quote_submission();

-- ===== MERCH =====
CREATE TABLE public.merch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_kes INTEGER NOT NULL,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.merch_items TO anon, authenticated;
GRANT ALL ON public.merch_items TO service_role;
ALTER TABLE public.merch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merch_items_public_read" ON public.merch_items FOR SELECT USING (active = true);
CREATE POLICY "merch_items_editor_read_all" ON public.merch_items FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY "merch_items_editor_write" ON public.merch_items FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));

CREATE TABLE public.merch_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.merch_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  delivery_notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.merch_orders TO anon, authenticated;
GRANT SELECT, UPDATE ON public.merch_orders TO authenticated;
GRANT ALL ON public.merch_orders TO service_role;
ALTER TABLE public.merch_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merch_orders_insert" ON public.merch_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "merch_orders_read_editor" ON public.merch_orders FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY "merch_orders_update_editor" ON public.merch_orders FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
