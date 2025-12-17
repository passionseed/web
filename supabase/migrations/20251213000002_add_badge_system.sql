-- Badge System Schema
-- Comprehensive badge achievement and display system

-- ==========================================
-- TABLE: seed_badges (Badge Configuration)
-- ==========================================
CREATE TABLE IF NOT EXISTS seed_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seed_id UUID NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,

    -- Badge visual
    badge_name TEXT NOT NULL,
    badge_description TEXT,
    badge_image_url TEXT,
    badge_image_key TEXT, -- Storage key for management

    -- Badge colors (for default badge rendering)
    primary_color TEXT DEFAULT '#f59e0b', -- yellow-500
    secondary_color TEXT DEFAULT '#f97316', -- orange-500

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(seed_id)
);

-- ==========================================
-- TABLE: user_badges (Earned Badges)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seed_id UUID NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
    seed_badge_id UUID REFERENCES seed_badges(id) ON DELETE SET NULL,

    -- Achievement data snapshot (for historical accuracy)
    badge_data JSONB NOT NULL,

    -- Completion context
    room_id UUID REFERENCES seed_rooms(id) ON DELETE SET NULL,
    completion_id UUID REFERENCES seed_room_completions(id) ON DELETE SET NULL,

    -- Metadata
    earned_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one badge per user per seed
    UNIQUE(user_id, seed_id)
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX idx_seed_badges_seed_id ON seed_badges(seed_id);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_seed_id ON user_badges(seed_id);
CREATE INDEX idx_user_badges_earned_at ON user_badges(earned_at DESC);

-- ==========================================
-- RLS POLICIES: seed_badges
-- ==========================================
ALTER TABLE seed_badges ENABLE ROW LEVEL SECURITY;

-- Anyone can read badge configurations
CREATE POLICY "Anyone can read badge configs"
    ON seed_badges FOR SELECT
    USING (true);

-- Seed creators can manage their badge configurations
CREATE POLICY "Seed creators can manage badge configs"
    ON seed_badges FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM seeds
            WHERE seeds.id = seed_badges.seed_id
            AND seeds.created_by = auth.uid()
        )
    );

-- Admins can manage all badge configurations
CREATE POLICY "Admins can manage all badge configs"
    ON seed_badges FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- ==========================================
-- RLS POLICIES: user_badges
-- ==========================================
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Users can read their own badges
CREATE POLICY "Users can read their own badges"
    ON user_badges FOR SELECT
    USING (user_id = auth.uid());

-- Users can read other users' badges (public display)
CREATE POLICY "Anyone can read user badges for public display"
    ON user_badges FOR SELECT
    USING (true);

-- Only system can insert badges (via function)
CREATE POLICY "System can insert badges"
    ON user_badges FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Seed creators can view badges for their seeds
CREATE POLICY "Seed creators can view badges for their seeds"
    ON user_badges FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM seeds
            WHERE seeds.id = user_badges.seed_id
            AND seeds.created_by = auth.uid()
        )
    );

-- Admins can manage all badges
CREATE POLICY "Admins can manage all badges"
    ON user_badges FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Function to update badge updated_at timestamp
CREATE OR REPLACE FUNCTION update_seed_badge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER seed_badges_updated_at
    BEFORE UPDATE ON seed_badges
    FOR EACH ROW
    EXECUTE FUNCTION update_seed_badge_updated_at();

-- Function to award badge to user
CREATE OR REPLACE FUNCTION award_badge_to_user(
    p_user_id UUID,
    p_seed_id UUID,
    p_room_id UUID,
    p_completion_id UUID,
    p_badge_data JSONB
)
RETURNS UUID AS $$
DECLARE
    v_badge_id UUID;
BEGIN
    -- Insert or get existing badge
    INSERT INTO user_badges (
        user_id,
        seed_id,
        seed_badge_id,
        badge_data,
        room_id,
        completion_id
    )
    VALUES (
        p_user_id,
        p_seed_id,
        (SELECT id FROM seed_badges WHERE seed_id = p_seed_id),
        p_badge_data,
        p_room_id,
        p_completion_id
    )
    ON CONFLICT (user_id, seed_id) DO UPDATE
    SET badge_data = EXCLUDED.badge_data
    RETURNING id INTO v_badge_id;

    RETURN v_badge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has earned a badge
CREATE OR REPLACE FUNCTION has_user_earned_badge(
    p_user_id UUID,
    p_seed_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_badges
        WHERE user_id = p_user_id
        AND seed_id = p_seed_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user badge count
CREATE OR REPLACE FUNCTION get_user_badge_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM user_badges
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get seed badge stats
CREATE OR REPLACE FUNCTION get_seed_badge_stats(p_seed_id UUID)
RETURNS TABLE (
    total_awarded INTEGER,
    awarded_this_month INTEGER,
    awarded_this_week INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_awarded,
        COUNT(*) FILTER (WHERE earned_at >= DATE_TRUNC('month', NOW()))::INTEGER as awarded_this_month,
        COUNT(*) FILTER (WHERE earned_at >= DATE_TRUNC('week', NOW()))::INTEGER as awarded_this_week
    FROM user_badges
    WHERE seed_id = p_seed_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
