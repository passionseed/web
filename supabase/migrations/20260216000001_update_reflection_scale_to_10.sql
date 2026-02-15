-- Update reflection scales from 1-5 to 1-10 for better granularity

-- Update path_reflections constraints
ALTER TABLE public.path_reflections
DROP CONSTRAINT IF EXISTS path_reflections_energy_level_check;

ALTER TABLE public.path_reflections
ADD CONSTRAINT path_reflections_energy_level_check
CHECK (energy_level BETWEEN 1 AND 10);

ALTER TABLE public.path_reflections
DROP CONSTRAINT IF EXISTS path_reflections_confusion_level_check;

ALTER TABLE public.path_reflections
ADD CONSTRAINT path_reflections_confusion_level_check
CHECK (confusion_level BETWEEN 1 AND 10);

ALTER TABLE public.path_reflections
DROP CONSTRAINT IF EXISTS path_reflections_interest_level_check;

ALTER TABLE public.path_reflections
ADD CONSTRAINT path_reflections_interest_level_check
CHECK (interest_level BETWEEN 1 AND 10);

-- Update path_end_reflections constraints
ALTER TABLE public.path_end_reflections
DROP CONSTRAINT IF EXISTS path_end_reflections_overall_interest_check;

ALTER TABLE public.path_end_reflections
ADD CONSTRAINT path_end_reflections_overall_interest_check
CHECK (overall_interest BETWEEN 1 AND 10);

ALTER TABLE public.path_end_reflections
DROP CONSTRAINT IF EXISTS path_end_reflections_fit_level_check;

ALTER TABLE public.path_end_reflections
ADD CONSTRAINT path_end_reflections_fit_level_check
CHECK (fit_level BETWEEN 1 AND 10);
