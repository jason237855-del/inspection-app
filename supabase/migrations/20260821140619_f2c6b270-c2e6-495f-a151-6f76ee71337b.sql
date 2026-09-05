
ALTER TABLE public.template_categories ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.template_items ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.project_categories ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.project_items ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.project_spaces ADD COLUMN IF NOT EXISTS brief_roles text[] NOT NULL DEFAULT '{業務}';
ALTER TABLE public.project_spaces ADD COLUMN IF NOT EXISTS dim_roles text[] NOT NULL DEFAULT '{業務}';
ALTER TABLE public.project_spaces ADD COLUMN IF NOT EXISTS window_roles text[] NOT NULL DEFAULT '{水電}';

ALTER TABLE public.inspection_items ADD COLUMN IF NOT EXISTS inspected_by text NOT NULL DEFAULT '';

-- default role presets by keyword (existing rows)
UPDATE public.template_items SET roles = '{土建}'
  WHERE roles = '{}' AND (title ~ '門|窗|磁磚|磚|牆|空心|防水|地坪|天花|粉刷');
UPDATE public.project_items SET roles = '{土建}'
  WHERE roles = '{}' AND (title ~ '門|窗|磁磚|磚|牆|空心|防水|地坪|天花|粉刷');
UPDATE public.template_items SET roles = '{水電}'
  WHERE roles = '{}' AND (title ~ '插座|開關|給水|排水|電|水|燈|管|弱電|配電');
UPDATE public.project_items SET roles = '{水電}'
  WHERE roles = '{}' AND (title ~ '插座|開關|給水|排水|電|水|燈|管|弱電|配電');

ALTER TABLE public.inspection_items REPLICA IDENTITY FULL;
ALTER TABLE public.space_windows REPLICA IDENTITY FULL;
ALTER TABLE public.space_dimensions REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.inspection_items'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.inspection_photos'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.space_windows'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.space_dimensions'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
