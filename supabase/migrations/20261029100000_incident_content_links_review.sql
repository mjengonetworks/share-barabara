-- Additive Alert -> canonical Accident Report relationships.
-- Review candidate only: do not apply until the production schema audit and
-- migration order are approved by the owner.

CREATE TABLE IF NOT EXISTS public.incident_content_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_report_id UUID NOT NULL REFERENCES public.accident_reports(id) ON DELETE RESTRICT,
  content_type TEXT NOT NULL DEFAULT 'alert' CHECK (content_type = 'alert'),
  content_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'revoked')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  review_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS incident_content_links_one_confirmed_content
  ON public.incident_content_links (content_type, content_id)
  WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS incident_content_links_report_idx
  ON public.incident_content_links (canonical_report_id, status);
CREATE INDEX IF NOT EXISTS incident_content_links_content_idx
  ON public.incident_content_links (content_type, content_id, status);

-- This is an audit log, not a second relationship model. Rows are written only
-- by the SECURITY DEFINER relationship functions below.
CREATE TABLE IF NOT EXISTS public.incident_content_link_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.incident_content_links(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('confirmed', 'corrected', 'revoked')),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_report_id UUID REFERENCES public.accident_reports(id) ON DELETE SET NULL,
  new_report_id UUID REFERENCES public.accident_reports(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS incident_content_link_history_link_idx
  ON public.incident_content_link_history (link_id, created_at DESC);

ALTER TABLE public.incident_content_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_content_link_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.incident_content_links FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.incident_content_link_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.incident_content_links TO anon, authenticated;
GRANT SELECT ON public.incident_content_link_history TO authenticated;
GRANT ALL ON public.incident_content_links, public.incident_content_link_history TO service_role;

DROP POLICY IF EXISTS incident_content_links_public_confirmed_read ON public.incident_content_links;
CREATE POLICY incident_content_links_public_confirmed_read
  ON public.incident_content_links FOR SELECT
  USING (status = 'confirmed');

DROP POLICY IF EXISTS incident_content_links_editor_review_read ON public.incident_content_links;
CREATE POLICY incident_content_links_editor_review_read
  ON public.incident_content_links FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS incident_content_link_history_editor_read ON public.incident_content_link_history;
CREATE POLICY incident_content_link_history_editor_read
  ON public.incident_content_link_history FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'));

CREATE OR REPLACE FUNCTION public.confirm_incident_content_link(
  _alert_id UUID,
  _canonical_report_id UUID,
  _suggestion_id UUID DEFAULT NULL,
  _note TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_link public.incident_content_links;
  link_id UUID;
  note_text TEXT := left(trim(coalesce(_note, '')), 1000);
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_min_role(auth.uid(), 'editor') THEN
    RAISE EXCEPTION 'Only editors can confirm incident relationships';
  END IF;
  IF _alert_id IS NULL OR _canonical_report_id IS NULL THEN
    RAISE EXCEPTION 'Both an Alert and an Accident Report are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.alerts WHERE id = _alert_id) THEN
    RAISE EXCEPTION 'Alert not found';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.accident_reports
    WHERE id = _canonical_report_id AND status = 'approved' AND duplicate_of_report_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Canonical Accident Report must be approved';
  END IF;
  IF _suggestion_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.incident_duplicate_suggestions s
    WHERE s.id = _suggestion_id
      AND s.status IN ('suggested', 'confirmed')
      AND (
        (s.candidate_type = 'alert' AND s.candidate_id = _alert_id AND s.target_type = 'report' AND s.target_id = _canonical_report_id)
        OR (s.target_type = 'alert' AND s.target_id = _alert_id AND s.candidate_type = 'report' AND s.candidate_id = _canonical_report_id)
      )
  ) THEN
    RAISE EXCEPTION 'Suggestion does not match the selected Alert and approved Report';
  END IF;

  SELECT * INTO existing_link
  FROM public.incident_content_links
  WHERE content_type = 'alert' AND content_id = _alert_id AND status = 'confirmed'
  FOR UPDATE;

  IF existing_link.id IS NOT NULL AND existing_link.canonical_report_id <> _canonical_report_id THEN
    RAISE EXCEPTION 'Alert is already linked; use the correction workflow';
  END IF;

  IF existing_link.id IS NULL THEN
    INSERT INTO public.incident_content_links
      (canonical_report_id, content_type, content_id, reviewed_by, reviewed_at, review_note)
    VALUES
      (_canonical_report_id, 'alert', _alert_id, auth.uid(), now(), note_text)
    RETURNING id INTO link_id;
    INSERT INTO public.incident_content_link_history
      (link_id, action, actor_id, new_report_id, note)
    VALUES
      (link_id, 'confirmed', auth.uid(), _canonical_report_id, note_text);
  ELSE
    link_id := existing_link.id;
    UPDATE public.incident_content_links
    SET reviewed_by = auth.uid(), reviewed_at = now(), review_note = note_text
    WHERE id = link_id;
  END IF;

  IF _suggestion_id IS NOT NULL THEN
    UPDATE public.incident_duplicate_suggestions
    SET status = 'confirmed', reviewed_by = auth.uid(), reviewed_at = now(), review_note = note_text
    WHERE id = _suggestion_id AND status = 'suggested';
  END IF;
  RETURN link_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_incident_relationship_suggestion(
  _suggestion_id UUID,
  _note TEXT DEFAULT 'Rejected during editorial relationship review.'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_min_role(auth.uid(), 'editor') THEN
    RAISE EXCEPTION 'Only editors can reject incident relationship suggestions';
  END IF;
  UPDATE public.incident_duplicate_suggestions
  SET status = 'not_duplicate', reviewed_by = auth.uid(), reviewed_at = now(), review_note = left(trim(coalesce(_note, '')), 1000)
  WHERE id = _suggestion_id AND status = 'suggested'
    AND ((candidate_type = 'alert' AND target_type = 'report') OR (candidate_type = 'report' AND target_type = 'alert'));
  IF NOT FOUND THEN RAISE EXCEPTION 'Suggestion not found or already reviewed'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.correct_incident_content_link(
  _link_id UUID,
  _canonical_report_id UUID,
  _note TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_row public.incident_content_links;
  note_text TEXT := left(trim(coalesce(_note, '')), 1000);
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_min_role(auth.uid(), 'editor') THEN
    RAISE EXCEPTION 'Only editors can correct incident relationships';
  END IF;
  IF _note IS NULL OR trim(_note) = '' THEN RAISE EXCEPTION 'A correction note is required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.accident_reports
    WHERE id = _canonical_report_id AND status = 'approved' AND duplicate_of_report_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Replacement canonical Accident Report must be approved';
  END IF;
  SELECT * INTO link_row FROM public.incident_content_links
  WHERE id = _link_id AND status = 'confirmed' FOR UPDATE;
  IF link_row.id IS NULL THEN RAISE EXCEPTION 'Confirmed relationship not found'; END IF;
  IF link_row.canonical_report_id = _canonical_report_id THEN RAISE EXCEPTION 'Choose a different canonical Report'; END IF;
  UPDATE public.incident_content_links
  SET canonical_report_id = _canonical_report_id, reviewed_by = auth.uid(), reviewed_at = now(), review_note = note_text
  WHERE id = _link_id;
  INSERT INTO public.incident_content_link_history
    (link_id, action, actor_id, previous_report_id, new_report_id, note)
  VALUES
    (_link_id, 'corrected', auth.uid(), link_row.canonical_report_id, _canonical_report_id, note_text);
  RETURN _link_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_incident_content_link(
  _link_id UUID,
  _note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_row public.incident_content_links;
  note_text TEXT := left(trim(coalesce(_note, '')), 1000);
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_min_role(auth.uid(), 'editor') THEN
    RAISE EXCEPTION 'Only editors can revoke incident relationships';
  END IF;
  IF _note IS NULL OR trim(_note) = '' THEN RAISE EXCEPTION 'A revocation note is required'; END IF;
  SELECT * INTO link_row FROM public.incident_content_links
  WHERE id = _link_id AND status = 'confirmed' FOR UPDATE;
  IF link_row.id IS NULL THEN RAISE EXCEPTION 'Confirmed relationship not found'; END IF;
  UPDATE public.incident_content_links
  SET status = 'revoked', reviewed_by = auth.uid(), reviewed_at = now(), review_note = note_text
  WHERE id = _link_id;
  INSERT INTO public.incident_content_link_history
    (link_id, action, actor_id, previous_report_id, note)
  VALUES
    (_link_id, 'revoked', auth.uid(), link_row.canonical_report_id, note_text);
END;
$$;

CREATE OR REPLACE FUNCTION public.published_accident_report_count()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM public.accident_reports
  WHERE status = 'approved' AND duplicate_of_report_id IS NULL;
$$;

REVOKE ALL ON FUNCTION public.confirm_incident_content_link(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_incident_relationship_suggestion(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.correct_incident_content_link(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_incident_content_link(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.published_accident_report_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_incident_content_link(uuid, uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_incident_relationship_suggestion(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.correct_incident_content_link(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_incident_content_link(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.published_accident_report_count() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.touch_incident_content_link_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS incident_content_links_touch ON public.incident_content_links;
CREATE TRIGGER incident_content_links_touch
  BEFORE UPDATE ON public.incident_content_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_incident_content_link_updated_at();

COMMENT ON TABLE public.incident_content_links IS
  'Confirmed editor-reviewed links from an Alert to one approved canonical Accident Report. Similarity suggestions never create rows automatically.';
COMMENT ON TABLE public.incident_content_link_history IS
  'Append-only audit history for confirmed, corrected and revoked incident content links.';
