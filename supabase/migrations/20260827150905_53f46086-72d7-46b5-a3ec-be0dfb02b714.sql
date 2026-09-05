CREATE TABLE IF NOT EXISTS public.project_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT '業務',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_staff TO authenticated;
GRANT ALL ON public.project_staff TO service_role;
ALTER TABLE public.project_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project members manage staff" ON public.project_staff;
CREATE POLICY "project members manage staff" ON public.project_staff FOR ALL TO authenticated
  USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));