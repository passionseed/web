-- Schema 12: one atomic close + journal write, bound to the modal's session.
-- Functions only, additive and idempotent. The maintainer applies this file.
CREATE OR REPLACE FUNCTION public.shift_quest_work_open(p_actor text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  RETURN (SELECT id FROM public.shift_quest_work_sessions
          WHERE member_id = v_member.id AND ended_at IS NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_round_close(
  p_actor text, p_session uuid, p_learned text, p_stuck text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_intention text;
BEGIN
  -- Lock only the captured row, including when already closed. A concurrent
  -- work_end/start cannot make this call close a replacement session.
  SELECT intention INTO v_intention FROM public.shift_quest_work_sessions
  WHERE id = p_session AND member_id = v_member.id
  FOR UPDATE;

  UPDATE public.shift_quest_work_sessions
  SET ended_at = now(), reflection = public.shift_quest__check_len(p_learned, 1000, false)
  WHERE id = p_session AND member_id = v_member.id AND ended_at IS NULL;

  -- Reuse validation, trimming, member/project resolution, note default and
  -- progress_add audit. Any failure rolls the session update back as well.
  RETURN public.shift_quest_progress_add(
    p_actor, COALESCE(v_intention, 'รอบกองไฟ'), p_learned, NULL,
    p_stuck, NULL, 'private', NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 12; $$;

REVOKE ALL ON FUNCTION public.shift_quest_work_open(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shift_quest_round_close(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shift_quest_work_open(text) TO shift_quest_bot, service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_round_close(text, uuid, text, text) TO shift_quest_bot, service_role;
-- Schema version keeps its existing grants.
