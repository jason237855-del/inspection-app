ALTER TABLE public.inspection_items ADD CONSTRAINT inspection_items_unique_key UNIQUE (project_id, space, item_key);
ALTER TABLE public.space_measurements ADD CONSTRAINT space_measurements_unique_key UNIQUE (project_id, space);

CREATE POLICY "project members read inspection photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'inspection-photos' AND public.can_access_project(((storage.foldername(name))[1])::uuid));

CREATE POLICY "project members upload inspection photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inspection-photos' AND public.can_access_project(((storage.foldername(name))[1])::uuid));

CREATE POLICY "project members delete inspection photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'inspection-photos' AND public.can_access_project(((storage.foldername(name))[1])::uuid));