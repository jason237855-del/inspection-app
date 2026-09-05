ALTER TABLE public.space_windows
  ADD COLUMN IF NOT EXISTS moisture_post_left numeric,
  ADD COLUMN IF NOT EXISTS moisture_post_right numeric;

ALTER TABLE public.project_spaces
  ADD COLUMN IF NOT EXISTS show_brief boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_dimensions boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dim_length boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dim_width boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dim_height boolean NOT NULL DEFAULT true;

UPDATE public.project_spaces SET show_brief = true WHERE name LIKE '%客廳%';