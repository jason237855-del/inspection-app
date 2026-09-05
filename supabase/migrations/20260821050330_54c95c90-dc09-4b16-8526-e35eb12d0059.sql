
DELETE FROM public.project_categories a
USING public.project_categories b
WHERE a.project_id = b.project_id AND a.name = b.name AND a.ctid > b.ctid;

ALTER TABLE public.project_categories ADD CONSTRAINT project_categories_project_name_key UNIQUE (project_id, name);
ALTER TABLE public.template_categories ADD CONSTRAINT template_categories_name_key UNIQUE (name);
