-- Table to store NPC SVG avatars for seeds
CREATE TABLE IF NOT EXISTS seed_npc_avatars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seed_id UUID NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    svg_data TEXT NOT NULL, -- The actual SVG code
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by seed
CREATE INDEX idx_seed_npc_avatars_seed_id ON seed_npc_avatars(seed_id);

-- RLS Policies
ALTER TABLE seed_npc_avatars ENABLE ROW LEVEL SECURITY;

-- Anyone can read NPC avatars
CREATE POLICY "NPC avatars are viewable by everyone"
    ON seed_npc_avatars FOR SELECT
    USING (true);

-- Only admins and seed creators can insert NPC avatars
CREATE POLICY "Admins can insert NPC avatars"
    ON seed_npc_avatars FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
        OR
        EXISTS (
            SELECT 1 FROM seeds
            WHERE seeds.id = seed_id
            AND seeds.created_by = auth.uid()
        )
    );

-- Only admins and seed creators can update NPC avatars
CREATE POLICY "Admins can update NPC avatars"
    ON seed_npc_avatars FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
        OR
        EXISTS (
            SELECT 1 FROM seeds
            WHERE seeds.id = seed_id
            AND seeds.created_by = auth.uid()
        )
    );

-- Only admins and seed creators can delete NPC avatars
CREATE POLICY "Admins can delete NPC avatars"
    ON seed_npc_avatars FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
        OR
        EXISTS (
            SELECT 1 FROM seeds
            WHERE seeds.id = seed_id
            AND seeds.created_by = auth.uid()
        )
    );
