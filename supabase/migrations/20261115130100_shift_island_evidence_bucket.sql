-- SHIFT High Island: the private Storage bucket for quest photo evidence.
--
-- Paired with 20261115130000_shift_quest_evidence_photos (the rows, the
-- rules and the deletion queue). Kept in its own file, outside the
-- *shift_quest* name, because the quest database sandbox
-- (supabase/tests/shift_quests/run-local.sh) has no storage schema.
--
-- Private: no public URL, and no storage.objects policy grants anon or
-- authenticated anything here. The website reads and writes with the service
-- role only, after the quest database says the caller may (upload: the
-- submitter; view: the submitter, team-visible teammates, reviewers, and from
-- 20261115140000 the peers allowed to check it), and shows photos through
-- short-lived signed URLs. The restrictive guard below keeps it that way even
-- if a broad permissive policy is added to storage.objects later.
--
-- Only WebP: the website re-encodes every upload (EXIF and GPS stripped,
-- 1600 px at most). 4 MB cap per object.
--
-- Prod-first apply: idempotent (ON CONFLICT DO UPDATE, DROP POLICY IF EXISTS).

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('shift-quest-evidence', 'shift-quest-evidence', false, 4194304, ARRAY['image/webp'])
    ON CONFLICT (id) DO UPDATE
      SET public = false,
          file_size_limit = EXCLUDED.file_size_limit,
          allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS shift_quest_evidence_guard ON storage.objects;
    CREATE POLICY shift_quest_evidence_guard ON storage.objects
      AS RESTRICTIVE FOR ALL TO anon, authenticated
      USING (bucket_id <> 'shift-quest-evidence')
      WITH CHECK (bucket_id <> 'shift-quest-evidence');
  END IF;
END;
$$;
