ALTER TABLE public.project_categories ADD COLUMN IF NOT EXISTS space_id uuid REFERENCES public.project_spaces(id) ON DELETE CASCADE;
ALTER TABLE public.project_items ADD COLUMN IF NOT EXISTS space_id uuid REFERENCES public.project_spaces(id) ON DELETE CASCADE;
ALTER TABLE public.project_categories DROP CONSTRAINT IF EXISTS project_categories_project_name_key;
ALTER TABLE public.project_categories DROP CONSTRAINT IF EXISTS project_categories_project_id_name_key;

DO $$
DECLARE sp record; c record; newcat uuid; it record; newitem uuid;
BEGIN
  FOR sp IN SELECT * FROM public.project_spaces LOOP
    FOR c IN SELECT * FROM public.project_categories WHERE project_id = sp.project_id AND space_id IS NULL LOOP
      INSERT INTO public.project_categories(project_id, space_id, name, sort)
      VALUES (sp.project_id, sp.id, c.name, c.sort) RETURNING id INTO newcat;
      FOR it IN SELECT * FROM public.project_items WHERE category_id = c.id AND space_id IS NULL LOOP
        INSERT INTO public.project_items(project_id, space_id, category_id, title, sort, hidden)
        VALUES (sp.project_id, sp.id, newcat, it.title, it.sort, it.hidden) RETURNING id INTO newitem;
        UPDATE public.inspection_items SET item_key = newitem::text
          WHERE project_id = sp.project_id AND space = sp.name AND item_key = it.id::text;
        UPDATE public.inspection_photos SET item_key = newitem::text
          WHERE project_id = sp.project_id AND space = sp.name AND item_key = it.id::text;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

DELETE FROM public.project_items WHERE space_id IS NULL;
DELETE FROM public.project_categories WHERE space_id IS NULL;

ALTER TABLE public.project_categories ALTER COLUMN space_id SET NOT NULL;
ALTER TABLE public.project_items ALTER COLUMN space_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS project_categories_space_name_key
  ON public.project_categories(space_id, name);

CREATE TABLE IF NOT EXISTS public.space_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  space text NOT NULL,
  name text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  moisture_left numeric,
  moisture_right numeric,
  moisture_bottom numeric,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.space_windows TO authenticated;
GRANT ALL ON public.space_windows TO service_role;
ALTER TABLE public.space_windows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project members manage windows" ON public.space_windows;
CREATE POLICY "project members manage windows" ON public.space_windows FOR ALL TO authenticated
  USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));