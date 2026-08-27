-- Structured payload for "suggest an update" requests: optional revised
-- casualty counts and supporting photos/video, alongside the free-text
-- message content_requests already had.
ALTER TABLE public.content_requests ADD COLUMN IF NOT EXISTS casualty_breakdown JSONB;
ALTER TABLE public.content_requests ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]';
