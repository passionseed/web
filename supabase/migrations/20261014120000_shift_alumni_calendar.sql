-- SHIFT alumni calendar (/shift/alumni). One row holds the whole calendar as
-- JSON: default time and place, plus the sessions admins filled in. The public
-- page reads with the service role; only admins can write. Holds co-host
-- nicknames at most, no other student data.

CREATE TABLE IF NOT EXISTS public.shift_alumni_calendar (
  id TEXT PRIMARY KEY DEFAULT 'main',
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.shift_alumni_calendar IS 'SHIFT alumni session calendar, edited by admins on /shift/alumni';

ALTER TABLE public.shift_alumni_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage shift alumni calendar" ON public.shift_alumni_calendar;
CREATE POLICY "Admins can manage shift alumni calendar"
  ON public.shift_alumni_calendar
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_alumni_calendar TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_alumni_calendar TO service_role;
