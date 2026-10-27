-- Cross-content editorial drafts, tags, relationships, and provenance.
-- Additive only: no existing content is backfilled or modified.

CREATE TABLE public.editorial_conversion_targets (
  source_type TEXT NOT NULL CHECK (source_type IN ('article','report','alert','campaign','infrastructure')),
  target_type TEXT NOT NULL CHECK (target_type IN ('article','report','alert','campaign','infrastructure')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  required_source_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source_type, target_type),
  CHECK (source_type <> target_type),
  CHECK (jsonb_typeof(required_source_fields) = 'array')
);

INSERT INTO public.editorial_conversion_targets(source_type,target_type,required_source_fields) VALUES
 ('article','report','["title","body"]'),('report','article','["title","description"]'),
 ('article','alert','["title","body"]'),('alert','article','["title","description"]'),
 ('article','campaign','["title","summary"]'),('campaign','article','["title","description"]'),
 ('article','infrastructure','["title","body"]'),('infrastructure','article','["title","summary","content"]'),
 ('report','alert','["title","description","county"]'),('alert','report','["title","description","county"]'),
 ('report','infrastructure','["title","description","county"]'),('infrastructure','alert','["title","summary","road_name"]')
ON CONFLICT DO NOTHING;

CREATE TABLE public.editorial_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (slug = lower(slug) AND slug ~ '^[a-z0-9][a-z0-9-]*$'),
  CHECK (length(btrim(label)) > 0)
);
CREATE UNIQUE INDEX editorial_tags_slug_uq ON public.editorial_tags(slug);
CREATE UNIQUE INDEX editorial_tags_label_ci_uq ON public.editorial_tags(lower(btrim(label)));

CREATE TABLE public.editorial_content_tags (
  content_type TEXT NOT NULL CHECK (content_type IN ('article','report','alert','campaign','infrastructure')),
  content_id UUID NOT NULL,
  tag_id UUID NOT NULL REFERENCES public.editorial_tags(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (content_type, content_id, tag_id)
);
CREATE INDEX editorial_content_tags_tag_idx ON public.editorial_content_tags(tag_id,content_type,content_id);
CREATE INDEX editorial_content_tags_content_idx ON public.editorial_content_tags(content_type,content_id);

CREATE TABLE public.editorial_content_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('article','report','alert','campaign','infrastructure')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('article','report','alert','campaign','infrastructure')),
  target_id UUID NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('related','derived_from','follows_up','covers')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  generation_request_id UUID,
  provider TEXT,
  prompt_version TEXT,
  source_snapshot_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT (source_type=target_type AND source_id=target_id)),
  UNIQUE(source_type,source_id,target_type,target_id,relationship_type)
);
CREATE INDEX editorial_relationships_source_idx ON public.editorial_content_relationships(source_type,source_id,created_at DESC);
CREATE INDEX editorial_relationships_target_idx ON public.editorial_content_relationships(target_type,target_id,created_at DESC);
CREATE INDEX editorial_relationships_request_idx ON public.editorial_content_relationships(generation_request_id) WHERE generation_request_id IS NOT NULL;

CREATE TABLE public.editorial_related_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('article','report','alert','campaign','infrastructure')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('article','report','alert','campaign','infrastructure')),
  target_id UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','saved','abandoned','expired')),
  provider TEXT CHECK (provider IS NULL OR provider IN ('groq','grok')),
  prompt_version TEXT,
  generation_request_id UUID NOT NULL UNIQUE,
  source_snapshot JSONB NOT NULL CHECK (jsonb_typeof(source_snapshot)='object'),
  source_snapshot_hash TEXT NOT NULL,
  generated_draft JSONB NOT NULL CHECK (jsonb_typeof(generated_draft)='object'),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  CHECK (source_type <> target_type),
  CHECK ((status='saved') = (target_id IS NOT NULL))
);
CREATE UNIQUE INDEX editorial_related_drafts_open_uq ON public.editorial_related_drafts
  (created_by,source_type,source_id,target_type,source_snapshot_hash) WHERE status='open';
CREATE INDEX editorial_related_drafts_source_idx ON public.editorial_related_drafts(source_type,source_id,created_at DESC);

