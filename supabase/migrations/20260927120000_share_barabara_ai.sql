-- Share Barabara AI public-boundary hardening and authenticated chat persistence.
-- Review and apply through the normal Supabase migration workflow; this file is
-- intentionally not executed by the application.

DROP POLICY IF EXISTS "news_public_read" ON public.news;
DROP POLICY IF EXISTS "news_public_read_published" ON public.news;
CREATE POLICY "news_public_read_published" ON public.news FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "alerts_public_read" ON public.alerts;
DROP POLICY IF EXISTS "alerts_public_read_active" ON public.alerts;
CREATE POLICY "alerts_public_read_active" ON public.alerts FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "alerts_authenticated_read" ON public.alerts;
CREATE POLICY "alerts_authenticated_read" ON public.alerts FOR SELECT TO authenticated
  USING (
    status = 'active'
    OR auth.uid() = user_id
    OR public.has_min_role(auth.uid(),'moderator')
  );

-- Reports already use the approved/public policy created by the review workflow.

CREATE TABLE IF NOT EXISTS public.ai_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  context_type TEXT NOT NULL DEFAULT 'general'
    CHECK (context_type IN ('article', 'alert', 'report', 'general')),
  context_id UUID,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_chat_threads_id_user_key'
      AND conrelid = 'public.ai_chat_threads'::regclass
  ) THEN
    ALTER TABLE public.ai_chat_threads
      ADD CONSTRAINT ai_chat_threads_id_user_key UNIQUE (id, user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ai_chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 12000),
  citations JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(citations) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_chat_messages_thread_user_fkey
    FOREIGN KEY (thread_id, user_id)
    REFERENCES public.ai_chat_threads (id, user_id) ON DELETE CASCADE
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_chat_messages_thread_user_fkey'
      AND conrelid = 'public.ai_chat_messages'::regclass
  ) THEN
    ALTER TABLE public.ai_chat_messages
      ADD CONSTRAINT ai_chat_messages_thread_user_fkey
      FOREIGN KEY (thread_id, user_id)
      REFERENCES public.ai_chat_threads (id, user_id) ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS ai_chat_threads_user_updated_idx
  ON public.ai_chat_threads (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS ai_chat_messages_thread_created_idx
  ON public.ai_chat_messages (thread_id, created_at ASC);

ALTER TABLE public.ai_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_messages TO authenticated;

DROP POLICY IF EXISTS "ai_chat_threads_owner_read" ON public.ai_chat_threads;
CREATE POLICY "ai_chat_threads_owner_read" ON public.ai_chat_threads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_chat_threads_owner_insert" ON public.ai_chat_threads;
CREATE POLICY "ai_chat_threads_owner_insert" ON public.ai_chat_threads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_chat_threads_owner_update" ON public.ai_chat_threads;
CREATE POLICY "ai_chat_threads_owner_update" ON public.ai_chat_threads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_chat_threads_owner_delete" ON public.ai_chat_threads;
CREATE POLICY "ai_chat_threads_owner_delete" ON public.ai_chat_threads
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_chat_messages_owner_read" ON public.ai_chat_messages;
CREATE POLICY "ai_chat_messages_owner_read" ON public.ai_chat_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_chat_messages_owner_insert" ON public.ai_chat_messages;
CREATE POLICY "ai_chat_messages_owner_insert" ON public.ai_chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.ai_chat_threads t
      WHERE t.id = thread_id AND t.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "ai_chat_messages_owner_delete" ON public.ai_chat_messages;
CREATE POLICY "ai_chat_messages_owner_delete" ON public.ai_chat_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS ai_chat_threads_touch ON public.ai_chat_threads;
CREATE TRIGGER ai_chat_threads_touch BEFORE UPDATE ON public.ai_chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
