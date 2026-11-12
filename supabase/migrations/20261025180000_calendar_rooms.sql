-- Calendar rooms: a block can name a Discord voice room (from a list admins
-- keep at /admin/calendar) and gets its planning whiteboard. Reminders now
-- carry the room and board links. Attendance is read from the room board's
-- Arrive / Help / Close cards and shown as counts only; nothing per person is
-- stored here. Additive and idempotent.

ALTER TABLE public.calendar_blocks
  ADD COLUMN IF NOT EXISTS room_channel_id TEXT NULL CHECK (room_channel_id IS NULL OR room_channel_id ~ '^[0-9]{5,25}$');

ALTER TABLE public.calendar_notify_settings
  ADD COLUMN IF NOT EXISTS discord_guild_id TEXT NULL CHECK (discord_guild_id IS NULL OR discord_guild_id ~ '^[0-9]{5,25}$');
-- [{ "name": "ห้อง 1", "channelId": "123..." }]
ALTER TABLE public.calendar_notify_settings
  ADD COLUMN IF NOT EXISTS voice_rooms JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(voice_rooms) = 'array' AND jsonb_array_length(voice_rooms) <= 20);

-- Same reminders as 20261025160000_calendar_notify.sql, now with the room and board links.
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
  room_line TEXT;
BEGIN
  SELECT * INTO s FROM public.calendar_notify_settings WHERE id = 'main';
  IF s.discord_webhook_url IS NULL THEN
    RETURN 0;
  END IF;

  FOR due IN
    SELECT b.id, b.title, b.starts_at, b.ends_at, b.place, b.room_channel_id, m.minutes,
           (SELECT count(*) FROM public.calendar_block_people p WHERE p.block_id = b.id) AS going,
           (SELECT r->>'name' FROM jsonb_array_elements(s.voice_rooms) r WHERE r->>'channelId' = b.room_channel_id LIMIT 1) AS room_name,
           (SELECT w.share_token FROM public.whiteboards w WHERE w.id = b.whiteboard_id AND w.link_access <> 'none') AS board_token
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
    room_line := '';
    IF due.room_channel_id IS NOT NULL AND s.discord_guild_id IS NOT NULL THEN
      room_line := room_line || E'\n🔊 เข้าห้อง ' || COALESCE(due.room_name, 'voice') || ': https://discord.com/channels/'
        || s.discord_guild_id || '/' || due.room_channel_id;
    END IF;
    IF due.board_token IS NOT NULL THEN
      room_line := room_line || E'\n📋 บอร์ดห้อง: https://www.passionseed.org/whiteboard/join/' || due.board_token;
    END IF;
    PERFORM net.http_post(
      url := s.discord_webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'content',
        lead_text || ': **' || due.title || '**' || E'\n'
          || to_char(due.starts_at AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') || '–'
          || to_char(due.ends_at AT TIME ZONE 'Asia/Bangkok', 'HH24:MI')
          || COALESCE(' · ' || due.place, '')
          || ' · ไปด้วย ' || due.going || ' คน'
          || room_line || E'\n'
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
