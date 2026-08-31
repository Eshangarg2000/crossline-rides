INSERT INTO public.user_roles (user_id, role)
VALUES ('498935e6-8b95-4027-bfa5-c0d426ee4263', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;