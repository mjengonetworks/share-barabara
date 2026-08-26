-- Bootstrap the first real admin account. Role approvals normally happen
-- through the admin panel (an existing admin grants the 'admin'/'moderator'
-- role to another user), but the very first admin can't be approved that
-- way since no admin exists yet — so it's granted directly here.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'phabian.muok@gmail.com'
ON CONFLICT DO NOTHING;
