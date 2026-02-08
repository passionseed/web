-- PathLab core schema
-- Adds solo/self-paced path experience on top of seeds + learning maps

-- 1) Extend seeds with seed_type
ALTER TABLE public.seeds
ADD COLUMN IF NOT EXISTS seed_type TEXT NOT NULL DEFAULT 'collaborative';

ALTER TABLE public.seeds
DROP CONSTRAINT IF EXISTS seeds_seed_type_check;

ALTER TABLE public.seeds
ADD CONSTRAINT seeds_seed_type_check
CHECK (seed_type IN ('collaborative', 'pathlab'));

CREATE INDEX IF NOT EXISTS idx_seeds_seed_type ON public.seeds(seed_type);

-- 2) Path tables
CREATE TABLE IF NOT EXISTS public.paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id UUID NOT NULL REFERENCES public.seeds(id) ON DELETE CASCADE,
  total_days INT NOT NULL DEFAULT 5 CHECK (total_days > 0),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(seed_id)
);

CREATE TABLE IF NOT EXISTS public.path_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.paths(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number > 0),
  context_text TEXT NOT NULL,
  reflection_prompts JSONB NOT NULL DEFAULT '[]'::jsonb,
  node_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(path_id, day_number)
);

CREATE TABLE IF NOT EXISTS public.path_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  path_id UUID NOT NULL REFERENCES public.paths(id) ON DELETE CASCADE,
  current_day INT NOT NULL DEFAULT 1 CHECK (current_day > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'quit', 'explored')),
  why_joined TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, path_id)
);

CREATE TABLE IF NOT EXISTS public.path_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.path_enrollments(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number > 0),
  energy_level INT NOT NULL CHECK (energy_level BETWEEN 1 AND 5),
  confusion_level INT NOT NULL CHECK (confusion_level BETWEEN 1 AND 5),
  interest_level INT NOT NULL CHECK (interest_level BETWEEN 1 AND 5),
  open_response TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('continue_now', 'continue_tomorrow', 'pause', 'quit', 'final_reflection')),
  time_spent_minutes INT CHECK (time_spent_minutes IS NULL OR time_spent_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, day_number)
);

CREATE TABLE IF NOT EXISTS public.path_exit_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.path_enrollments(id) ON DELETE CASCADE,
  trigger_day INT NOT NULL CHECK (trigger_day > 0),
  reason_category TEXT NOT NULL CHECK (reason_category IN ('boring', 'confusing', 'stressful', 'not_me')),
  interest_change TEXT NOT NULL CHECK (interest_change IN ('more', 'less', 'same')),
  open_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id)
);

CREATE TABLE IF NOT EXISTS public.path_end_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.path_enrollments(id) ON DELETE CASCADE,
  overall_interest INT NOT NULL CHECK (overall_interest BETWEEN 1 AND 5),
  fit_level INT NOT NULL CHECK (fit_level BETWEEN 1 AND 5),
  surprise_response TEXT,
  would_explore_deeper TEXT NOT NULL CHECK (would_explore_deeper IN ('yes', 'maybe', 'no')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id)
);

CREATE TABLE IF NOT EXISTS public.path_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.path_enrollments(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  report_data JSONB NOT NULL,
  report_text TEXT,
  share_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_paths_seed_id ON public.paths(seed_id);
CREATE INDEX IF NOT EXISTS idx_path_days_path_id_day_number ON public.path_days(path_id, day_number);
CREATE INDEX IF NOT EXISTS idx_path_enrollments_user_id ON public.path_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_path_enrollments_path_id ON public.path_enrollments(path_id);
CREATE INDEX IF NOT EXISTS idx_path_enrollments_status ON public.path_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_path_reflections_enrollment_id ON public.path_reflections(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_path_reflections_enrollment_day ON public.path_reflections(enrollment_id, day_number);
CREATE INDEX IF NOT EXISTS idx_path_exit_reflections_enrollment_id ON public.path_exit_reflections(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_path_end_reflections_enrollment_id ON public.path_end_reflections(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_path_reports_enrollment_id ON public.path_reports(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_path_reports_share_token ON public.path_reports(share_token);

-- 4) RLS
ALTER TABLE public.paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_exit_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_end_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_reports ENABLE ROW LEVEL SECURITY;

-- paths
DROP POLICY IF EXISTS "Paths are viewable by authenticated users" ON public.paths;
CREATE POLICY "Paths are viewable by everyone"
  ON public.paths FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Paths are manageable by seed creator and admins" ON public.paths;
CREATE POLICY "Paths are manageable by seed creator and admins"
  ON public.paths FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.seeds s
      WHERE s.id = paths.seed_id
      AND (
        s.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'instructor')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.seeds s
      WHERE s.id = paths.seed_id
      AND (
        s.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'instructor')
        )
      )
    )
  );

-- path_days
DROP POLICY IF EXISTS "Path days are viewable by enrolled users and admins" ON public.path_days;
CREATE POLICY "Path days are viewable by enrolled users and admins"
  ON public.path_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      WHERE pe.path_id = path_days.path_id
      AND pe.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.paths p
      JOIN public.seeds s ON s.id = p.seed_id
      WHERE p.id = path_days.path_id
      AND (
        s.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'instructor')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Path days are manageable by seed creator and admins" ON public.path_days;