CREATE TABLE public.editorial_generation_events (
  request_id UUID PRIMARY KEY,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  source_type TEXT NOT NULL CHECK (source_type IN ('article','report','alert','campaign','infrastructure')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('article','report','alert','campaign','infrastructure')),
  provider TEXT NOT NULL CHECK (provider IN ('groq','grok')),
  prompt_version TEXT NOT NULL,
  source_snapshot_hash TEXT NOT NULL,
  output_hash TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('started','succeeded','failed')),
  safe_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX editorial_generation_events_actor_idx ON public.editorial_generation_events(actor_id,created_at DESC);
CREATE INDEX editorial_generation_events_source_idx ON public.editorial_generation_events(source_type,source_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.editorial_content_table(_type TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT CASE _type WHEN 'article' THEN 'news' WHEN 'report' THEN 'accident_reports'
    WHEN 'alert' THEN 'alerts' WHEN 'campaign' THEN 'campaigns'
    WHEN 'infrastructure' THEN 'infrastructure_issues' ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.editorial_content_exists(_type TEXT,_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t TEXT := public.editorial_content_table(_type); ok BOOLEAN;
BEGIN
  IF t IS NULL OR _id IS NULL THEN RETURN false; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id=$1)',t) INTO ok USING _id;
  RETURN ok;
END $$;

CREATE OR REPLACE FUNCTION public.editorial_content_is_public(_type TEXT,_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE ok BOOLEAN;
BEGIN
  IF _type='article' THEN SELECT EXISTS(SELECT 1 FROM public.news WHERE id=_id AND status='published') INTO ok;
  ELSIF _type='report' THEN SELECT EXISTS(SELECT 1 FROM public.accident_reports WHERE id=_id AND status='approved') INTO ok;
  ELSIF _type='alert' THEN SELECT EXISTS(SELECT 1 FROM public.alerts WHERE id=_id AND status='active') INTO ok;
  ELSIF _type='infrastructure' THEN SELECT EXISTS(SELECT 1 FROM public.infrastructure_issues WHERE id=_id AND status='approved') INTO ok;
  ELSIF _type='campaign' THEN SELECT EXISTS(SELECT 1 FROM public.campaigns WHERE id=_id AND (end_date>=CURRENT_DATE OR report_published)) INTO ok;
  ELSE ok := false;
  END IF;
  RETURN ok;
END $$;

CREATE OR REPLACE FUNCTION public.editorial_can_edit_content(_type TEXT,_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE ok BOOLEAN;
BEGIN
  IF _type='article' THEN SELECT EXISTS(SELECT 1 FROM public.news WHERE id=_id AND public.has_role(auth.uid(),'admin')) INTO ok;
  ELSIF _type='report' THEN SELECT EXISTS(SELECT 1 FROM public.accident_reports WHERE id=_id AND (user_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))) INTO ok;
  ELSIF _type='alert' THEN SELECT EXISTS(SELECT 1 FROM public.alerts WHERE id=_id AND (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))) INTO ok;
  ELSIF _type='campaign' THEN SELECT EXISTS(SELECT 1 FROM public.campaigns WHERE id=_id AND public.has_min_role(auth.uid(),'editor')) INTO ok;
  ELSIF _type='infrastructure' THEN SELECT EXISTS(SELECT 1 FROM public.infrastructure_issues WHERE id=_id AND ((user_id=auth.uid() AND status<>'approved') OR public.has_min_role(auth.uid(),'moderator'))) INTO ok;
  ELSE ok := false;
  END IF;
  RETURN ok;
END $$;

CREATE OR REPLACE FUNCTION public.validate_editorial_content_reference()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT public.editorial_content_exists(NEW.content_type,NEW.content_id) THEN RAISE EXCEPTION 'unknown editorial content reference' USING ERRCODE='23503'; END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.validate_editorial_relationship_reference()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT public.editorial_content_exists(NEW.source_type,NEW.source_id) OR NOT public.editorial_content_exists(NEW.target_type,NEW.target_id) THEN RAISE EXCEPTION 'unknown editorial relationship endpoint' USING ERRCODE='23503'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER editorial_content_tags_reference_trg BEFORE INSERT OR UPDATE ON public.editorial_content_tags FOR EACH ROW EXECUTE FUNCTION public.validate_editorial_content_reference();
CREATE TRIGGER editorial_relationships_reference_trg BEFORE INSERT OR UPDATE ON public.editorial_content_relationships FOR EACH ROW EXECUTE FUNCTION public.validate_editorial_relationship_reference();

ALTER TABLE public.editorial_conversion_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_content_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_related_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_generation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversion_targets_editor_read ON public.editorial_conversion_targets FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY conversion_targets_admin_write ON public.editorial_conversion_targets FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY tags_editor_read ON public.editorial_tags FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY tags_editor_insert ON public.editorial_tags FOR INSERT TO authenticated WITH CHECK (public.has_min_role(auth.uid(),'editor') AND created_by=auth.uid());
CREATE POLICY tags_editor_update ON public.editorial_tags FOR UPDATE TO authenticated USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY tags_admin_delete ON public.editorial_tags FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY content_tags_editor_read ON public.editorial_content_tags FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(),'editor'));
-- Tag assignment mutations are RPC-only. The RPC checks edit permission for the
-- referenced content before inserting or deleting an assignment.
CREATE POLICY relationships_editor_read ON public.editorial_content_relationships FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(),'editor'));
-- Relationship mutations are RPC-only so endpoint permissions are checked atomically.
CREATE POLICY drafts_editor_read ON public.editorial_related_drafts FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(),'editor') AND (created_by=auth.uid() OR public.has_role(auth.uid(),'admin')));
-- Draft creation and edits are RPC-only; direct table writes are denied by RLS.
CREATE POLICY generation_events_owner_read ON public.editorial_generation_events FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(),'editor') AND (actor_id=auth.uid() OR public.has_role(auth.uid(),'admin')));

