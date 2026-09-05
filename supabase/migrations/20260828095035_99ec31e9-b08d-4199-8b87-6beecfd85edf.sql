ALTER TABLE public.template_items ADD COLUMN IF NOT EXISTS fields text[] NOT NULL DEFAULT ARRAY['photo','note']::text[];
ALTER TABLE public.project_items ADD COLUMN IF NOT EXISTS fields text[] NOT NULL DEFAULT ARRAY['photo','note']::text[];
ALTER TABLE public.inspection_items ADD COLUMN IF NOT EXISTS values jsonb NOT NULL DEFAULT '{}'::jsonb;