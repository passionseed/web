-- Add team assignment columns to map_nodes
ALTER TABLE map_nodes
ADD COLUMN IF NOT EXISTS team_group_id UUID,
ADD COLUMN IF NOT EXISTS team_role_name TEXT;

-- Create team_node_claims table
CREATE TABLE IF NOT EXISTS team_node_claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES seed_rooms(id) ON DELETE CASCADE,
    node_id UUID REFERENCES map_nodes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(room_id, node_id) -- Only one claim per node per room
);

-- Enable RLS
ALTER TABLE team_node_claims ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. View claims: Members of the room can see claims
CREATE POLICY "View claims" ON team_node_claims
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM seed_room_members
            WHERE room_id = team_node_claims.room_id
            AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM seed_rooms
            WHERE id = team_node_claims.room_id
            AND (host_id = auth.uid() OR mentor_id = auth.uid())
        )
    );

-- 2. Claim node: Members can insert claim for themselves (and Hosts if they are also members/testing)
CREATE POLICY "Claim node" ON team_node_claims
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND (
            EXISTS (
                SELECT 1 FROM seed_room_members
                WHERE room_id = team_node_claims.room_id
                AND user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM seed_rooms
                WHERE id = team_node_claims.room_id
                AND host_id = auth.uid()
            )
        )
    );

-- 3. Unclaim: Users can delete their own claim, Mentors/Host can delete any
CREATE POLICY "Release claim" ON team_node_claims
    FOR DELETE
    USING (
        auth.uid() = user_id -- Self unclaim
        OR EXISTS (
            SELECT 1 FROM seed_rooms
            WHERE id = team_node_claims.room_id
            AND (host_id = auth.uid() OR mentor_id = auth.uid()) -- Admin unclaim
        )
    );

-- Grant permissions (Adjust as needed for anon/authenticated roles)
GRANT SELECT, INSERT, DELETE ON team_node_claims TO authenticated;
GRANT SELECT ON team_node_claims TO anon;
