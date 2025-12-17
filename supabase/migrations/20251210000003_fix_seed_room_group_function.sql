-- Fix the get_or_create_seed_room_assessment_group function to bypass RLS
-- The function needs to check for existing groups without being blocked by RLS policies

BEGIN;

-- Drop and recreate the function with proper RLS bypass
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
    -- Use SECURITY DEFINER context to bypass RLS
    SELECT id INTO v_group_id
    FROM public.assessment_groups
    WHERE assessment_id = p_assessment_id
    AND seed_room_id = p_seed_room_id
    LIMIT 1; -- Add LIMIT to ensure single row
    
    IF v_group_id IS NOT NULL THEN
        RAISE NOTICE 'Found existing group: %', v_group_id;
        RETURN v_group_id;
    END IF;
    
    RAISE NOTICE 'Creating new group for assessment % and room %', p_assessment_id, p_seed_room_id;
    
    -- Get room join code for naming
    SELECT 'Room ' || join_code INTO v_room_name
    FROM public.seed_rooms
    WHERE id = p_seed_room_id;
    
    IF v_room_name IS NULL THEN
        RAISE EXCEPTION 'Seed room not found: %', p_seed_room_id;
    END IF;
    
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
    
    RAISE NOTICE 'Created group: %', v_group_id;
    
    -- Add all room members to the group
    INSERT INTO public.assessment_group_members (group_id, user_id, assigned_by)
    SELECT v_group_id, user_id, auth.uid()
    FROM public.seed_room_members
    WHERE room_id = p_seed_room_id
    ON CONFLICT (group_id, user_id) DO NOTHING; -- Avoid duplicates
    
    RAISE NOTICE 'Added members to group %', v_group_id;
    
    RETURN v_group_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in get_or_create_seed_room_assessment_group: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION public.get_or_create_seed_room_assessment_group(UUID, UUID) IS 
'Auto-creates an assessment group for a seed room. All members of the seed room are added to the group. Returns the group ID. Uses SECURITY DEFINER to bypass RLS.';

COMMIT;
