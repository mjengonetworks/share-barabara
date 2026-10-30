-- REVIEW ONLY: harden canonical Road Registry writes after production policy review.
-- Apply only after 20261030200000_canonical_road_registry_review.sql.
-- Do not execute in production without separate approval and a fresh backup.

-- The legacy policy allowed any authenticated user to create canonical roads.
-- Autocomplete resolves existing rows; it must not depend on client INSERT.
DROP POLICY IF EXISTS roads_insert_authenticated ON public.roads;
CREATE POLICY roads_insert_editor ON public.roads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));

-- Retain the existing editor update boundary explicitly. There is deliberately
-- no DELETE policy: canonical roads are retired or merged, never client-deleted.
DROP POLICY IF EXISTS roads_update_editor ON public.roads;
CREATE POLICY roads_update_editor ON public.roads
  FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));

-- Public readers resolve only active canonical records. Merged and inactive
-- rows remain available to authorised editorial tooling and audit history.
DROP POLICY IF EXISTS roads_public_read ON public.roads;
CREATE POLICY roads_public_read_eligible ON public.roads
  FOR SELECT TO public
  USING (COALESCE(registry_status, 'active') = 'active' AND merged_into_id IS NULL);

REVOKE INSERT, UPDATE, DELETE ON public.roads FROM anon;
REVOKE EXECUTE ON FUNCTION public.merge_road_registry_records(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_road_registry_records(UUID, UUID, TEXT) TO authenticated;

COMMENT ON POLICY roads_insert_editor ON public.roads IS
  'Only editor-level users may create canonical roads; autocomplete never grants client INSERT.';
COMMENT ON POLICY roads_update_editor ON public.roads IS
  'Only editor-level users may update canonical roads; merge remains administrator-only.';
