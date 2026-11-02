-- Reviewed additive migration for generic editorial relationships, conversion drafts and provenance.
-- Depends on: 20261029100000_incident_content_links_review.sql and the existing
-- content/RLS migrations for news, reports, alerts, campaigns, infrastructure and feed.
-- It does not replace incident_content_links: Alert <-> approved Accident Report
-- links remain exclusively in that authoritative workflow.
-- Do not execute against production without owner approval.

-- This migration is intentionally fail-closed. It must not silently reuse an
-- object created by another migration or assume a different content schema.
DO $$
DECLARE
  required_table TEXT;
  required_column TEXT;
BEGIN
  FOREACH required_table IN ARRAY ARRAY['news','accident_reports','alerts','campaigns','infrastructure_issues','feed_posts'] LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'cross-content prerequisite table is missing: public.%', required_table;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=required_table AND column_name='deleted_at'
    ) THEN
      RAISE EXCEPTION 'cross-content prerequisite column is missing: public.%.deleted_at', required_table;
    END IF;
  END LOOP;

  IF to_regclass('public.user_roles') IS NULL
     OR to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL
     OR to_regprocedure('public.has_min_role(uuid,public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'cross-content role prerequisites are missing';
  END IF;

  IF to_regclass('public.incident_content_links') IS NULL THEN
    RAISE EXCEPTION 'generic editorial relationships require incident_content_links';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND c.relname IN ('editorial_conversion_targets','editorial_tags',
        'editorial_content_tags','editorial_content_relationships','editorial_content_relationship_history',
        'editorial_related_drafts','editorial_generation_events')
  ) THEN
    RAISE EXCEPTION 'cross-content migration object already exists; inspect before applying';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (
      'editorial_content_table','editorial_content_exists','editorial_content_is_public',
      'editorial_can_edit_content','validate_editorial_content_reference',
      'validate_editorial_relationship_reference','editorial_register_related_draft',
      'editorial_assign_tag','editorial_remove_tag','editorial_link_content',
      'editorial_unlink_content','editorial_update_related_draft',
      'editorial_create_related_draft_record',
      'editorial_finalize_related_draft','editorial_public_related_content',
      'editorial_search_tags'
    )
  ) THEN
    RAISE EXCEPTION 'cross-content migration function already exists; inspect before applying';
  END IF;
END $$;

CREATE TABLE public.editorial_conversion_targets (
  source_type TEXT NOT NULL CHECK (source_type IN ('article','report','alert','campaign','infrastructure','feed_post')),
  target_type TEXT NOT NULL CHECK (target_type IN ('article','report','alert','campaign','infrastructure','feed_post')),
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
  source_type TEXT NOT NULL CHECK (source_type IN ('article','report','alert','campaign','infrastructure','feed_post')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('article','report','alert','campaign','infrastructure','feed_post')),
  target_id UUID NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('related','derived_from','follows_up','covers')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  generation_request_id UUID,
  provider TEXT,
  prompt_version TEXT,
  source_snapshot_hash TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT (source_type=target_type AND source_id=target_id)),
  CHECK (deleted_at IS NULL OR deleted_by IS NOT NULL)
);
CREATE INDEX editorial_relationships_source_idx ON public.editorial_content_relationships(source_type,source_id,created_at DESC);
CREATE INDEX editorial_relationships_target_idx ON public.editorial_content_relationships(target_type,target_id,created_at DESC);
CREATE TABLE public.editorial_content_relationship_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.editorial_content_relationships(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created','removed')),
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  relationship_type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX editorial_relationship_history_link_idx
  ON public.editorial_content_relationship_history(relationship_id, created_at DESC);
ALTER TABLE public.editorial_content_relationship_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX editorial_relationships_request_idx ON public.editorial_content_relationships(generation_request_id) WHERE generation_request_id IS NOT NULL;
CREATE UNIQUE INDEX editorial_relationships_active_uq ON public.editorial_content_relationships
  (source_type,source_id,target_type,target_id,relationship_type) WHERE deleted_at IS NULL;

CREATE TABLE public.editorial_related_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('article','report','alert','campaign','infrastructure','feed_post')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('article','report','alert','campaign','infrastructure','feed_post')),
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
  (source_type,source_id,target_type,source_snapshot_hash) WHERE status='open';
