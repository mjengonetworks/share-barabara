-- Review-only database verification plan for the dependent canonical-incident
-- migration. Do not run against production. Execute only after both the
-- hardened cross-content migration and the canonical-incident migration have
-- been approved and applied in an isolated test database.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.canonical_accident_incidents') IS NULL
     OR to_regclass('public.canonical_accident_sources') IS NULL THEN
    RAISE EXCEPTION 'canonical accident objects are missing';
  END IF;
END $$;

-- Schema checks: nullable verified casualty values and active uniqueness.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='canonical_accident_sources'
      AND column_name='verified_fatalities' AND is_nullable='YES'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='canonical_accident_sources'
      AND column_name='verified_injuries' AND is_nullable='YES'
  ) THEN
    RAISE EXCEPTION 'unknown casualty values are not nullable';
  END IF;
END $$;

-- The test fixture below must use isolated auth users and content rows. It is
-- intentionally left as an explicit acceptance checklist because production
-- credentials and a test database are not available in this worktree.
-- Required cases:
--   1. Anonymous cannot read source mappings or unpublished incidents.
--   2. Ordinary users cannot create, relink, verify or delete mappings.
--   3. Editors can link one Alert to one approved canonical Report.
--   4. A Report cannot be linked to two active incidents.
--   5. An Alert-only incident contributes only after explicit verification.
--   6. Linking a Report makes Report counts authoritative and counts once.
--   7. NULL injuries/fatalities remain NULL in the statistics read model.
--   8. Articles, Feed posts and unrelated editorial links cannot become
--      accident statistic sources.
--   9. Deleted, rejected, pending and duplicate Reports are excluded.
--  10. Concurrent Alert-to-Report links produce one canonical mapping.
--  11. Existing Report, Alert and statistics rows are unchanged.

-- Transport extension acceptance checks. These run only after the dependent
-- review migration is approved in a disposable database.
DO $$
BEGIN
  IF to_regclass('public.canonical_incident_transport_modes') IS NULL
     OR to_regprocedure('public.public_canonical_transport_statistics(date,date,text,text,text)') IS NULL
     OR to_regprocedure('public.public_canonical_transport_map(text,text)') IS NULL THEN
    RAISE EXCEPTION 'transport statistics extension is missing';
  END IF;
END $$;

-- Required transport cases:
--  12. One incident may have road and rail modes but one overall incident ID.
--  13. A second active primary mode is rejected by the partial unique index.
--  14. Invalid mode, country, coordinate pair and unauthorized RPC calls fail.
--  15. Mode filters do not sum multimodal rows into duplicate overall counts.
--  16. Country/admin-area filters preserve NULL geography when unknown.
--  17. Map RPC excludes rows without verified coordinate pairs.
--  18. Deleted/merged incidents and deleted mode links disappear from reads.
--  19. Report authority remains intact when supporting Alerts are present.

ROLLBACK;
