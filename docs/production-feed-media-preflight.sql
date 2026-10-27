-- READ ONLY. Run in the Share Barabara Supabase SQL Editor.
-- Do not replace this with supabase db push.
select jsonb_build_object(
  'project', current_database(),
  'feed_posts_columns', coalesce((
    select jsonb_agg(to_jsonb(c) order by c.ordinal_position)
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = 'feed_posts'
  ), '[]'::jsonb),
  'feed_posts_constraints', coalesce((
    select jsonb_agg(jsonb_build_object(
      'name', conname,
      'type', contype,
      'definition', pg_get_constraintdef(oid)
    ) order by conname)
    from pg_constraint
    where conrelid = to_regclass('public.feed_posts')
  ), '[]'::jsonb),
  'feed_foreign_keys', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', conrelid::regclass::text,
      'name', conname,
      'definition', pg_get_constraintdef(oid)
    ) order by conrelid::regclass::text, conname)
    from pg_constraint
    where contype = 'f'
      and (
        conrelid = to_regclass('public.feed_posts')
        or confrelid = to_regclass('public.feed_posts')
        or conrelid::regclass::text like 'public.feed%'
      )
  ), '[]'::jsonb),
  'feed_posts_policies', coalesce((
    select jsonb_agg(to_jsonb(p) order by p.policyname)
    from pg_policies p
    where p.schemaname = 'public' and p.tablename = 'feed_posts'
  ), '[]'::jsonb),
  'has_min_role', coalesce((
    select jsonb_agg(jsonb_build_object(
      'identity_arguments', pg_get_function_identity_arguments(pr.oid),
      'definition', pg_get_functiondef(pr.oid),
      'authenticated_execute', has_function_privilege('authenticated', pr.oid, 'EXECUTE'),
      'anon_execute', has_function_privilege('anon', pr.oid, 'EXECUTE')
    ))
    from pg_proc pr
    join pg_namespace ns on ns.oid = pr.pronamespace
    where ns.nspname = 'public' and pr.proname = 'has_min_role'
  ), '[]'::jsonb),
  'storage_buckets', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'public', public,
      'file_size_limit', file_size_limit,
      'allowed_mime_types', allowed_mime_types
    ) order by id)
    from storage.buckets
    where id in ('media', 'feed-media')
  ), '[]'::jsonb),
  'storage_policies', coalesce((
    select jsonb_agg(to_jsonb(p) order by p.policyname)
    from pg_policies p
    where p.schemaname = 'storage' and p.tablename = 'objects'
      and (p.policyname ilike '%media%' or p.qual ilike '%bucket_id%' or p.with_check ilike '%bucket_id%')
  ), '[]'::jsonb),
  'feed_post_media_columns', coalesce((
    select jsonb_agg(to_jsonb(c) order by c.ordinal_position)
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = 'feed_post_media'
  ), '[]'::jsonb),
  'migration_history', coalesce((
    select jsonb_agg(version order by version)
    from supabase_migrations.schema_migrations
  ), '[]'::jsonb)
) as production_feed_media_preflight;
