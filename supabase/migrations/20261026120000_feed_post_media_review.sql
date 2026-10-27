-- REVIEW ONLY: Media & Feed transfer.
-- Do not execute in production without owner approval and a storage/RLS review.
-- This extends the existing Feed post model; it does not replace it.
--
-- Compatibility: the existing public `media` bucket is intentionally not used
-- here. Feed attachments live in a dedicated private bucket and are exposed
-- only through server-created, time-limited signed URLs.
--
-- Rollback safety: do not DROP this table as a rollback. First disable the
-- attachment capability in the UI, preserve/export rows and referenced
-- storage paths, then remove only after confirming no published Feed post
-- depends on them. The feed_posts row and its audit/recycle-bin history must
-- remain authoritative.

-- Fail closed before making any storage or schema change when this review
-- migration is pointed at a database whose Feed contract is different.
DO $$
BEGIN
  IF to_regclass('public.feed_posts') IS NULL THEN
    RAISE EXCEPTION 'feed_post_media migration requires public.feed_posts';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feed_posts' AND column_name = 'author_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feed_posts' AND column_name = 'status'
  ) THEN
    RAISE EXCEPTION 'feed_post_media migration requires feed_posts.author_id and feed_posts.status';
  END IF;
  IF to_regprocedure('public.has_min_role(uuid, public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'feed_post_media migration requires public.has_min_role(uuid, public.app_role)';
  END IF;
  IF NOT has_function_privilege(
    'authenticated',
    'public.has_min_role(uuid, public.app_role)'::regprocedure,
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated must have EXECUTE on public.has_min_role(uuid, public.app_role)';
  END IF;
  IF to_regprocedure('storage.foldername(text)') IS NULL THEN
    RAISE EXCEPTION 'feed_post_media migration requires storage.foldername(text)';
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('feed-media', 'feed-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "feed_media_owner_insert" ON storage.objects;
CREATE POLICY "feed_media_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'feed-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND COALESCE((metadata->>'size')::bigint, 0) BETWEEN 1 AND 52428800
    AND (metadata->>'mimetype' LIKE 'image/%' OR metadata->>'mimetype' LIKE 'video/%')
  );
DROP POLICY IF EXISTS "feed_media_owner_update" ON storage.objects;
CREATE POLICY "feed_media_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'feed-media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'feed-media' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "feed_media_owner_delete" ON storage.objects;
CREATE POLICY "feed_media_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'feed-media' AND (storage.foldername(name))[1] = auth.uid()::text);
-- There is deliberately no client SELECT policy. The server-side signed-URL
-- function authorizes the linked Feed post before using service-role storage
-- access to issue a 15-minute URL. The service-role key never reaches a client.

CREATE TABLE IF NOT EXISTS public.feed_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  bucket_id TEXT NOT NULL DEFAULT 'feed-media' CHECK (bucket_id = 'feed-media'),
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  bytes BIGINT NOT NULL CHECK (bytes BETWEEN 1 AND 52428800),
  caption TEXT CHECK (caption IS NULL OR char_length(caption) <= 1000),
  credit TEXT CHECK (credit IS NULL OR char_length(credit) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT feed_post_media_storage_path_owner_check CHECK (storage_path ~ ('^' || owner_id::text || '/[^/]+$')),
  CONSTRAINT feed_post_media_mime_check CHECK (
    (media_type = 'image' AND mime_type LIKE 'image/%') OR
    (media_type = 'video' AND mime_type LIKE 'video/%')
  ),
  UNIQUE (post_id, storage_path)
);

-- Keep this review migration safe to rerun after an earlier review-only draft.
-- Refuse an incompatible already-created table rather than dropping a legacy
-- public URL column or silently changing existing attachment data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feed_post_media' AND column_name = 'public_url'
  ) THEN
    RAISE EXCEPTION 'feed_post_media has legacy public_url; review/export it before private-storage migration';
  END IF;
  IF to_regclass('public.feed_post_media') IS NOT NULL AND EXISTS (
    SELECT 1
    FROM (VALUES
      ('id'), ('post_id'), ('owner_id'), ('media_type'), ('bucket_id'),
      ('storage_path'), ('filename'), ('mime_type'), ('bytes')
    ) AS required(column_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'feed_post_media'
        AND c.column_name = required.column_name
    )
  ) THEN
    RAISE EXCEPTION 'feed_post_media exists with an incompatible column set; review/export it before private-storage migration';
  END IF;
END $$;

ALTER TABLE public.feed_post_media
  ADD COLUMN IF NOT EXISTS bucket_id TEXT NOT NULL DEFAULT 'feed-media';
ALTER TABLE public.feed_post_media
  DROP CONSTRAINT IF EXISTS feed_post_media_bucket_id_check;
ALTER TABLE public.feed_post_media
  ADD CONSTRAINT feed_post_media_bucket_id_check CHECK (bucket_id = 'feed-media');

CREATE INDEX IF NOT EXISTS feed_post_media_post_idx ON public.feed_post_media (post_id, created_at);
CREATE INDEX IF NOT EXISTS feed_post_media_owner_idx ON public.feed_post_media (owner_id, created_at DESC);

GRANT SELECT ON public.feed_post_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feed_post_media TO authenticated;
GRANT ALL ON public.feed_post_media TO service_role;
ALTER TABLE public.feed_post_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feed_post_media_public_read" ON public.feed_post_media;
CREATE POLICY "feed_post_media_public_read" ON public.feed_post_media FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND (p.status = 'published' OR p.author_id = auth.uid() OR public.has_min_role(auth.uid(), 'moderator'))));
DROP POLICY IF EXISTS "feed_post_media_owner_insert" ON public.feed_post_media;
CREATE POLICY "feed_post_media_owner_insert" ON public.feed_post_media FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = auth.uid() AND p.status = 'pending'));
DROP POLICY IF EXISTS "feed_post_media_owner_update" ON public.feed_post_media;
CREATE POLICY "feed_post_media_owner_update" ON public.feed_post_media FOR UPDATE TO authenticated
  USING ((owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = auth.uid() AND p.status = 'pending')) OR public.has_min_role(auth.uid(), 'moderator'))
  WITH CHECK ((owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = auth.uid() AND p.status = 'pending')) OR public.has_min_role(auth.uid(), 'moderator'));
DROP POLICY IF EXISTS "feed_post_media_owner_delete" ON public.feed_post_media;
CREATE POLICY "feed_post_media_owner_delete" ON public.feed_post_media FOR DELETE TO authenticated
  USING ((owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = auth.uid() AND p.status = 'pending')) OR public.has_min_role(auth.uid(), 'moderator'));
