-- Add preferred_language column to profiles table
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "preferred_language" text DEFAULT 'en' NOT NULL;

-- Add check constraint for valid languages
ALTER TABLE "public"."profiles"
ADD CONSTRAINT "profiles_preferred_language_check" 
CHECK (preferred_language IN ('en', 'th'));

-- Comment on column
COMMENT ON COLUMN "public"."profiles"."preferred_language" IS 'User preferred language (en or th)';