CREATE INDEX editorial_related_drafts_source_idx ON public.editorial_related_drafts(source_type,source_id,created_at DESC);

CREATE TABLE public.editorial_generation_events (
  request_id UUID PRIMARY KEY,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  source_type TEXT NOT NULL CHECK (source_type IN ('article','report','alert','campaign','infrastructure','feed_post')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('article','report','alert','campaign','infrastructure','feed_post')),
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
    WHEN 'infrastructure' THEN 'infrastructure_issues' WHEN 'feed_post' THEN 'feed_posts' ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.editorial_content_exists(_type TEXT,_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t TEXT := public.editorial_content_table(_type); ok BOOLEAN;
BEGIN
  IF t IS NULL OR _id IS NULL THEN RETURN false; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id=$1 AND deleted_at IS NULL)',t) INTO ok USING _id;
  RETURN ok;
END $$;

CREATE OR REPLACE FUNCTION public.editorial_content_is_public(_type TEXT,_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE ok BOOLEAN;
BEGIN
  IF _type='article' THEN SELECT EXISTS(SELECT 1 FROM public.news WHERE id=_id AND deleted_at IS NULL AND status='published') INTO ok;
  ELSIF _type='report' THEN SELECT EXISTS(SELECT 1 FROM public.accident_reports WHERE id=_id AND deleted_at IS NULL AND status='approved') INTO ok;
  ELSIF _type='alert' THEN SELECT EXISTS(SELECT 1 FROM public.alerts WHERE id=_id AND deleted_at IS NULL AND status='active') INTO ok;
  ELSIF _type='infrastructure' THEN SELECT EXISTS(SELECT 1 FROM public.infrastructure_issues WHERE id=_id AND deleted_at IS NULL AND status='approved') INTO ok;
  ELSIF _type='campaign' THEN SELECT EXISTS(SELECT 1 FROM public.campaigns WHERE id=_id AND deleted_at IS NULL AND (end_date>=CURRENT_DATE OR report_published)) INTO ok;
  ELSIF _type='feed_post' THEN SELECT EXISTS(SELECT 1 FROM public.feed_posts WHERE id=_id AND deleted_at IS NULL AND status='published' AND moderation_status='approved') INTO ok;
  ELSE ok := false;
  END IF;
  RETURN ok;
END $$;

CREATE OR REPLACE FUNCTION public.editorial_can_edit_content(_type TEXT,_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE ok BOOLEAN;
BEGIN
  IF _type='article' THEN SELECT EXISTS(SELECT 1 FROM public.news WHERE id=_id AND deleted_at IS NULL AND (((auth.uid() = author_id) AND ((status <> 'published') OR public.has_min_role(auth.uid(),'author'))) OR public.has_min_role(auth.uid(),'moderator'))) INTO ok;
  ELSIF _type='report' THEN SELECT EXISTS(SELECT 1 FROM public.accident_reports WHERE id=_id AND deleted_at IS NULL AND ((user_id=auth.uid() AND status<>'approved') OR public.has_min_role(auth.uid(),'moderator'))) INTO ok;
  ELSIF _type='alert' THEN SELECT EXISTS(SELECT 1 FROM public.alerts WHERE id=_id AND deleted_at IS NULL AND (user_id=auth.uid() OR public.has_min_role(auth.uid(),'moderator'))) INTO ok;
  ELSIF _type='campaign' THEN SELECT EXISTS(SELECT 1 FROM public.campaigns WHERE id=_id AND deleted_at IS NULL AND public.has_min_role(auth.uid(),'editor')) INTO ok;
  ELSIF _type='feed_post' THEN SELECT EXISTS(SELECT 1 FROM public.feed_posts WHERE id=_id AND deleted_at IS NULL AND (author_id=auth.uid() OR public.has_min_role(auth.uid(),'moderator'))) INTO ok;
  ELSIF _type='infrastructure' THEN SELECT EXISTS(SELECT 1 FROM public.infrastructure_issues WHERE id=_id AND deleted_at IS NULL AND ((user_id=auth.uid() AND status<>'approved') OR public.has_min_role(auth.uid(),'moderator'))) INTO ok;
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
  IF ((NEW.source_type='alert' AND NEW.target_type='report') OR (NEW.source_type='report' AND NEW.target_type='alert'))
     AND NEW.relationship_type <> 'derived_from' THEN
    RAISE EXCEPTION 'Alert to Accident Report links must use incident_content_links unless this is a draft conversion provenance link';
  END IF;
  IF NEW.relationship_type IN ('derived_from','follows_up','covers')
     AND NOT EXISTS (SELECT 1 FROM public.editorial_conversion_targets
                     WHERE source_type=NEW.source_type AND target_type=NEW.target_type AND enabled) THEN
    RAISE EXCEPTION 'conversion is not enabled' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER editorial_content_tags_reference_trg BEFORE INSERT OR UPDATE ON public.editorial_content_tags FOR EACH ROW EXECUTE FUNCTION public.validate_editorial_content_reference();
CREATE TRIGGER editorial_relationships_reference_trg BEFORE INSERT OR UPDATE ON public.editorial_content_relationships FOR EACH ROW EXECUTE FUNCTION public.validate_editorial_relationship_reference();

CREATE OR REPLACE FUNCTION public.audit_editorial_relationship_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  INSERT INTO public.editorial_content_relationship_history(
    relationship_id, action, source_type, source_id, target_type, target_id,
    relationship_type, actor_id, context
  ) VALUES (
    NEW.id, 'created', NEW.source_type, NEW.source_id, NEW.target_type,
    NEW.target_id, NEW.relationship_type, auth.uid(),
    jsonb_build_object('provider', NEW.provider, 'generation_request_id', NEW.generation_request_id)
  );
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.audit_editorial_relationship_removal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    INSERT INTO public.editorial_content_relationship_history(
      relationship_id, action, source_type, source_id, target_type, target_id,
      relationship_type, actor_id, context
    ) VALUES (
      NEW.id, 'removed', NEW.source_type, NEW.source_id, NEW.target_type,
      NEW.target_id, NEW.relationship_type, auth.uid(),
      jsonb_build_object('deleted_at', NEW.deleted_at)
    );
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER editorial_relationship_created_audit
  AFTER INSERT ON public.editorial_content_relationships
  FOR EACH ROW EXECUTE FUNCTION public.audit_editorial_relationship_change();
CREATE TRIGGER editorial_relationship_removed_audit
  AFTER UPDATE OF deleted_at ON public.editorial_content_relationships
  FOR EACH ROW EXECUTE FUNCTION public.audit_editorial_relationship_removal();

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
CREATE POLICY relationships_editor_read ON public.editorial_content_relationships FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(),'editor') AND deleted_at IS NULL);
CREATE POLICY relationship_history_editor_read ON public.editorial_content_relationship_history FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(),'editor'));
-- Relationship mutations are RPC-only so endpoint permissions are checked atomically.
CREATE POLICY drafts_editor_read ON public.editorial_related_drafts FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(),'editor') AND (created_by=auth.uid() OR public.has_role(auth.uid(),'admin')));
-- Draft creation and edits are RPC-only; direct table writes are denied by RLS.
CREATE POLICY generation_events_owner_read ON public.editorial_generation_events FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(),'editor') AND (actor_id=auth.uid() OR public.has_role(auth.uid(),'admin')));

