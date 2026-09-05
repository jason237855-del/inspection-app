CREATE TABLE public.space_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  space text NOT NULL,
  name text NOT NULL DEFAULT '區域 1',
  sort integer NOT NULL DEFAULT 0,
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,
  use_length boolean NOT NULL DEFAULT true,
  use_width boolean NOT NULL DEFAULT true,
  use_height boolean NOT NULL DEFAULT true,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.space_dimensions TO authenticated;
GRANT ALL ON public.space_dimensions TO service_role;

ALTER TABLE public.space_dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members manage dimensions" ON public.space_dimensions
FOR ALL TO authenticated
USING (public.can_access_project(project_id))
WITH CHECK (public.can_access_project(project_id));

CREATE INDEX space_dimensions_project_space_idx ON public.space_dimensions (project_id, space, sort);