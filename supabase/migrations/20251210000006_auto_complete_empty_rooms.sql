-- Auto-complete seed rooms when all members leave
-- This ensures empty rooms are marked as completed and don't show as "active"

-- Function to check and update room status when members leave
CREATE OR REPLACE FUNCTION auto_complete_empty_seed_room()
RETURNS TRIGGER AS $$
DECLARE
    remaining_members INTEGER;
    room_record RECORD;
BEGIN
    -- Get room details
    SELECT * INTO room_record
    FROM public.seed_rooms
    WHERE id = OLD.room_id;

    -- Skip if room doesn't exist or is already completed
    IF room_record IS NULL OR room_record.status = 'completed' THEN
        RETURN OLD;
    END IF;

    -- Count remaining members after this deletion
    SELECT COUNT(*) INTO remaining_members
    FROM public.seed_room_members
    WHERE room_id = OLD.room_id;

    -- If no members left and room is not waiting/active, mark as completed
    IF remaining_members = 0 AND (room_record.status = 'waiting' OR room_record.status = 'active') THEN
        UPDATE public.seed_rooms
        SET status = 'completed'
        WHERE id = OLD.room_id;

        RAISE NOTICE 'Auto-completed seed room % (all members left)', OLD.room_id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_complete_empty_room_trigger ON public.seed_room_members;

-- Create trigger that fires after a member is deleted
CREATE TRIGGER auto_complete_empty_room_trigger
    AFTER DELETE ON public.seed_room_members
    FOR EACH ROW
    EXECUTE FUNCTION auto_complete_empty_seed_room();

COMMENT ON FUNCTION auto_complete_empty_seed_room() IS
'Automatically marks a seed room as completed when the last member leaves';

COMMENT ON TRIGGER auto_complete_empty_room_trigger ON public.seed_room_members IS
'Triggers auto-completion of seed rooms when members leave';
