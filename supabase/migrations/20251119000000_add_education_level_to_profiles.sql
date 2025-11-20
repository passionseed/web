-- Add education level to profiles table
ALTER TABLE public.profiles 
ADD COLUMN education_level text DEFAULT 'high_school';

-- Add a constraint to ensure valid education levels
ALTER TABLE public.profiles 
ADD CONSTRAINT education_level_check 
CHECK (education_level IN ('high_school', 'university', 'unaffiliated'));

-- Update any existing profiles to have default education level
UPDATE public.profiles 
SET education_level = 'high_school' 
WHERE education_level IS NULL;