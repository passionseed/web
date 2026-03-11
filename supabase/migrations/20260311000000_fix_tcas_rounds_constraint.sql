-- Fix unique constraint for tcas_admission_rounds and clean up duplicates

-- 1. Remove duplicates
DELETE FROM public.tcas_admission_rounds a
USING public.tcas_admission_rounds b
WHERE a.id < b.id
  AND a.program_id = b.program_id
  AND a.round_type = b.round_type
  AND (a.project_id = b.project_id OR (a.project_id IS NULL AND b.project_id IS NULL));

-- 2. Drop old constraint
ALTER TABLE public.tcas_admission_rounds DROP CONSTRAINT IF EXISTS tcas_rounds_unique;

-- 3. Create proper unique index that handles NULLs
DROP INDEX IF EXISTS public.tcas_rounds_unique_idx;
CREATE UNIQUE INDEX tcas_rounds_unique_idx ON public.tcas_admission_rounds (program_id, round_type, (COALESCE(project_id, '')));