CREATE POLICY "Path days are manageable by seed creator and admins"
  ON public.path_days FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.paths p
      JOIN public.seeds s ON s.id = p.seed_id
      WHERE p.id = path_days.path_id
      AND (
        s.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'instructor')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.paths p
      JOIN public.seeds s ON s.id = p.seed_id
      WHERE p.id = path_days.path_id
      AND (
        s.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'instructor')
        )
      )
    )
  );

-- path_enrollments
DROP POLICY IF EXISTS "Users can read their own path enrollments" ON public.path_enrollments;
CREATE POLICY "Users can read their own path enrollments"
  ON public.path_enrollments FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.paths p
      JOIN public.seeds s ON s.id = p.seed_id
      WHERE p.id = path_enrollments.path_id
      AND (
        s.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'instructor')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can create their own path enrollments" ON public.path_enrollments;
CREATE POLICY "Users can create their own path enrollments"
  ON public.path_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own path enrollments" ON public.path_enrollments;
CREATE POLICY "Users can update their own path enrollments"
  ON public.path_enrollments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- path_reflections
DROP POLICY IF EXISTS "Users can read reflections for own enrollment" ON public.path_reflections;
CREATE POLICY "Users can read reflections for own enrollment"
  ON public.path_reflections FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      WHERE pe.id = path_reflections.enrollment_id
      AND (
        pe.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.paths p
          JOIN public.seeds s ON s.id = p.seed_id
          WHERE p.id = pe.path_id
          AND (
            s.created_by = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'instructor')
            )
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can create reflections for own enrollment" ON public.path_reflections;
CREATE POLICY "Users can create reflections for own enrollment"
  ON public.path_reflections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      WHERE pe.id = path_reflections.enrollment_id
      AND pe.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update reflections for own enrollment" ON public.path_reflections;
CREATE POLICY "Users can update reflections for own enrollment"
  ON public.path_reflections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      WHERE pe.id = path_reflections.enrollment_id
      AND pe.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      WHERE pe.id = path_reflections.enrollment_id
      AND pe.user_id = auth.uid()
    )
  );

-- path_exit_reflections
DROP POLICY IF EXISTS "Users can read exit reflections for own enrollment" ON public.path_exit_reflections;
CREATE POLICY "Users can read exit reflections for own enrollment"
  ON public.path_exit_reflections FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      WHERE pe.id = path_exit_reflections.enrollment_id
      AND (
        pe.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.paths p
          JOIN public.seeds s ON s.id = p.seed_id
          WHERE p.id = pe.path_id
          AND (
            s.created_by = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'instructor')
            )
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage exit reflections for own enrollment" ON public.path_exit_reflections;
CREATE POLICY "Users can manage exit reflections for own enrollment"
  ON public.path_exit_reflections FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      WHERE pe.id = path_exit_reflections.enrollment_id
      AND pe.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      WHERE pe.id = path_exit_reflections.enrollment_id
      AND pe.user_id = auth.uid()
    )
  );

-- path_end_reflections
DROP POLICY IF EXISTS "Users can read end reflections for own enrollment" ON public.path_end_reflections;
CREATE POLICY "Users can read end reflections for own enrollment"
  ON public.path_end_reflections FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      WHERE pe.id = path_end_reflections.enrollment_id
      AND (
        pe.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.paths p
          JOIN public.seeds s ON s.id = p.seed_id
          WHERE p.id = pe.path_id
          AND (
            s.created_by = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'instructor')
            )
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage end reflections for own enrollment" ON public.path_end_reflections;
CREATE POLICY "Users can manage end reflections for own enrollment"
  ON public.path_end_reflections FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      WHERE pe.id = path_end_reflections.enrollment_id
      AND pe.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      WHERE pe.id = path_end_reflections.enrollment_id
      AND pe.user_id = auth.uid()
    )
  );

-- path_reports
DROP POLICY IF EXISTS "Admins can read all path reports" ON public.path_reports;
CREATE POLICY "Admins can read all path reports"
  ON public.path_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'instructor')
    )
    OR EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      JOIN public.paths p ON p.id = pe.path_id
      JOIN public.seeds s ON s.id = p.seed_id
      WHERE pe.id = path_reports.enrollment_id
      AND s.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can create path reports" ON public.path_reports;
CREATE POLICY "Admins can create path reports"
  ON public.path_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'instructor')
    )
    OR EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      JOIN public.paths p ON p.id = pe.path_id
      JOIN public.seeds s ON s.id = p.seed_id
      WHERE pe.id = path_reports.enrollment_id
      AND s.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update path reports" ON public.path_reports;
CREATE POLICY "Admins can update path reports"
  ON public.path_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'instructor')
    )
    OR EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      JOIN public.paths p ON p.id = pe.path_id
      JOIN public.seeds s ON s.id = p.seed_id
      WHERE pe.id = path_reports.enrollment_id
      AND s.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'instructor')
    )
    OR EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      JOIN public.paths p ON p.id = pe.path_id
      JOIN public.seeds s ON s.id = p.seed_id
      WHERE pe.id = path_reports.enrollment_id
      AND s.created_by = auth.uid()
    )
  );

-- 5) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.paths TO authenticated;
GRANT SELECT ON TABLE public.paths TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.path_days TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.path_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.path_reflections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.path_exit_reflections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.path_end_reflections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.path_reports TO authenticated;
