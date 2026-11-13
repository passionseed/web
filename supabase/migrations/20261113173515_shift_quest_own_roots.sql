-- SHIFT High Island schema 11: members see their own roots, even on quiet trees.
-- Public roots keep the outsider consent rule and the same [{slot, roots}] shape.
-- Both reads share one counter: active members' project notes, learned >= 10
-- characters, earliest 3 per member per Asia/Bangkok day, levels 1/5/15.
-- Actor is a Discord id (text), as in shift_quest_island(actor). Trusted server
-- roles resolve it; never grant actor-taking reads to anon or authenticated.
-- Prod-first, idempotent functions only. The maintainer applies this migration.

CREATE OR REPLACE FUNCTION public.shift_quest__project_roots(p_project uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH notes AS (
    SELECT row_number() OVER (
      PARTITION BY e.member_id, (e.created_at AT TIME ZONE 'Asia/Bangkok')::date
      ORDER BY e.created_at, e.id
    ) AS nth
    FROM public.shift_quest_progress e
    JOIN public.shift_quest_project_members pm
      ON pm.project_id = e.project_id AND pm.member_id = e.member_id AND pm.status = 'active'
    JOIN public.shift_quest_projects p ON p.id = e.project_id AND p.archived_at IS NULL
    WHERE e.project_id = p_project AND e.kind = 'note'
      AND char_length(COALESCE(e.learned, '')) >= 10
  )
  SELECT CASE WHEN count(*) >= 15 THEN 3 WHEN count(*) >= 5 THEN 2
              WHEN count(*) >= 1 THEN 1 ELSE 0 END
  FROM notes WHERE nth <= 3;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_island_roots()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH shown AS (
    SELECT pl.slot, public.shift_quest__project_roots(pl.project_id) AS roots
    FROM public.shift_quest_plots pl
    JOIN public.shift_quest_projects p ON p.id = pl.project_id
    WHERE p.archived_at IS NULL AND public.shift_quest__name_visible(pl.project_id)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('slot', slot, 'roots', roots) ORDER BY slot), '[]'::jsonb)
  FROM shown WHERE roots > 0;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_island_my_roots(p_actor text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
BEGIN
  RETURN public.shift_quest__project_roots(v_project);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 11; $$;

-- Internal helper is callable only by the owning definer functions.
REVOKE ALL ON FUNCTION public.shift_quest__project_roots(uuid) FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_island_roots() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shift_quest_island_roots() TO service_role, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_island_my_roots(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shift_quest_island_my_roots(text) TO service_role, shift_quest_bot;
-- Schema version keeps its existing grants.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    REVOKE ALL ON FUNCTION public.shift_quest__project_roots(uuid) FROM shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_island_roots() TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_island_my_roots(text) TO shift_quest_web;
  END IF;
END;
$$;
