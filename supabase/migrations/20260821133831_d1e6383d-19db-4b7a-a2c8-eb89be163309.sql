
CREATE OR REPLACE FUNCTION public.can_access_project(_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = _project_id
          AND (p.assigned_inspector = auth.uid() OR auth.uid() = ANY (p.team_members))
      )
$function$;

DROP POLICY IF EXISTS "inspectors read assigned projects" ON public.projects;
CREATE POLICY "inspectors read assigned projects" ON public.projects
  FOR SELECT TO authenticated
  USING (assigned_inspector = auth.uid() OR auth.uid() = ANY (team_members));

DROP POLICY IF EXISTS "inspectors update assigned project" ON public.projects;
CREATE POLICY "inspectors update assigned project" ON public.projects
  FOR UPDATE TO authenticated
  USING (assigned_inspector = auth.uid() OR auth.uid() = ANY (team_members))
  WITH CHECK (assigned_inspector = auth.uid() OR auth.uid() = ANY (team_members));
