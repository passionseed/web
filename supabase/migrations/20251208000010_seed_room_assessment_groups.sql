-- Enable group work for seed rooms
-- Links assessment_groups to seed_rooms and auto-creates groups for room members

BEGIN;

-- Add seed_room_id to assessment_groups for tracking
ALTER TABLE public.assessment_groups
ADD COLUMN IF NOT EXISTS seed_room_id UUID REFERENCES public.seed_rooms(id) ON DELETE CASCADE;

-- Add index
CREATE INDEX IF NOT EXISTS assessment_groups_seed_room_idx 
ON public.assessment_groups(seed_room_id) WHERE seed_room_id IS NOT NULL;

-- Function to auto-create assessment group for seed room
CREATE OR REPLACE FUNCTION public.get_or_create_seed_room_assessment_group(
    p_assessment_id UUID,
    p_seed_room_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_group_id UUID;
    v_room_name TEXT;
BEGIN
    -- Check if group already exists for this room + assessment
    SELECT id INTO v_group_id
    FROM public.assessment_groups
    WHERE assessment_id = p_assessment_id
    AND seed_room_id = p_seed_room_id;
    
    IF v_group_id IS NOT NULL THEN
        RETURN v_group_id;
    END IF;
    
    -- Get room join code for naming
    SELECT 'Room ' || join_code INTO v_room_name
    FROM public.seed_rooms
    WHERE id = p_seed_room_id;
    
    -- Create new group
    INSERT INTO public.assessment_groups (
        assessment_id,
        seed_room_id,
        group_name,
        group_number,
        created_by
    ) VALUES (
        p_assessment_id,
        p_seed_room_id,
        v_room_name,
        (SELECT COALESCE(MAX(group_number), 0) + 1 
         FROM public.assessment_groups 
         WHERE assessment_id = p_assessment_id),
        auth.uid()
    )
    RETURNING id INTO v_group_id;
    
    -- Add all room members to the group
    INSERT INTO public.assessment_group_members (group_id, user_id, assigned_by)
    SELECT v_group_id, user_id, auth.uid()
    FROM public.seed_room_members
    WHERE room_id = p_seed_room_id
    ON CONFLICT (group_id, user_id) DO NOTHING; -- Avoid duplicates
    
    RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION public.get_or_create_seed_room_assessment_group(UUID, UUID) IS 
'Auto-creates an assessment group for a seed room. All members of the seed room are added to the group. Returns the group ID.';

COMMIT;
