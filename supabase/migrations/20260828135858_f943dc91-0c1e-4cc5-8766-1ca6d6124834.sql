CREATE TABLE public.panel_circuits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  panel_id uuid NOT NULL REFERENCES public.project_panels(id) ON DELETE CASCADE,
  poles integer NOT NULL DEFAULT 1,
  amperage integer NOT NULL DEFAULT 15,
  wire_spec text NOT NULL DEFAULT '2',
  elcb boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT '',
  sort integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.panel_circuits TO authenticated;
GRANT ALL ON public.panel_circuits TO service_role;
ALTER TABLE public.panel_circuits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members manage panel circuits" ON public.panel_circuits
  FOR ALL TO authenticated
  USING (public.can_access_project(project_id))
  WITH CHECK (public.can_access_project(project_id));
CREATE INDEX panel_circuits_panel_idx ON public.panel_circuits(panel_id, sort);