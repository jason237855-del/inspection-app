ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS inspection_package text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS developer text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vehicle text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS builder_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes_important boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_pre_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS video_post_url text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.project_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL,
  signer_name text NOT NULL DEFAULT '',
  data_url text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_signatures TO authenticated;
GRANT ALL ON public.project_signatures TO service_role;
ALTER TABLE public.project_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project members manage signatures" ON public.project_signatures;
CREATE POLICY "project members manage signatures" ON public.project_signatures FOR ALL TO authenticated
  USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));

CREATE TABLE IF NOT EXISTS public.project_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '主電箱',
  amperage text NOT NULL DEFAULT '',
  wire_spec text NOT NULL DEFAULT '',
  circuits integer,
  note text NOT NULL DEFAULT '',
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_panels TO authenticated;
GRANT ALL ON public.project_panels TO service_role;
ALTER TABLE public.project_panels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project members manage panels" ON public.project_panels;
CREATE POLICY "project members manage panels" ON public.project_panels FOR ALL TO authenticated
  USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));