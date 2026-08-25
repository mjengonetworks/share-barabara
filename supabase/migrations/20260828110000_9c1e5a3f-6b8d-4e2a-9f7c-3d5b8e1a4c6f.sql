-- ===== FIX: anon-facing read policies call role-check functions =====
-- news_read, reports_read_approved and videos_read are public SELECT
-- policies (no `TO authenticated`) whose USING clause references has_role /
-- has_min_role to let staff see draft/pending rows too. Postgres checks
-- function-call privileges for every disjunct at parse time, not just the
-- branch that ends up true, so anon needs EXECUTE on these even though the
-- `status = 'published'` branch is what actually satisfies an anonymous
-- read. Without it, the whole SELECT is rejected with "permission denied
-- for function has_role/has_min_role" before status is ever checked.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_min_role(uuid, public.app_role) TO anon;
