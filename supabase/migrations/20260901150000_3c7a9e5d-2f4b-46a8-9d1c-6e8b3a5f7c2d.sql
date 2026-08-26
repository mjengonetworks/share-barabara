-- Merch orders were only capturing a free-text delivery_notes field; add
-- proper structured delivery details so orders are actually fulfillable.
ALTER TABLE public.merch_orders
  ADD COLUMN IF NOT EXISTS delivery_county TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;
