-- Update ikigai columns to use JSONB for flexible storage of items with positions
ALTER TABLE public.pre_questionnaires
  DROP COLUMN IF EXISTS what_you_love,
  DROP COLUMN IF EXISTS what_you_are_good_at,
  DROP COLUMN IF EXISTS what_you_can_be_paid_for,
  DROP COLUMN IF EXISTS what_the_world_needs;

ALTER TABLE public.pre_questionnaires
  ADD COLUMN ikigai_items JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.pre_questionnaires.ikigai_items IS 'Array of ikigai items with id, text, x, y, and category fields';
