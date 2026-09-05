DELETE FROM public.projects WHERE created_by IN (SELECT id FROM public.profiles WHERE email LIKE '%1787014337@example.com');
DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE '%1787014337@example.com');
DELETE FROM public.profiles WHERE email LIKE '%1787014337@example.com';