-- Articles can now be tagged with more than one category. `category` stays
-- as the primary one (first selected) so every existing filter/route/badge
-- keeps working unchanged; `categories` holds the full set for display.
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';
UPDATE public.news SET categories = ARRAY[category] WHERE categories = '{}';
