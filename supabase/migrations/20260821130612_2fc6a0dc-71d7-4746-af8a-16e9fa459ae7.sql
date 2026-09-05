CREATE TABLE public.template_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.template_sets TO authenticated;
GRANT ALL ON public.template_sets TO service_role;
ALTER TABLE public.template_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template sets readable" ON public.template_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage template sets" ON public.template_sets FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.template_sets TO authenticated;

ALTER TABLE public.template_spaces ADD COLUMN set_id uuid REFERENCES public.template_sets(id) ON DELETE CASCADE;
ALTER TABLE public.template_categories ADD COLUMN set_id uuid REFERENCES public.template_sets(id) ON DELETE CASCADE;

ALTER TABLE public.projects
  ADD COLUMN property_type text NOT NULL DEFAULT '',
  ADD COLUMN total_ping numeric,
  ADD COLUMN layout text NOT NULL DEFAULT '',
  ADD COLUMN inspection_time text NOT NULL DEFAULT '',
  ADD COLUMN team_members uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN template_set_id uuid REFERENCES public.template_sets(id) ON DELETE SET NULL;