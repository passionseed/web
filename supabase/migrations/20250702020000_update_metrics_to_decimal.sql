-- Alter reflection_metrics columns to support decimal values for smoother sliders

ALTER TABLE public.reflection_metrics
ALTER COLUMN satisfaction TYPE NUMERIC(3, 1),
ALTER COLUMN progress TYPE NUMERIC(3, 1),
ALTER COLUMN challenge TYPE NUMERIC(3, 1);
