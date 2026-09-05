UPDATE public.user_roles ur SET role='admin'
FROM public.profiles p
WHERE p.id = ur.user_id AND p.email = 'admin1787014337@example.com';