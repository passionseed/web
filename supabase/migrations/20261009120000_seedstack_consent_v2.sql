-- SeedStack consent v2: under-20s need a parent (Thai PDPA s.20).
--
-- The student gives their birth date when they agree. Under 20 at that moment
-- means a parent must agree too, through the parent_* columns that already
-- exist from the first version. The device can link while the parent has not
-- answered yet; the events API stores nothing until they do.
--
-- Additive and idempotent: safe to apply straight to production.

ALTER TABLE public.seedstack_consents
  ADD COLUMN IF NOT EXISTS birth_date DATE NULL;

COMMENT ON COLUMN public.seedstack_consents.birth_date IS
  'Given by the student when agreeing. Under 20 then means parent consent is required.';
