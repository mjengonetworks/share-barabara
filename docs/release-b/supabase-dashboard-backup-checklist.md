# Supabase Dashboard backup verification checklist

This is an operator checklist, not a substitute for a full custom-format backup.

1. Open the Supabase Dashboard and confirm the selected project reference is yhqoggbntunxvlbcatwj and the environment is production.
2. Confirm the project health/status page is normal and record the UTC timestamp.
3. Use the established approved Supabase backup/export workflow to create a new timestamped backup before any SQL Editor write. Do not overwrite prior backups.
4. Confirm the export covers the database objects needed to recover this release: public.roads, public.road_registry_history if present, public.news, public.accident_reports, public.alerts, public.infrastructure_issues, public.campaigns, existing community public.feed_posts and public.feed_post_media, plus schemas, functions, triggers, indexes and RLS policies.
5. Record the backup filename/location, completion timestamp and reported size. A metadata screenshot or table-count query is not a backup.
6. If the Dashboard workflow provides a downloadable archive, compute SHA-256 locally without exposing credentials or private contents.
7. Verify the archive can be enumerated/restored in an isolated environment using the approved recovery procedure. For a PostgreSQL custom-format dump, run pg_restore --list; do not restore into production.
8. Preserve the previous verified backup. Do not delete or replace it.
9. Record exclusions or limitations. If any migration-affected object or recovery-critical schema is excluded, stop the release and report it.
10. Only after backup verification and read-only preflight pass should the owner run the reviewed atomic SQL Editor script.

The Dashboard checklist does not claim that a backup exists; the operator must attach the actual artifact evidence.

