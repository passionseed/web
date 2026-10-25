-- LINE Official Account (@passionseed) inbox: one row per LINE user who has
-- messaged or followed the account, and every inbound message plus every reply
-- the team sends from /admin/line. Replies typed directly in LINE OA Manager
-- are not delivered to the webhook, so they are not captured here.
--
-- Messages contain student and parent personal data: admin-only RLS, and the
-- webhook writes with the service-role client.

CREATE TABLE IF NOT EXISTS public.line_contacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    line_user_id text NOT NULL UNIQUE,
    display_name text,
    picture_url text,
    status_message text,
    language text,
    is_following boolean NOT NULL DEFAULT true,
    followed_at timestamptz,
    unfollowed_at timestamptz,
    profile_fetched_at timestamptz,
    last_message_at timestamptz,
    last_message_preview text,
    last_message_direction text CHECK (last_message_direction IN ('inbound', 'outbound')),
    unread_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.line_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id uuid NOT NULL REFERENCES public.line_contacts(id) ON DELETE CASCADE,
    direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    -- LINE message type (text, image, sticker, ...) or event type (follow, unfollow).
    message_type text NOT NULL,
    text text,
    line_message_id text,
    webhook_event_id text,
    -- Inbound only: a reply token lets one free reply go out instead of a
    -- quota-counted push message. Claimed by setting reply_token_used_at.
    reply_token text,
    reply_token_used_at timestamptz,
    mark_as_read_token text,
    -- Outbound only.
    sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    send_method text CHECK (send_method IN ('reply', 'push')),
    send_status text NOT NULL DEFAULT 'sent' CHECK (send_status IN ('pending', 'sent', 'failed')),
    error text,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    sent_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.line_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "line_contacts_admin_all" ON public.line_contacts;
CREATE POLICY "line_contacts_admin_all" ON public.line_contacts
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'admin'
));

DROP POLICY IF EXISTS "line_messages_admin_all" ON public.line_messages;
CREATE POLICY "line_messages_admin_all" ON public.line_messages
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'admin'
));

-- LINE may redeliver a webhook event; its webhookEventId makes the insert idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_line_messages_webhook_event
  ON public.line_messages(webhook_event_id) WHERE webhook_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_line_messages_contact_sent
  ON public.line_messages(contact_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_line_contacts_last_message
  ON public.line_contacts(last_message_at DESC NULLS LAST);

DROP TRIGGER IF EXISTS update_line_contacts_updated_at ON public.line_contacts;
CREATE TRIGGER update_line_contacts_updated_at
    BEFORE UPDATE ON public.line_contacts
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

-- Keep the inbox list fields in step with the message log in one statement,
-- so concurrent webhook deliveries cannot lose an unread count.
CREATE OR REPLACE FUNCTION public.line_messages_touch_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.message_type IN ('follow', 'unfollow') OR NEW.send_status = 'failed' THEN
    RETURN NEW;
  END IF;

  UPDATE public.line_contacts
  SET last_message_at = GREATEST(COALESCE(last_message_at, NEW.sent_at), NEW.sent_at),
      last_message_preview = CASE
        WHEN last_message_at IS NULL OR NEW.sent_at >= last_message_at
          THEN LEFT(COALESCE(NEW.text, '[' || NEW.message_type || ']'), 200)
        ELSE last_message_preview
      END,
      last_message_direction = CASE
        WHEN last_message_at IS NULL OR NEW.sent_at >= last_message_at
          THEN NEW.direction
        ELSE last_message_direction
      END,
      unread_count = CASE
        WHEN NEW.direction = 'inbound' THEN unread_count + 1
        ELSE 0
      END
  WHERE id = NEW.contact_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS line_messages_touch_contact ON public.line_messages;
CREATE TRIGGER line_messages_touch_contact
    AFTER INSERT ON public.line_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.line_messages_touch_contact();
