-- REVIEW ONLY: Media & Feed transfer.
-- Do not execute in production without owner approval and a storage/RLS review.
-- This extends the existing Feed post model; it does not replace it.

CREATE TABLE IF NOT EXISTS public.feed_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  bytes BIGINT NOT NULL CHECK (bytes > 0),
  caption TEXT,
  credit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, storage_path)
);

CREATE INDEX IF NOT EXISTS feed_post_media_post_idx ON public.feed_post_media (post_id, created_at);
CREATE INDEX IF NOT EXISTS feed_post_media_owner_idx ON public.feed_post_media (owner_id, created_at DESC);

GRANT SELECT ON public.feed_post_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feed_post_media TO authenticated;
GRANT ALL ON public.feed_post_media TO service_role;
ALTER TABLE public.feed_post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_post_media_public_read" ON public.feed_post_media FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND (p.status = 'published' OR p.author_id = auth.uid() OR public.has_min_role(auth.uid(), 'moderator'))));
CREATE POLICY "feed_post_media_owner_insert" ON public.feed_post_media FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = auth.uid() AND p.status = 'pending'));
CREATE POLICY "feed_post_media_owner_update" ON public.feed_post_media FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_min_role(auth.uid(), 'moderator'))
  WITH CHECK (owner_id = auth.uid() OR public.has_min_role(auth.uid(), 'moderator'));
CREATE POLICY "feed_post_media_owner_delete" ON public.feed_post_media FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_min_role(auth.uid(), 'moderator'));
