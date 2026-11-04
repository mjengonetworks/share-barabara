-- READ-ONLY CONSOLIDATED PRODUCTION PREFLIGHT
--
-- Run this file as one query in the Supabase SQL Editor. It returns one
-- result set with one row per prerequisite/conflict check and a final
-- OVERALL STATUS row. It contains no schema, data, privilege, or transaction
-- mutations.

WITH
required_tables(table_name, required_column) AS (
  VALUES
    ('news', 'deleted_at'),
    ('accident_reports', 'deleted_at'),
    ('alerts', 'deleted_at'),
    ('campaigns', 'deleted_at'),
    ('infrastructure_issues', 'deleted_at'),
    ('feed_posts', 'deleted_at'),
    ('user_roles', NULL::text),
    ('incident_content_links', NULL::text)
),
table_checks AS (
  SELECT
    'required table: public.' || r.table_name AS check_name,
    CASE
      WHEN to_regclass('public.' || r.table_name) IS NULL THEN 'missing'
      WHEN r.required_column IS NULL THEN 'present'
      WHEN EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = r.table_name
          AND c.column_name = r.required_column
      ) THEN 'present; required column ' || r.required_column || ' present'
      ELSE 'present; required column ' || r.required_column || ' missing'
    END AS actual_result,
    CASE
      WHEN r.required_column IS NULL THEN 'table present'
      ELSE 'table and column ' || r.required_column || ' present'
    END AS expected_result,
    CASE
      WHEN to_regclass('public.' || r.table_name) IS NULL THEN 'BLOCKED'
      WHEN r.required_column IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = r.table_name
          AND c.column_name = r.required_column
      ) THEN 'BLOCKED'
      ELSE 'PASS'
    END AS status
  FROM required_tables r
),
helper_checks(check_name, signature) AS (
  VALUES
    ('role helper: public.app_role', 'public.app_role'),
    ('role helper: public.has_role(uuid, public.app_role)',
      'public.has_role(uuid,public.app_role)'),
    ('role helper: public.has_min_role(uuid, public.app_role)',
      'public.has_min_role(uuid,public.app_role)')
),
helper_results AS (
  SELECT
    h.check_name,
    CASE WHEN h.signature = 'public.app_role'
      THEN CASE WHEN to_regtype(h.signature) IS NULL THEN 'missing' ELSE 'present' END
      ELSE CASE WHEN to_regprocedure(h.signature) IS NULL THEN 'missing' ELSE 'present' END
    END AS actual_result,
    'present' AS expected_result,
    CASE WHEN h.signature = 'public.app_role'
      THEN CASE WHEN to_regtype(h.signature) IS NULL THEN 'BLOCKED' ELSE 'PASS' END
      ELSE CASE WHEN to_regprocedure(h.signature) IS NULL THEN 'BLOCKED' ELSE 'PASS' END
    END AS status
  FROM helper_checks h
),
role_checks(role_name) AS (
  VALUES ('anon'::name), ('authenticated'::name), ('service_role'::name)
),
role_results AS (
  SELECT
    'role and public schema permission: ' || r.role_name AS check_name,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM pg_roles p WHERE p.rolname = r.role_name::text)
        THEN 'role missing'
      WHEN has_schema_privilege(r.role_name, 'public', 'USAGE')
        THEN 'role present; public USAGE granted'
      ELSE 'role present; public USAGE missing'
    END AS actual_result,
    'role present with public USAGE' AS expected_result,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM pg_roles p WHERE p.rolname = r.role_name::text)
        THEN 'BLOCKED'
      WHEN has_schema_privilege(r.role_name, 'public', 'USAGE') THEN 'PASS'
      ELSE 'BLOCKED'
    END AS status
  FROM role_checks r
),
generic_tables(table_name) AS (
  VALUES
    ('editorial_conversion_targets'),
    ('editorial_tags'),
    ('editorial_content_tags'),
    ('editorial_content_relationships'),
    ('editorial_content_relationship_history'),
    ('editorial_related_drafts'),
    ('editorial_generation_events')
),
generic_functions(function_name, signature) AS (
  VALUES
    ('editorial_content_table', 'public.editorial_content_table(text)'),
    ('editorial_content_exists', 'public.editorial_content_exists(text,uuid)'),
    ('editorial_content_is_public', 'public.editorial_content_is_public(text,uuid)'),
    ('editorial_can_edit_content', 'public.editorial_can_edit_content(text,uuid)'),
    ('editorial_link_content',
      'public.editorial_link_content(text,uuid,text,uuid,text,uuid,text,text,text)'),
    ('editorial_unlink_content', 'public.editorial_unlink_content(uuid)'),
    ('editorial_public_related_content',
      'public.editorial_public_related_content(text,uuid,integer)')
),
object_state AS (
  SELECT
    (SELECT count(*) FROM generic_tables t
      WHERE to_regclass('public.' || t.table_name) IS NOT NULL)::integer AS table_count,
    (SELECT count(*) FROM generic_functions f
      WHERE to_regprocedure(f.signature) IS NOT NULL)::integer AS function_count
),
object_checks AS (
  SELECT
    'migration object conflict: table public.' || t.table_name AS check_name,
    CASE WHEN to_regclass('public.' || t.table_name) IS NULL
      THEN 'absent' ELSE 'present' END AS actual_result,
    CASE WHEN s.table_count = 7 AND s.function_count = 7
      THEN 'present; migration already applied'
      ELSE 'absent; migration not yet applied' END AS expected_result,
    CASE
      WHEN s.table_count = 0 AND s.function_count = 0 THEN 'PASS'
      WHEN s.table_count = 7 AND s.function_count = 7 THEN 'ALREADY APPLIED'
      ELSE 'BLOCKED'
    END AS status
  FROM generic_tables t CROSS JOIN object_state s
  UNION ALL
  SELECT
    'migration object conflict: function ' || f.signature AS check_name,
    CASE WHEN to_regprocedure(f.signature) IS NULL
      THEN 'absent' ELSE 'present' END AS actual_result,
    CASE WHEN s.table_count = 7 AND s.function_count = 7
      THEN 'present; migration already applied'
      ELSE 'absent; migration not yet applied' END AS expected_result,
    CASE
      WHEN s.table_count = 0 AND s.function_count = 0 THEN 'PASS'
      WHEN s.table_count = 7 AND s.function_count = 7 THEN 'ALREADY APPLIED'
      ELSE 'BLOCKED'
    END AS status
  FROM generic_functions f CROSS JOIN object_state s
),
rls_checks AS (
  SELECT
    'RLS and policies: public.' || t.table_name AS check_name,
    CASE
      WHEN c.oid IS NULL THEN 'table absent'
      ELSE 'table present; rls=' || c.relrowsecurity::text ||
        '; policy_count=' || count(p.policyname)::text
    END AS actual_result,
    CASE WHEN s.table_count = 7 AND s.function_count = 7
      THEN 'RLS enabled with policies'
      ELSE 'generic table absent before migration' END AS expected_result,
    CASE
      WHEN s.table_count = 0 AND s.function_count = 0 THEN 'PASS'
      WHEN s.table_count <> 7 OR s.function_count <> 7 THEN 'BLOCKED'
      WHEN c.oid IS NULL OR NOT c.relrowsecurity OR count(p.policyname) = 0
        THEN 'BLOCKED'
      ELSE 'PASS'
    END AS status
  FROM generic_tables t
  CROSS JOIN object_state s
  LEFT JOIN pg_class c
    ON c.relnamespace = 'public'::regnamespace
   AND c.relname = t.table_name
  LEFT JOIN pg_policies p
    ON p.schemaname = 'public'
   AND p.tablename = t.table_name
  GROUP BY t.table_name, s.table_count, s.function_count,
           c.oid, c.relrowsecurity
),
canonical_check AS (
  SELECT
    'canonical incident_content_links availability' AS check_name,
    CASE WHEN to_regclass('public.incident_content_links') IS NULL
      THEN 'missing' ELSE 'present' END AS actual_result,
    'table present; existing Alert ↔ Accident Report workflow preserved' AS expected_result,
    CASE WHEN to_regclass('public.incident_content_links') IS NULL
      THEN 'BLOCKED' ELSE 'PASS' END AS status
),
checks AS (
  SELECT * FROM table_checks
  UNION ALL SELECT * FROM helper_results
  UNION ALL SELECT * FROM role_results
  UNION ALL SELECT * FROM object_checks
  UNION ALL SELECT * FROM rls_checks
  UNION ALL SELECT * FROM canonical_check
),
overall AS (
  SELECT
    'OVERALL STATUS' AS check_name,
    CASE
      WHEN count(*) FILTER (WHERE status = 'BLOCKED') > 0 THEN
        'one or more checks are blocked'
      WHEN count(*) FILTER (WHERE status = 'ALREADY APPLIED') > 0 THEN
        'migration objects are already present'
      ELSE 'all prerequisites pass; migration objects are absent'
    END AS actual_result,
    'PASS, BLOCKED or ALREADY APPLIED' AS expected_result,
    CASE
      WHEN count(*) FILTER (WHERE status = 'BLOCKED') > 0 THEN 'BLOCKED'
      WHEN (SELECT table_count FROM object_state) = 7
       AND (SELECT function_count FROM object_state) = 7
        THEN 'ALREADY APPLIED'
      ELSE 'PASS'
    END AS status
  FROM checks
),
final_results AS (
  SELECT check_name, actual_result, expected_result, status, 0 AS sort_order
  FROM checks
  UNION ALL
  SELECT check_name, actual_result, expected_result, status, 1 AS sort_order
  FROM overall
)
SELECT check_name, actual_result, expected_result, status
FROM final_results
ORDER BY sort_order,
         check_name;
