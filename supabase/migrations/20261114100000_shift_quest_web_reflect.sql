DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    GRANT EXECUTE ON FUNCTION public.shift_quest_progress_add(text, text, text, text, text, text, text, uuid) TO shift_quest_web;
  END IF;
END;
$$;
