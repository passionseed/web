-- Community calendar notifications, set at /admin/calendar.
-- * Instagram group: Instagram has no API for group chats, so the site builds a
--   ready-to-paste message and opens the group (people share it themselves).
-- * Discord: posts each new block (from the app) and sends reminders before a
--   block starts (from pg_cron below, through pg_net), to one channel webhook.
-- Both go to group spaces only, never to one person. Admin-only under RLS; the
-- webhook URL is a secret and is never sent back to the browser.
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS public.calendar_notify_settings (
  id TEXT PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  -- An instagram.com/direct/t/... thread link: it only opens for people already in the group.
  ig_group_url TEXT NULL CHECK (ig_group_url IS NULL OR ig_group_url ~ '^https://(www\.)?instagram\.com/direct/t/[0-9]+/?$'),
  -- {title} {when} {place} {link} are filled in per block.
  share_template TEXT NOT NULL DEFAULT E'📅 {title}\n🕖 {when}\n📍 {place}\nใครไปด้วยกดตรงนี้ 👉 {link}'
    CHECK (char_length(share_template) BETWEEN 1 AND 1000),
  discord_webhook_url TEXT NULL CHECK (
    discord_webhook_url IS NULL
    OR discord_webhook_url ~ '^https://(discord\.com|discordapp\.com)/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$'
  ),
  discord_on_create BOOLEAN NOT NULL DEFAULT true,
  -- Minutes before the start to remind (0 = when it starts).
  discord_remind_minutes INT[] NOT NULL DEFAULT '{60,0}'
    CHECK (array_length(discord_remind_minutes, 1) IS NULL OR array_length(discord_remind_minutes, 1) <= 5),
  updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.calendar_notify_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

-- Which notices went out, so each is sent once.
CREATE TABLE IF NOT EXISTS public.calendar_block_notices (
  block_id UUID NOT NULL REFERENCES public.calendar_blocks(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind ~ '^(created|remind:[0-9]+)$'),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (block_id, kind)
);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['calendar_notify_settings', 'calendar_block_notices'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "Admins manage %s" ON public.%I FOR ALL TO authenticated
         USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin''))
         WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin''))',
      t, t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;

-- Sends due Discord reminders. A reminder is due from (start - minutes) until
-- 15 minutes later; anything older is skipped, so turning reminders on never
-- floods the channel with old ones.
CREATE OR REPLACE FUNCTION public.calendar_send_reminders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.calendar_notify_settings;
  due RECORD;
  sent INT := 0;
  lead_text TEXT;
BEGIN
  SELECT * INTO s FROM public.calendar_notify_settings WHERE id = 'main';
  IF s.discord_webhook_url IS NULL THEN
    RETURN 0;
  END IF;

  FOR due IN
    SELECT b.id, b.title, b.starts_at, b.ends_at, b.place, m.minutes,
           (SELECT count(*) FROM public.calendar_block_people p WHERE p.block_id = b.id) AS going
    FROM public.calendar_blocks b
    CROSS JOIN LATERAL unnest(s.discord_remind_minutes) AS m(minutes)
    WHERE now() >= b.starts_at - make_interval(mins => m.minutes)
      AND now() < b.starts_at - make_interval(mins => m.minutes) + INTERVAL '15 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM public.calendar_block_notices n WHERE n.block_id = b.id AND n.kind = 'remind:' || m.minutes
      )
  LOOP
    INSERT INTO public.calendar_block_notices (block_id, kind) VALUES (due.id, 'remind:' || due.minutes)
    ON CONFLICT DO NOTHING;
    lead_text := CASE
      WHEN due.minutes = 0 THEN '🔔 เริ่มแล้ว'
      WHEN due.minutes % 1440 = 0 THEN '⏰ อีก ' || (due.minutes / 1440) || ' วัน'
      WHEN due.minutes % 60 = 0 THEN '⏰ อีก ' || (due.minutes / 60) || ' ชั่วโมง'
      ELSE '⏰ อีก ' || due.minutes || ' นาที'
    END;
    PERFORM net.http_post(
      url := s.discord_webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'content',
        lead_text || ': **' || due.title || '**' || E'\n'
          || to_char(due.starts_at AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') || '–'
          || to_char(due.ends_at AT TIME ZONE 'Asia/Bangkok', 'HH24:MI')
          || COALESCE(' · ' || due.place, '')
          || ' · ไปด้วย ' || due.going || ' คน' || E'\n'
          || 'https://www.passionseed.org/calendar?block=' || due.id,
        'allowed_mentions', jsonb_build_object('parse', '[]'::jsonb)
      )
    );
    sent := sent + 1;
  END LOOP;
  RETURN sent;
END;
$$;
REVOKE ALL ON FUNCTION public.calendar_send_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calendar_send_reminders() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('calendar-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'calendar-reminders');
  PERFORM cron.schedule('calendar-reminders', '*/5 * * * *', 'SELECT public.calendar_send_reminders()');
END $$;