GRANT SELECT ON public.editorial_conversion_targets TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.editorial_tags TO authenticated;
REVOKE ALL ON public.editorial_conversion_targets,public.editorial_tags,public.editorial_content_tags,
  public.editorial_content_relationships,public.editorial_content_relationship_history,public.editorial_related_drafts,public.editorial_generation_events FROM anon;
GRANT SELECT,INSERT,UPDATE ON public.editorial_tags TO authenticated;
GRANT SELECT ON public.editorial_content_tags,public.editorial_content_relationships,public.editorial_content_relationship_history,public.editorial_related_drafts TO authenticated;
GRANT SELECT ON public.editorial_generation_events TO authenticated;
GRANT ALL ON public.editorial_conversion_targets,public.editorial_tags,public.editorial_content_tags,public.editorial_content_relationships,public.editorial_content_relationship_history,public.editorial_related_drafts,public.editorial_generation_events TO service_role;

CREATE OR REPLACE FUNCTION public.editorial_register_related_draft(
  _source_type TEXT,_source_id UUID,_target_type TEXT,_request_id UUID,_provider TEXT,
  _prompt_version TEXT,_source_snapshot JSONB,_source_snapshot_hash TEXT,_generated_draft JSONB)
RETURNS public.editorial_related_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.editorial_related_drafts;
BEGIN
  IF NOT public.has_min_role(auth.uid(),'editor') THEN RAISE EXCEPTION 'editor role required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.editorial_conversion_targets WHERE source_type=_source_type AND target_type=_target_type AND enabled) THEN RAISE EXCEPTION 'conversion is not enabled'; END IF;
  IF NOT public.editorial_content_exists(_source_type,_source_id) OR NOT public.editorial_can_edit_content(_source_type,_source_id) THEN RAISE EXCEPTION 'source is unavailable or not editable'; END IF;
  IF EXISTS(SELECT 1 FROM public.editorial_content_relationships WHERE source_type=_source_type AND source_id=_source_id AND target_type=_target_type AND relationship_type='derived_from' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'saved related record already exists'; END IF;
  IF EXISTS(SELECT 1 FROM public.editorial_generation_events WHERE request_id=_request_id) THEN RAISE EXCEPTION 'generation request id already used'; END IF;
  INSERT INTO public.editorial_related_drafts(source_type,source_id,target_type,provider,prompt_version,generation_request_id,source_snapshot,source_snapshot_hash,generated_draft,created_by)
    VALUES(_source_type,_source_id,_target_type,_provider,_prompt_version,_request_id,_source_snapshot,_source_snapshot_hash,_generated_draft,auth.uid())
    ON CONFLICT (source_type,source_id,target_type,source_snapshot_hash) WHERE status='open'
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
  IF NOT EXISTS (SELECT 1 FROM public.editorial_tags WHERE id=_tag AND active) THEN RAISE EXCEPTION 'tag does not exist or is inactive' USING ERRCODE='23503'; END IF;
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
  IF ((_source_type='alert' AND _target_type='report') OR (_source_type='report' AND _target_type='alert'))
     AND _relationship_type <> 'derived_from' THEN
    RAISE EXCEPTION 'Alert to Accident Report links must use incident_content_links unless this is a draft conversion provenance link';
  END IF;
  IF NOT public.editorial_content_exists(_source_type,_source_id) OR NOT public.editorial_content_exists(_target_type,_target_id) THEN RAISE EXCEPTION 'relationship endpoint does not exist' USING ERRCODE='23503'; END IF;
  IF NOT (public.editorial_content_is_public(_target_type,_target_id) OR public.editorial_can_edit_content(_target_type,_target_id)) THEN RAISE EXCEPTION 'target visibility or edit permission required'; END IF;
  IF _relationship_type IN ('derived_from','follows_up','covers')
     AND NOT EXISTS (SELECT 1 FROM public.editorial_conversion_targets
                     WHERE source_type=_source_type AND target_type=_target_type AND enabled) THEN
    RAISE EXCEPTION 'conversion is not enabled' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.editorial_content_relationships(source_type,source_id,target_type,target_id,relationship_type,created_by,generation_request_id,provider,prompt_version,source_snapshot_hash)
    VALUES(_source_type,_source_id,_target_type,_target_id,_relationship_type,auth.uid(),_generation_request_id,_provider,_prompt_version,_source_snapshot_hash)
    ON CONFLICT DO NOTHING RETURNING * INTO r;
  IF r.id IS NULL THEN SELECT * INTO r FROM public.editorial_content_relationships WHERE source_type=_source_type AND source_id=_source_id AND target_type=_target_type AND target_id=_target_id AND relationship_type=_relationship_type AND deleted_at IS NULL; END IF;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.editorial_unlink_content(_relationship_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.editorial_content_relationships;
BEGIN
  SELECT * INTO r FROM public.editorial_content_relationships WHERE id=_relationship_id AND deleted_at IS NULL;
  IF NOT FOUND OR NOT public.has_min_role(auth.uid(),'editor') OR NOT public.editorial_can_edit_content(r.source_type,r.source_id) THEN RAISE EXCEPTION 'relationship removal permission denied'; END IF;
  UPDATE public.editorial_content_relationships SET deleted_at=now(), deleted_by=auth.uid() WHERE id=_relationship_id;
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
  IF public.editorial_content_is_public(_target_type,_target_id) THEN
    RAISE EXCEPTION 'target must remain unpublished while finalizing a related draft';
  END IF;
  IF EXISTS (SELECT 1 FROM public.editorial_content_relationships
             WHERE source_type=d.source_type AND source_id=d.source_id
               AND target_type=d.target_type AND relationship_type='derived_from'
               AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'saved related record already exists';
  END IF;
  UPDATE public.editorial_related_drafts SET status='saved',target_id=_target_id,updated_at=now() WHERE id=d.id RETURNING * INTO d;
  INSERT INTO public.editorial_content_relationships(source_type,source_id,target_type,target_id,relationship_type,created_by,generation_request_id,provider,prompt_version,source_snapshot_hash)
    VALUES(d.source_type,d.source_id,d.target_type,d.target_id,'derived_from',auth.uid(),d.generation_request_id,d.provider,d.prompt_version,d.source_snapshot_hash)
    ON CONFLICT DO NOTHING;
  RETURN d;
END $$;
CREATE OR REPLACE FUNCTION public.editorial_create_related_draft_record(
  _draft_id UUID,
  _accepted_fields JSONB
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  d public.editorial_related_drafts;
  f JSONB := COALESCE(_accepted_fields, '{}'::jsonb);
  new_id UUID;
  relationship_id UUID;
  title_text TEXT;
  summary_text TEXT;
  body_text TEXT;
  description_text TEXT;
  county_text TEXT;
  occurred_text TEXT;
  slug_text TEXT;
  editor_path TEXT;
  parties_text TEXT[];
BEGIN
  IF jsonb_typeof(f) <> 'object' OR NOT public.has_min_role(auth.uid(),'editor') THEN
    RAISE EXCEPTION 'editor and object proposal required';
  END IF;
  SELECT * INTO d
  FROM public.editorial_related_drafts
  WHERE id=_draft_id AND status='open'
    AND (created_by=auth.uid() OR public.has_role(auth.uid(),'admin'))
  FOR UPDATE;
  IF NOT FOUND OR NOT public.editorial_can_edit_content(d.source_type,d.source_id) THEN
    RAISE EXCEPTION 'draft creation permission denied';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.editorial_conversion_targets
    WHERE source_type=d.source_type AND target_type=d.target_type AND enabled
  ) THEN
    RAISE EXCEPTION 'conversion is not enabled';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.editorial_content_relationships
    WHERE source_type=d.source_type AND source_id=d.source_id
      AND target_type=d.target_type AND relationship_type='derived_from'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'a derived draft already exists for this source and destination';
  END IF;

  title_text := NULLIF(btrim(f->>'title'),'');
  IF title_text IS NULL THEN RAISE EXCEPTION 'title is required'; END IF;

  IF d.target_type='article' THEN
    summary_text := NULLIF(btrim(COALESCE(f->>'summary',f->>'description')),'');
    body_text := NULLIF(btrim(COALESCE(f->>'body',f->>'description')),'');
    IF summary_text IS NULL OR body_text IS NULL THEN
      RAISE EXCEPTION 'Article draft requires summary and body';
    END IF;
    slug_text := trim(both '-' from lower(regexp_replace(title_text,'[^a-zA-Z0-9]+','-','g')));
    IF slug_text='' THEN RAISE EXCEPTION 'Article title cannot produce a slug'; END IF;
    slug_text := left(slug_text,70) || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,10);
    EXECUTE 'INSERT INTO public.news(slug,title,summary,body,author_id,status,published_at)
             VALUES ($1,$2,$3,$4,$5,''draft'',now()) RETURNING id'
      INTO new_id USING slug_text,title_text,summary_text,body_text,auth.uid();
    editor_path := '/admin/articles/' || new_id::text || '/edit';
  ELSIF d.target_type='report' THEN
    description_text := NULLIF(btrim(COALESCE(f->>'description',f->>'body')),'');
    county_text := NULLIF(btrim(f->>'county'),'');
    occurred_text := NULLIF(btrim(f->>'occurred_at'),'');
    IF description_text IS NULL OR county_text IS NULL OR occurred_text IS NULL THEN
      RAISE EXCEPTION 'Accident Report draft requires description, county and occurred_at';
    END IF;
    parties_text := ARRAY(SELECT jsonb_array_elements_text(COALESCE(f->'parties_involved','[]'::jsonb)));
    EXECUTE 'INSERT INTO public.accident_reports
      (user_id,title,description,county,road,occurred_at,vehicles_involved,casualties,
       fatalities,severity,status,parties_involved,casualty_breakdown,is_anonymous)
      VALUES ($1,$2,$3,$4,$5,$6::timestamptz,$7::integer,$8::integer,$9::integer,
       COALESCE(NULLIF($10,''''),''moderate''),''pending'',$11,$12,false)
      RETURNING id'
      INTO new_id
      USING auth.uid(),title_text,description_text,county_text,NULLIF(f->>'road',''),
        occurred_text,NULLIF(f->>'vehicles_involved','')::integer,
        NULLIF(f->>'casualties','')::integer,NULLIF(f->>'fatalities','')::integer,
        f->>'severity',parties_text,COALESCE(f->'casualty_breakdown','{}'::jsonb);
    editor_path := '/admin/reports/' || new_id::text || '/edit';
  ELSIF d.target_type='alert' THEN
    description_text := NULLIF(btrim(COALESCE(f->>'description',f->>'body')),'');
    county_text := NULLIF(btrim(f->>'county'),'');
    IF description_text IS NULL OR county_text IS NULL THEN
      RAISE EXCEPTION 'Hazard Alert draft requires description and county';
    END IF;
    EXECUTE 'INSERT INTO public.alerts
      (user_id,title,description,county,road,hazard_type,severity,status)
      VALUES ($1,$2,$3,$4,$5,COALESCE(NULLIF($6,''''),''other''),
              COALESCE(NULLIF($7,''''),''medium''),''pending'') RETURNING id'
      INTO new_id
      USING auth.uid(),title_text,description_text,county_text,NULLIF(f->>'road',''),
        f->>'hazard_type',f->>'severity';
    editor_path := '/admin/alerts/' || new_id::text || '/edit';
  ELSE
    RAISE EXCEPTION 'Automatic draft creation is not enabled for this destination';
  END IF;

  SELECT (public.editorial_link_content(
    d.source_type,d.source_id,d.target_type,new_id,'derived_from',
    d.generation_request_id,d.provider,d.prompt_version,d.source_snapshot_hash
  )).id INTO relationship_id;
  UPDATE public.editorial_related_drafts
  SET status='saved',target_id=new_id,updated_at=now()
  WHERE id=d.id;
  RETURN jsonb_build_object(
    'draft_id',new_id,'target_type',d.target_type,
    'relationship_id',relationship_id,'editor_path',editor_path
  );
END $$;

CREATE OR REPLACE FUNCTION public.editorial_remove_tag(_type TEXT,_id UUID,_tag UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT public.has_min_role(auth.uid(),'editor') OR NOT public.editorial_can_edit_content(_type,_id) THEN
    RAISE EXCEPTION 'content edit permission required';
  END IF;
  DELETE FROM public.editorial_content_tags
  WHERE content_type=_type AND content_id=_id AND tag_id=_tag;
  RETURN FOUND;
END;
$$;
CREATE OR REPLACE FUNCTION public.editorial_public_related_content(_type TEXT,_id UUID,_limit INTEGER DEFAULT 12)
RETURNS TABLE(related_type TEXT,related_id UUID,relationship_type TEXT,linked_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT r.target_type,r.target_id,r.relationship_type,r.created_at FROM public.editorial_content_relationships r WHERE r.source_type=_type AND r.source_id=_id AND r.deleted_at IS NULL AND public.editorial_content_is_public(r.target_type,r.target_id)
  UNION ALL
  SELECT r.source_type,r.source_id,r.relationship_type,r.created_at FROM public.editorial_content_relationships r WHERE r.target_type=_type AND r.target_id=_id AND r.deleted_at IS NULL AND public.editorial_content_is_public(r.source_type,r.source_id)
  ORDER BY 4 DESC LIMIT LEAST(GREATEST(COALESCE(_limit,12),1),50);
$$;
CREATE OR REPLACE FUNCTION public.editorial_search_tags(_query TEXT,_limit INTEGER DEFAULT 20)
RETURNS SETOF public.editorial_tags LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT * FROM public.editorial_tags WHERE public.has_min_role(auth.uid(),'editor') AND active AND (lower(label) LIKE '%'||lower(COALESCE(_query,''))||'%' OR slug LIKE '%'||lower(COALESCE(_query,''))||'%') ORDER BY label LIMIT LEAST(GREATEST(COALESCE(_limit,20),1),100);
$$;

REVOKE ALL ON FUNCTION public.editorial_content_table(TEXT),public.editorial_content_exists(TEXT,UUID),public.editorial_content_is_public(TEXT,UUID),public.editorial_can_edit_content(TEXT,UUID) FROM PUBLIC;
-- Do not revoke anonymous EXECUTE here. Production public SELECT policies
-- currently reference these helpers in their USING expressions, and the
-- existing migration history explicitly grants anon EXECUTE so those policies
-- can be planned successfully. A future policy refactor may remove that
-- exposure, but it must be audited and deployed separately.
REVOKE ALL ON FUNCTION public.editorial_register_related_draft(TEXT,UUID,TEXT,UUID,TEXT,TEXT,JSONB,TEXT,JSONB),public.editorial_assign_tag(TEXT,UUID,UUID),public.editorial_remove_tag(TEXT,UUID,UUID),public.editorial_link_content(TEXT,UUID,TEXT,UUID,TEXT,UUID,TEXT,TEXT,TEXT),public.editorial_unlink_content(UUID),public.editorial_update_related_draft(UUID,JSONB),public.editorial_finalize_related_draft(UUID,TEXT,UUID),public.editorial_create_related_draft_record(UUID,JSONB),public.editorial_search_tags(TEXT,INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.editorial_register_related_draft(TEXT,UUID,TEXT,UUID,TEXT,TEXT,JSONB,TEXT,JSONB),public.editorial_assign_tag(TEXT,UUID,UUID),public.editorial_remove_tag(TEXT,UUID,UUID),public.editorial_link_content(TEXT,UUID,TEXT,UUID,TEXT,UUID,TEXT,TEXT,TEXT),public.editorial_unlink_content(UUID),public.editorial_update_related_draft(UUID,JSONB),public.editorial_finalize_related_draft(UUID,TEXT,UUID),public.editorial_create_related_draft_record(UUID,JSONB),public.editorial_search_tags(TEXT,INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.editorial_public_related_content(TEXT,UUID,INTEGER) TO anon,authenticated;
