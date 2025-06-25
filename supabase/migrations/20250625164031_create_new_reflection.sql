-- Migration: Transform Production Schema to Target Schema
-- This script safely migrates the database from its current state to the desired final state.
-- It handles data migration for the reflections table and creates all new required tables and types.

BEGIN;

-- =================================================================
-- 1. DEFINE NEW TYPES
-- =================================================================
-- Create a new ENUM type for emotions, to be used in the `reflections` and `monthly_insights` tables.
-- This command will be ignored if the type already exists.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emotion') THEN
        CREATE TYPE public.emotion AS ENUM (
            'joy',
            'curiosity',
            'fulfillment',
            'challenge',
            'sadness',
            'anxiety',
            'anticipation',
            'trust'
        );
    END IF;
END$$;


-- =================================================================
-- 2. CREATE NEW TABLES (that don't depend on modified tables yet)
-- =================================================================

-- Create the `chat_messages` table. This will hold the data from the old `reflections` table.
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text])),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
COMMENT ON TABLE public.chat_messages IS 'Stores chat history between users and the assistant, migrated from the old reflections table.';

-- Create the `tags` table, which will be referenced by other new tables.
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  color character varying DEFAULT '#6b7280'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tags_pkey PRIMARY KEY (id),
  CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
COMMENT ON TABLE public.tags IS 'User-defined tags for categorizing reflections.';


-- =================================================================
-- 3. MODIFY THE `reflections` TABLE (THE MAIN TASK)
-- =================================================================

-- Step 3.1: Migrate existing chat data from `reflections` to the new `chat_messages` table.
-- This ensures no chat history is lost. We only insert if the message doesn't already exist to make this script re-runnable.
INSERT INTO public.chat_messages (id, user_id, role, content, created_at)
SELECT id, user_id, role, content, created_at
FROM public.reflections
WHERE role IN ('user', 'assistant')
ON CONFLICT (id) DO NOTHING;

-- Step 3.2: Delete the migrated chat messages from the `reflections` table.
-- Real reflections (if any existed without a role) will be preserved.
DELETE FROM public.reflections WHERE role IN ('user', 'assistant');

-- Step 3.3: Drop the old `role` column as it is now redundant.
ALTER TABLE public.reflections
DROP COLUMN IF EXISTS role;

-- Step 3.4: Add the new `emotion` column. We add it with a default to satisfy NOT NULL for any existing rows.
ALTER TABLE public.reflections ADD COLUMN IF NOT EXISTS emotion public.emotion;
UPDATE public.reflections SET emotion = 'joy' WHERE emotion IS NULL; -- Set a default for existing rows
ALTER TABLE public.reflections ALTER COLUMN emotion SET NOT NULL;

-- Step 3.5: Add and populate the `updated_at` column.
ALTER TABLE public.reflections ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
UPDATE public.reflections SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.reflections ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.reflections ALTER COLUMN updated_at SET DEFAULT now();

-- Step 3.6: Update the `user_id` column and its foreign key.
-- WARNING: This requires that NO existing reflections have a NULL user_id.
-- If you have orphaned reflections, you must manually delete them or assign a user before running this.
-- Example cleanup: DELETE FROM public.reflections WHERE user_id IS NULL;
ALTER TABLE public.reflections ALTER COLUMN user_id SET NOT NULL;

-- Drop the old FK constraint and add the new one pointing to `auth.users`.
ALTER TABLE public.reflections
DROP CONSTRAINT IF EXISTS reflections_user_id_fkey,
ADD CONSTRAINT reflections_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Step 3.7: Update the default function for the `id` column for consistency.
ALTER TABLE public.reflections
ALTER COLUMN id SET DEFAULT gen_random_uuid();


-- =================================================================
-- 4. CREATE REMAINING DEPENDENT TABLES
-- =================================================================

CREATE TABLE IF NOT EXISTS public.reflection_metrics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  reflection_id uuid NOT NULL,
  satisfaction smallint NOT NULL CHECK (satisfaction >= 1 AND satisfaction <= 10),
  engagement smallint NOT NULL CHECK (engagement >= 1 AND engagement <= 10),
  challenge smallint NOT NULL CHECK (challenge >= 1 AND challenge <= 10),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reflection_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT reflection_metrics_reflection_id_fkey FOREIGN KEY (reflection_id) REFERENCES public.reflections(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.reflection_metrics IS 'Metrics associated with each reflection entry.';

CREATE TABLE IF NOT EXISTS public.reflection_tags (
  reflection_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT reflection_tags_pkey PRIMARY KEY (reflection_id, tag_id),
  CONSTRAINT reflection_tags_reflection_id_fkey FOREIGN KEY (reflection_id) REFERENCES public.reflections(id) ON DELETE CASCADE,
  CONSTRAINT reflection_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.reflection_tags IS 'Join table linking reflections to tags.';

CREATE TABLE IF NOT EXISTS public.monthly_insights (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  year smallint NOT NULL,
  month smallint NOT NULL,
  top_emotion public.emotion,
  top_emotion_count integer DEFAULT 0,
  most_used_tag_id uuid,
  progress_notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT monthly_insights_pkey PRIMARY KEY (id),
  CONSTRAINT monthly_insights_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT monthly_insights_most_used_tag_id_fkey FOREIGN KEY (most_used_tag_id) REFERENCES public.tags(id),
  CONSTRAINT monthly_insights_user_year_month_uniq UNIQUE (user_id, year, month)
);
COMMENT ON TABLE public.monthly_insights IS 'Stores aggregated monthly insights for each user.';


COMMIT;