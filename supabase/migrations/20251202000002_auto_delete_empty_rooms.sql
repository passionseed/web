-- Create a function to delete empty rooms
CREATE OR REPLACE FUNCTION delete_empty_seed_rooms()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the room has no members left
    IF NOT EXISTS (
        SELECT 1 FROM seed_room_members 
        WHERE room_id = OLD.room_id
    ) THEN
        -- Delete the room if it's empty
        DELETE FROM seed_rooms WHERE id = OLD.room_id;
        RAISE NOTICE 'Deleted empty room: %', OLD.room_id;
    END IF;;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that fires after a member is deleted
DROP TRIGGER IF EXISTS trigger_delete_empty_rooms ON seed_room_members;
CREATE TRIGGER trigger_delete_empty_rooms
    AFTER DELETE ON seed_room_members
    FOR EACH ROW
    EXECUTE FUNCTION delete_empty_seed_rooms();
