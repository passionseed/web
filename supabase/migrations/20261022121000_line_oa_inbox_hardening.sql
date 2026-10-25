-- Tighten the LINE inbox objects from 20261022120000_line_oa_inbox.sql:
-- the trigger function is only ever called by its trigger, and the admin
-- policies never need to be evaluated for anonymous requests.

REVOKE EXECUTE ON FUNCTION public.line_messages_touch_contact() FROM PUBLIC, anon, authenticated;

ALTER POLICY "line_contacts_admin_all" ON public.line_contacts TO authenticated;
ALTER POLICY "line_messages_admin_all" ON public.line_messages TO authenticated;
