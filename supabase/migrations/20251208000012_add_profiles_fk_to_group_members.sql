-- Add direct FK from assessment_group_members.user_id to profiles.id
-- This enables PostgREST embedded joins with profiles table

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'assessment_group_members_user_id_profiles_fkey'
        AND conrelid = 'public.assessment_group_members'::regclass
    ) THEN
        ALTER TABLE public.assessment_group_members
        ADD CONSTRAINT assessment_group_members_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id);
    END IF;
END $$;
