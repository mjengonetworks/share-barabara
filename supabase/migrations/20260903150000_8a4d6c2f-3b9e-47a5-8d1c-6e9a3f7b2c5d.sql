-- Notify editor+ staff whenever a guest author submits an edit/deletion
-- request on published content, so it doesn't sit unseen in the requests queue.
CREATE OR REPLACE FUNCTION public.notify_staff_on_content_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _staff_id UUID;
  _title TEXT;
BEGIN
  _title := CASE
    WHEN NEW.request_type = 'delete' THEN 'Deletion request'
    ELSE 'Edit request'
  END || ' — ' || NEW.entity_type;

  FOR _staff_id IN
    SELECT DISTINCT user_id FROM public.user_roles WHERE public.has_min_role(user_id, 'editor')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      _staff_id,
      'content_request',
      _title,
      NEW.message,
      '/admin/requests'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_requests_notify_staff ON public.content_requests;
CREATE TRIGGER content_requests_notify_staff AFTER INSERT ON public.content_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_content_request();
