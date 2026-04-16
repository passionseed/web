-- Create trigger to send push notifications when inbox items are created
-- This calls the inbox-notification edge function via pg_net

-- First, ensure pg_net extension is available (for making HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_inbox_notification()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  edge_function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Construct the payload
  payload = jsonb_build_object(
    'record', row_to_json(NEW)
  );

  -- Get the edge function URL (Supabase provides this via env, fallback to local)
  edge_function_url := COALESCE(
    current_setting('app.settings.edge_function_url', true),
    'https://www.passionseed.org/functions/v1/inbox-notification'
  );

  -- Get service role key from env
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Make async HTTP POST to the edge function
  -- Using pg_net.http_post for non-blocking request
  PERFORM
    net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := payload
    );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the insert
    RAISE WARNING 'Failed to send inbox notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_inbox_notification ON public.hackathon_participant_inbox_items;

-- Create the trigger
CREATE TRIGGER trigger_inbox_notification
  AFTER INSERT ON public.hackathon_participant_inbox_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_inbox_notification();

COMMENT ON FUNCTION public.handle_inbox_notification() IS 
  'Sends push notification via edge function when new inbox items are created';
