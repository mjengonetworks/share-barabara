-- Disposable PostgreSQL rehearsal checks only. Never run against production.
\set ON_ERROR_STOP on
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
SELECT public.editorial_link_content('article','10000000-0000-0000-0000-000000000001','report','20000000-0000-0000-0000-000000000001','related');
SELECT public.editorial_link_content('article','10000000-0000-0000-0000-000000000001','campaign','40000000-0000-0000-0000-000000000001','related');
SELECT public.editorial_link_content('report','20000000-0000-0000-0000-000000000001','campaign','40000000-0000-0000-0000-000000000002','related');
SELECT public.editorial_link_content('alert','30000000-0000-0000-0000-000000000001','campaign','40000000-0000-0000-0000-000000000001','related');
SELECT public.editorial_link_content('article','10000000-0000-0000-0000-000000000001','report','20000000-0000-0000-0000-000000000001','related');
SELECT public.editorial_link_content('article','10000000-0000-0000-0000-000000000001','report','20000000-0000-0000-0000-000000000002','related');
DO $$ BEGIN
  PERFORM public.editorial_link_content('alert','30000000-0000-0000-0000-000000000001','report','20000000-0000-0000-0000-000000000001','related');
  RAISE EXCEPTION 'canonical Alert to Report link bypassed incident workflow';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'canonical Alert to Report link bypassed incident workflow' THEN RAISE; END IF;
END $$;
SELECT COUNT(*) AS duplicate_safe_count FROM public.editorial_content_relationships
  WHERE source_type='article' AND source_id='10000000-0000-0000-0000-000000000001'
    AND target_type='report' AND target_id='20000000-0000-0000-0000-000000000001'
    AND deleted_at IS NULL;
SELECT COUNT(*) AS article_public_related_count FROM public.editorial_public_related_content('article','10000000-0000-0000-0000-000000000001',50);
SELECT COUNT(*) AS unpublished_report_public_count FROM public.editorial_public_related_content('article','10000000-0000-0000-0000-000000000001',50)
  WHERE related_id='20000000-0000-0000-0000-000000000002';
SELECT COUNT(*) AS campaign_reciprocal_related_count FROM public.editorial_public_related_content('campaign','40000000-0000-0000-0000-000000000002',50);
SELECT public.editorial_unlink_content(id) FROM public.editorial_content_relationships
  WHERE source_type='article' AND target_type='campaign' AND target_id='40000000-0000-0000-0000-000000000001' AND deleted_at IS NULL;
RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
DO $$ BEGIN
  PERFORM public.editorial_link_content('article','10000000-0000-0000-0000-000000000001','campaign','40000000-0000-0000-0000-000000000001','related');
  RAISE EXCEPTION 'non-editor write was accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'non-editor write was accepted' THEN RAISE; END IF;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN
  PERFORM public.editorial_public_related_content('article','10000000-0000-0000-0000-000000000001',50);
END $$;
RESET ROLE;
