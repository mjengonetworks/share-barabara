-- Auto-populate avatar_url from OAuth provider metadata on signup (Google
-- sends it as avatar_url or picture depending on provider version). Users can
-- still change it later from Settings.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1), 'Road user'),
    trim(both '-' from regexp_replace(
      lower(COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1), 'user')),
      '[^a-z0-9]+', '-', 'g'
    )) || '-' || substr(replace(NEW.id::text, '-', ''), 1, 6),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;
