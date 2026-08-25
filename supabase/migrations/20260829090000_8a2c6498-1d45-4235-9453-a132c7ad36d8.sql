-- ===== HUB STATS (admin-editable, shown at the top of /statistics) =====
-- Free-text value (not numeric) so an admin can enter "12,400+" or "38 of 47"
-- just as easily as a plain count.
CREATE TABLE public.hub_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '0',
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.hub_stats TO anon, authenticated;
GRANT ALL ON public.hub_stats TO service_role;
ALTER TABLE public.hub_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hub_stats_public_read" ON public.hub_stats FOR SELECT USING (true);
CREATE POLICY "hub_stats_admin_write" ON public.hub_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER hub_stats_touch BEFORE UPDATE ON public.hub_stats FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Honest starter values (0), meant to be filled in by an admin from the
-- review queue's "Hub stats" tab rather than fabricated marketing numbers.
INSERT INTO public.hub_stats (label, value, sort_order) VALUES
  ('Registered members', '0', 1),
  ('Partner organisations', '0', 2),
  ('Counties reached', '0', 3),
  ('Campaigns run', '0', 4)
ON CONFLICT (label) DO NOTHING;