GRANT SELECT ON public.editorial_conversion_targets TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.editorial_tags TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.editorial_content_tags TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.editorial_content_relationships TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.editorial_related_drafts TO authenticated;
GRANT SELECT ON public.editorial_generation_events TO authenticated;
GRANT ALL ON public.editorial_conversion_targets,public.editorial_tags,public.editorial_content_tags,public.editorial_content_relationships,public.editorial_related_drafts,public.editorial_generation_events TO service_role;

CREATE OR REPLACE FUNCTION public.editorial_register_related_draft(
  _source_type TEXT,_source_id UUID,_target_type TEXT,_request_id UUID,_provider TEXT,
  _prompt_version TEXT,_source_snapshot JSONB,_source_snapshot_hash TEXT,_generated_draft JSONB)
RETURNS public.editorial_related_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.editorial_related_drafts;
BEGIN
  IF NOT public.has_min_role(auth.uid(),'editor') THEN RAISE EXCEPTION 'editor role required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.editorial_conversion_targets WHERE source_type=_source_type AND target_type=_target_type AND enabled) THEN RAISE EXCEPTION 'conversion is not enabled'; END IF;
  IF NOT public.editorial_content_exists(_source_type,_source_id) OR NOT public.editorial_can_edit_content(_source_type,_source_id) THEN RAISE EXCEPTION 'source is unavailable or not editable'; END IF;
  IF EXISTS(SELECT 1 FROM public.editorial_content_relationships WHERE source_type=_source_type AND source_id=_source_id AND target_type=_target_type AND relationship_type='derived_from') THEN RAISE EXCEPTION 'saved related record already exists'; END IF;
  INSERT INTO public.editorial_related_drafts(source_type,source_id,target_type,provider,prompt_version,generation_request_id,source_snapshot,source_snapshot_hash,generated_draft,created_by)
    VALUES(_source_type,_source_id,_target_type,_provider,_prompt_version,_request_id,_source_snapshot,_source_snapshot_hash,_generated_draft,auth.uid())
    ON CONFLICT (created_by,source_type,source_id,target_type,source_snapshot_hash) WHERE status='open'
    DO UPDATE SET generated_draft=EXCLUDED.generated_draft,updated_at=now() RETURNING * INTO r;
  INSERT INTO public.editorial_generation_events(request_id,actor_id,source_type,source_id,target_type,provider,prompt_version,source_snapshot_hash,outcome,completed_at)
    VALUES(_request_id,auth.uid(),_source_type,_source_id,_target_type,_provider,_prompt_version,_source_snapshot_hash,'succeeded',now())
    ON CONFLICT (request_id) DO NOTHING;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.editorial_assign_tag(_type TEXT,_id UUID,_tag UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT public.has_min_role(auth.uid(),'editor') OR NOT public.editorial_can_edit_content(_type,_id) THEN RAISE EXCEPTION 'content edit permission required'; END IF;
  INSERT INTO public.editorial_content_tags(content_type,content_id,tag_id,created_by) VALUES(_type,_id,_tag,auth.uid()) ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.editorial_link_content(
  _source_type TEXT,_source_id UUID,_target_type TEXT,_target_id UUID,
  _relationship_type TEXT DEFAULT 'related',_generation_request_id UUID DEFAULT NULL,
  _provider TEXT DEFAULT NULL,_prompt_version TEXT DEFAULT NULL,_source_snapshot_hash TEXT DEFAULT NULL)
RETURNS public.editorial_content_relationships LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.editorial_content_relationships;
BEGIN
  IF NOT public.has_min_role(auth.uid(),'editor') OR NOT public.editorial_can_edit_content(_source_type,_source_id) THEN RAISE EXCEPTION 'source edit permission required'; END IF;
  IF NOT public.editorial_content_exists(_source_type,_source_id) OR NOT public.editorial_content_exists(_target_type,_target_id) THEN RAISE EXCEPTION 'relationship endpoint does not exist' USING ERRCODE='23503'; END IF;
  IF NOT (public.editorial_content_is_public(_target_type,_target_id) OR public.editorial_can_edit_content(_target_type,_target_id)) THEN RAISE EXCEPTION 'target visibility or edit permission required'; END IF;
  INSERT INTO public.editorial_content_relationships(source_type,source_id,target_type,target_id,relationship_type,created_by,generation_request_id,provider,prompt_version,source_snapshot_hash)
    VALUES(_source_type,_source_id,_target_type,_target_id,_relationship_type,auth.uid(),_generation_request_id,_provider,_prompt_version,_source_snapshot_hash)
    ON CONFLICT DO NOTHING RETURNING * INTO r;
  IF r.id IS NULL THEN SELECT * INTO r FROM public.editorial_content_relationships WHERE source_type=_source_type AND source_id=_source_id AND target_type=_target_type AND target_id=_target_id AND relationship_type=_relationship_type; END IF;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.editorial_unlink_content(_relationship_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.editorial_content_relationships;
BEGIN
  SELECT * INTO r FROM public.editorial_content_relationships WHERE id=_relationship_id;
  IF NOT FOUND OR NOT public.has_min_role(auth.uid(),'editor') OR NOT public.editorial_can_edit_content(r.source_type,r.source_id) THEN RAISE EXCEPTION 'relationship removal permission denied'; END IF;
  DELETE FROM public.editorial_content_relationships WHERE id=_relationship_id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.editorial_update_related_draft(_draft_id UUID,_generated_draft JSONB)
RETURNS public.editorial_related_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.editorial_related_drafts;
BEGIN
  UPDATE public.editorial_related_drafts SET generated_draft=_generated_draft,updated_at=now()
    WHERE id=_draft_id AND status='open' AND public.has_min_role(auth.uid(),'editor') AND (created_by=auth.uid() OR public.has_role(auth.uid(),'admin'))
    RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'draft update permission denied'; END IF;
  RETURN r;
END $$;
CREATE OR REPLACE FUNCTION public.editorial_finalize_related_draft(_draft_id UUID,_target_type TEXT,_target_id UUID)
RETURNS public.editorial_related_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d public.editorial_related_drafts;
BEGIN
  SELECT * INTO d FROM public.editorial_related_drafts WHERE id=_draft_id AND status='open';
  IF NOT FOUND OR NOT public.has_min_role(auth.uid(),'editor') OR NOT public.editorial_can_edit_content(d.source_type,d.source_id) THEN
    RAISE EXCEPTION 'draft finalization permission denied';
  END IF;
  IF d.target_type<>_target_type OR NOT public.editorial_content_exists(_target_type,_target_id)
     OR NOT (public.editorial_content_is_public(_target_type,_target_id) OR public.editorial_can_edit_content(_target_type,_target_id)) THEN
    RAISE EXCEPTION 'target record is unavailable for this draft';
  END IF;
  UPDATE public.editorial_related_drafts SET status='saved',target_id=_target_id,updated_at=now() WHERE id=d.id RETURNING * INTO d;
  INSERT INTO public.editorial_content_relationships(source_type,source_id,target_type,target_id,relationship_type,created_by,generation_request_id,provider,prompt_version,source_snapshot_hash)
    VALUES(d.source_type,d.source_id,d.target_type,d.target_id,'derived_from',auth.uid(),d.generation_request_id,d.provider,d.prompt_version,d.source_snapshot_hash)
    ON CONFLICT DO NOTHING;
  RETURN d;
END $$;
CREATE OR REPLACE FUNCTION public.editorial_remove_tag(_type TEXT,_id UUID,_tag UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  DELETE FROM public.editorial_content_tags WHERE content_type=_type AND content_id=_id AND tag_id=_tag AND public.has_min_role(auth.uid(),'editor') AND public.editorial_can_edit_content(_type,_id);
$$;
CREATE OR REPLACE FUNCTION public.editorial_public_related_content(_type TEXT,_id UUID,_limit INTEGER DEFAULT 12)
RETURNS TABLE(related_type TEXT,related_id UUID,relationship_type TEXT,linked_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT r.target_type,r.target_id,r.relationship_type,r.created_at FROM public.editorial_content_relationships r WHERE r.source_type=_type AND r.source_id=_id AND public.editorial_content_is_public(r.target_type,r.target_id)
  UNION ALL
  SELECT r.source_type,r.source_id,r.relationship_type,r.created_at FROM public.editorial_content_relationships r WHERE r.target_type=_type AND r.target_id=_id AND public.editorial_content_is_public(r.source_type,r.source_id)
  ORDER BY linked_at DESC LIMIT LEAST(GREATEST(COALESCE(_limit,12),1),50);
$$;
CREATE OR REPLACE FUNCTION public.editorial_search_tags(_query TEXT,_limit INTEGER DEFAULT 20)
RETURNS SETOF public.editorial_tags LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT * FROM public.editorial_tags WHERE public.has_min_role(auth.uid(),'editor') AND active AND (lower(label) LIKE '%'||lower(COALESCE(_query,''))||'%' OR slug LIKE '%'||lower(COALESCE(_query,''))||'%') ORDER BY label LIMIT LEAST(GREATEST(COALESCE(_limit,20),1),100);
$$;

REVOKE ALL ON FUNCTION public.editorial_content_table(TEXT),public.editorial_content_exists(TEXT,UUID),public.editorial_content_is_public(TEXT,UUID),public.editorial_can_edit_content(TEXT,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.editorial_register_related_draft(TEXT,UUID,TEXT,UUID,TEXT,TEXT,JSONB,TEXT,JSONB),public.editorial_assign_tag(TEXT,UUID,UUID),public.editorial_remove_tag(TEXT,UUID,UUID),public.editorial_link_content(TEXT,UUID,TEXT,UUID,TEXT,UUID,TEXT,TEXT,TEXT),public.editorial_unlink_content(UUID),public.editorial_update_related_draft(UUID,JSONB),public.editorial_finalize_related_draft(UUID,TEXT,UUID),public.editorial_search_tags(TEXT,INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.editorial_register_related_draft(TEXT,UUID,TEXT,UUID,TEXT,TEXT,JSONB,TEXT,JSONB),public.editorial_assign_tag(TEXT,UUID,UUID),public.editorial_remove_tag(TEXT,UUID,UUID),public.editorial_link_content(TEXT,UUID,TEXT,UUID,TEXT,UUID,TEXT,TEXT,TEXT),public.editorial_unlink_content(UUID),public.editorial_update_related_draft(UUID,JSONB),public.editorial_finalize_related_draft(UUID,TEXT,UUID),public.editorial_search_tags(TEXT,INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.editorial_public_related_content(TEXT,UUID,INTEGER) TO anon,authenticated;
