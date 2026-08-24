
-- ===== ROLE LADDER: extend app_role with editorial tiers =====
-- New values must land in their own migration/transaction: Postgres will not
-- let a later statement in the same transaction reference a value just added
-- by ALTER TYPE ... ADD VALUE.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'guest_author';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'author';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
