-- Drop the old constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS education_level_check;

-- Add the updated constraint with only 3 options
ALTER TABLE public.profiles 
ADD CONSTRAINT education_level_check 
CHECK (education_level IN ('high_school', 'university', 'unaffiliated'));

-- Update any 'graduated' or 'working' values to 'unaffiliated'
UPDATE public.profiles 
SET education_level = 'unaffiliated' 
WHERE education_level IN ('graduated', 'working');