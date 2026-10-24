-- Whiteboards: multiplayer Excalidraw boards that people save and share by link.
-- Tables are admin-only under RLS; the app reads and writes through the
-- service role after its own owner/member checks (same pattern as the SHIFT
-- alumni board). Live editing runs over private Supabase Realtime channels
-- named "whiteboard:<id>", authorised by the realtime.messages policies below.
-- Safeguarding: every member of a board is listed on the board itself, and
-- admins can open any board read-only. Additive and idempotent.

CREATE TABLE IF NOT EXISTS public.whiteboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled board' CHECK (char_length(title) BETWEEN 1 AND 120),
  -- Excalidraw elements, deleted ones kept as tombstones so merges converge.
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Small PNG data URL for the board list.
  thumbnail TEXT NULL CHECK (thumbnail IS NULL OR char_length(thumbnail) <= 400000),
  -- Anyone signed in with the link joins with this access; 'none' turns the link off.
  share_token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  link_access TEXT NOT NULL DEFAULT 'edit' CHECK (link_access IN ('none', 'view', 'edit')),
  -- Shared facilitator timer: when it rings, and how long it was set for.
  timer_ends_at TIMESTAMPTZ NULL,
  timer_seconds INT NULL CHECK (timer_seconds IS NULL OR timer_seconds BETWEEN 1 AND 86400),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_whiteboards_share_token ON public.whiteboards (share_token);
CREATE INDEX IF NOT EXISTS idx_whiteboards_owner ON public.whiteboards (owner_id, updated_at DESC);

-- People who joined through the share link. The owner is not listed here.
CREATE TABLE IF NOT EXISTS public.whiteboard_members (
  whiteboard_id UUID NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (whiteboard_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_whiteboard_members_user ON public.whiteboard_members (user_id, last_opened_at DESC);

-- Images placed on a board. Excalidraw files never change once added.
CREATE TABLE IF NOT EXISTS public.whiteboard_files (
  whiteboard_id UUID NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL CHECK (char_length(file_id) BETWEEN 1 AND 100),
  mime_type TEXT NOT NULL CHECK (char_length(mime_type) BETWEEN 1 AND 100),
  data_url TEXT NOT NULL CHECK (char_length(data_url) <= 4000000),
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (whiteboard_id, file_id)
);

-- Version history: named saves plus an automatic snapshot at most every
-- 30 minutes of editing. Elements are the live (non-deleted) ones only.
CREATE TABLE IF NOT EXISTS public.whiteboard_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
  label TEXT NULL CHECK (label IS NULL OR char_length(label) BETWEEN 1 AND 120),
  elements JSONB NOT NULL,
  thumbnail TEXT NULL CHECK (thumbnail IS NULL OR char_length(thumbnail) <= 400000),
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whiteboard_versions_board ON public.whiteboard_versions (whiteboard_id, created_at DESC);

-- Comment threads pinned to a point on the canvas. Visible to everyone on the board.
CREATE TABLE IF NOT EXISTS public.whiteboard_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
  parent_id UUID NULL REFERENCES public.whiteboard_comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  x DOUBLE PRECISION NULL,
  y DOUBLE PRECISION NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whiteboard_comments_board ON public.whiteboard_comments (whiteboard_id, created_at);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['whiteboards', 'whiteboard_members', 'whiteboard_files', 'whiteboard_versions', 'whiteboard_comments'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "Admins manage %s" ON public.%I FOR ALL TO authenticated
         USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin''))
         WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin''))',
      t, t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;

-- The caller's access to a board: 'owner', 'editor', 'viewer' or NULL.
-- Admins who are not members get 'viewer' so boards stay visible to staff.
CREATE OR REPLACE FUNCTION public.whiteboard_role(p_board UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT 'owner' FROM public.whiteboards WHERE id = p_board AND owner_id = auth.uid()),
    (SELECT role FROM public.whiteboard_members WHERE whiteboard_id = p_board AND user_id = auth.uid()),
    (SELECT 'viewer' FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin' LIMIT 1)
  );
