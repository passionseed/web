-- Clean up existing empty seed rooms
-- This migration marks all currently empty waiting/active rooms as completed

-- First, mark all empty rooms as completed
UPDATE public.seed_rooms
SET status = 'completed'
WHERE id IN (
    -- Find rooms with no members (excluding mentor)
    SELECT sr.id
    FROM public.seed_rooms sr
    LEFT JOIN public.seed_room_members srm ON sr.id = srm.room_id
    WHERE sr.status IN ('waiting', 'active')
    GROUP BY sr.id
    HAVING COUNT(srm.user_id) = 0
);

-- Also check for rooms where only mentor exists (mentor might have left)
UPDATE public.seed_rooms
SET status = 'completed'
WHERE status IN ('waiting', 'active')
AND id NOT IN (
    SELECT DISTINCT room_id
    FROM public.seed_room_members
);

-- Log the cleanup
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RAISE NOTICE 'Cleaned up % empty seed rooms', affected_count;
END $$;

COMMENT ON COLUMN public.seed_rooms.status IS
'Room status: waiting (lobby), active (session started), completed (session ended or all members left)';
