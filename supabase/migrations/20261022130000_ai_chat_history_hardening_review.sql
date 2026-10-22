-- AI chat history hardening — REVIEW ONLY.
-- Do not execute automatically: staging and production share Supabase.
-- This extends the already-reconciled owner-scoped AI chat tables without
-- changing published content, editorial data, Task 70 or advertisements.

ALTER TABLE public.ai_chat_threads
  ADD COLUMN IF NOT EXISTS context_url TEXT;

ALTER TABLE public.ai_chat_messages
  ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS client_message_id UUID,
  ADD COLUMN IF NOT EXISTS generation_status TEXT NOT NULL DEFAULT 'complete';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_chat_messages_evidence_array_check'
      AND conrelid = 'public.ai_chat_messages'::regclass
  ) THEN
    ALTER TABLE public.ai_chat_messages
      ADD CONSTRAINT ai_chat_messages_evidence_array_check
      CHECK (jsonb_typeof(evidence) = 'array');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_chat_messages_generation_status_check'
      AND conrelid = 'public.ai_chat_messages'::regclass
  ) THEN
    ALTER TABLE public.ai_chat_messages
      ADD CONSTRAINT ai_chat_messages_generation_status_check
      CHECK (generation_status IN ('pending', 'complete', 'failed'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ai_chat_messages_client_request_idx
  ON public.ai_chat_messages (thread_id, user_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

-- Rollback, after confirming no dependent application version remains:
-- ALTER TABLE public.ai_chat_messages DROP CONSTRAINT IF EXISTS ai_chat_messages_evidence_array_check;
-- ALTER TABLE public.ai_chat_messages DROP CONSTRAINT IF EXISTS ai_chat_messages_generation_status_check;
-- DROP INDEX IF EXISTS public.ai_chat_messages_client_request_idx;
-- ALTER TABLE public.ai_chat_messages DROP COLUMN IF EXISTS evidence;
-- ALTER TABLE public.ai_chat_messages DROP COLUMN IF EXISTS client_message_id;
-- ALTER TABLE public.ai_chat_messages DROP COLUMN IF EXISTS generation_status;
-- ALTER TABLE public.ai_chat_threads DROP COLUMN IF EXISTS context_url;