$$;
REVOKE ALL ON FUNCTION public.whiteboard_role(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whiteboard_role(UUID) TO authenticated, service_role;

-- Merge incoming elements into the saved board under a row lock: for each
-- element id the higher version wins, ties go to the incoming copy, and the
-- result is ordered by Excalidraw's fractional index. Concurrent saves from
-- several editors therefore never drop each other's work. When the newest
-- version is over 30 minutes old (or there is none), the board as it was
-- before this save is kept as an automatic version.
CREATE OR REPLACE FUNCTION public.whiteboard_merge_elements(p_board UUID, p_elements JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_elements JSONB;
BEGIN
  SELECT elements INTO current_elements FROM public.whiteboards WHERE id = p_board FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'whiteboard % not found', p_board;
  END IF;

  IF jsonb_array_length(current_elements) > 0 AND NOT EXISTS (
    SELECT 1 FROM public.whiteboard_versions
    WHERE whiteboard_id = p_board AND created_at > now() - INTERVAL '30 minutes'
  ) THEN
    INSERT INTO public.whiteboard_versions (whiteboard_id, elements, thumbnail)
    SELECT p_board,
           COALESCE((SELECT jsonb_agg(el) FROM jsonb_array_elements(current_elements) el
                     WHERE COALESCE((el->>'isDeleted')::BOOLEAN, false) = false), '[]'::jsonb),
           w.thumbnail
    FROM public.whiteboards w WHERE w.id = p_board;
    -- Keep the newest 100 automatic versions; named ones stay.
    DELETE FROM public.whiteboard_versions
    WHERE whiteboard_id = p_board AND label IS NULL AND id NOT IN (
      SELECT id FROM public.whiteboard_versions
      WHERE whiteboard_id = p_board AND label IS NULL
      ORDER BY created_at DESC LIMIT 100
    );
  END IF;

  UPDATE public.whiteboards
  SET elements = (
        SELECT COALESCE(jsonb_agg(m.el ORDER BY m.el->>'index' COLLATE "C", m.el->>'id'), '[]'::jsonb)
        FROM (
          SELECT DISTINCT ON (s.el->>'id') s.el
          FROM (
            SELECT el, 1 AS incoming FROM jsonb_array_elements(p_elements) AS el
            UNION ALL
            SELECT el, 0 AS incoming FROM jsonb_array_elements(current_elements) AS el
          ) s
          WHERE s.el ? 'id'
          ORDER BY s.el->>'id', COALESCE((s.el->>'version')::INT, 0) DESC, s.incoming DESC
        ) m
      ),
      updated_at = now()
  WHERE id = p_board;
END;
$$;
REVOKE ALL ON FUNCTION public.whiteboard_merge_elements(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whiteboard_merge_elements(UUID, JSONB) TO service_role;

-- Realtime: members join "whiteboard:<id>" as private channels. Everyone with
-- access receives and shares presence and cursors; only owners and editors
-- may broadcast scene changes.
CREATE OR REPLACE FUNCTION public.whiteboard_topic_role(p_topic TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_topic ~ '^whiteboard:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.whiteboard_role(substring(p_topic FROM 12)::UUID)
    ELSE NULL
  END;
$$;
REVOKE ALL ON FUNCTION public.whiteboard_topic_role(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whiteboard_topic_role(TEXT) TO authenticated, service_role;

DROP POLICY IF EXISTS "Whiteboard members receive" ON realtime.messages;
CREATE POLICY "Whiteboard members receive" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.messages.extension IN ('broadcast', 'presence')
    AND public.whiteboard_topic_role(realtime.topic()) IS NOT NULL
  );

DROP POLICY IF EXISTS "Whiteboard members send" ON realtime.messages;
CREATE POLICY "Whiteboard members send" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.whiteboard_topic_role(realtime.topic()) IS NOT NULL
    AND (
      realtime.messages.extension = 'presence'
      OR (
        realtime.messages.extension = 'broadcast'
        AND (
          realtime.messages.event = 'cursor'
          OR public.whiteboard_topic_role(realtime.topic()) IN ('owner', 'editor')
        )
      )
    )
  );
