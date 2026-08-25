
-- ===== VIDEOS =====
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX videos_status_idx ON public.videos (status, created_at DESC);
GRANT SELECT ON public.videos TO anon, authenticated;
GRANT INSERT ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "videos_read" ON public.videos FOR SELECT
  USING (status = 'featured' OR auth.uid() = user_id OR public.has_min_role(auth.uid(),'moderator'));
CREATE POLICY "videos_insert_own" ON public.videos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending_review');
CREATE POLICY "videos_update_editor" ON public.videos FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY "videos_delete_own_or_editor" ON public.videos FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role(auth.uid(),'editor'));
