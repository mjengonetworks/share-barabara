
-- ===== PROFILE FIELDS =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS road_safety_message TEXT,
  ADD COLUMN IF NOT EXISTS mjengo_networks_url TEXT,
  ADD COLUMN IF NOT EXISTS mjengo_hub_url TEXT;
