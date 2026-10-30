-- READ-ONLY POST-MIGRATION VERIFICATION
-- Run after the approved atomic SQL Editor script commits in project
-- yhqoggbntunxvlbcatwj. These statements do not modify production.

SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN ('20261030200000','20261030210000','20261030220000')
ORDER BY version;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('road_registry_history','editorial_feed_entries')
ORDER BY table_name;

SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'roads'
ORDER BY policyname;

SELECT c.oid::regclass AS table_name, c.relrowsecurity
FROM pg_class c
WHERE c.oid IN (
  'public.roads'::regclass,
  'public.road_registry_history'::regclass,
  'public.editorial_feed_entries'::regclass
)
ORDER BY table_name;

SELECT event_object_table, trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND trigger_name IN (
  'editorial_feed_article_sync',
  'editorial_feed_report_sync',
  'editorial_feed_alert_sync',
  'editorial_feed_infrastructure_sync',
  'editorial_feed_campaign_sync'
)
ORDER BY event_object_table, trigger_name, event_manipulation;

SELECT 'roads' AS object_name, count(*) AS row_count FROM public.roads
UNION ALL SELECT 'news', count(*) FROM public.news
UNION ALL SELECT 'accident_reports', count(*) FROM public.accident_reports
UNION ALL SELECT 'alerts', count(*) FROM public.alerts
UNION ALL SELECT 'infrastructure_issues', count(*) FROM public.infrastructure_issues
UNION ALL SELECT 'campaigns', count(*) FROM public.campaigns
UNION ALL SELECT 'feed_posts', count(*) FROM public.feed_posts;

SELECT policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'roads'
AND policyname = 'roads_insert_authenticated';
