-- Certificate System Schema
-- Comprehensive certificate generation and management

-- ==========================================
-- TABLE: seed_certificates (Configuration)
-- ==========================================
CREATE TABLE IF NOT EXISTS seed_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seed_id UUID NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,

    -- Certificate enablement
    enabled BOOLEAN DEFAULT false,

    -- Template configuration
    template_style TEXT DEFAULT 'classic' CHECK (template_style IN ('classic', 'modern', 'minimal', 'elegant', 'bold')),

    -- Content templates with variable support
    -- Variables: {student_name}, {seed_title}, {completion_date}, {instructor_name}
    title_template TEXT DEFAULT 'Certificate of Completion',
    subtitle_template TEXT DEFAULT 'This certifies that {student_name} has successfully completed {seed_title}',
    description_template TEXT DEFAULT 'Awarded on {completion_date} for demonstrating excellence and dedication.',

    -- Signature configuration
    signature_enabled BOOLEAN DEFAULT false,
    signature_name TEXT,
    signature_title TEXT DEFAULT 'Course Instructor',
    signature_image_url TEXT,

    -- Branding
    logo_url TEXT,
    border_color TEXT DEFAULT '#f59e0b', -- yellow-500
    accent_color TEXT DEFAULT '#f97316', -- orange-500

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(seed_id)
);

-- ==========================================
-- TABLE: issued_certificates (Tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS issued_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seed_id UUID NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
    room_id UUID REFERENCES seed_rooms(id) ON DELETE SET NULL,
    completion_id UUID REFERENCES seed_room_completions(id) ON DELETE SET NULL,

    -- Certificate data snapshot (for historical accuracy)
    certificate_data JSONB NOT NULL, -- Stores rendered content at time of issue

    -- Storage
    certificate_url TEXT, -- URL to stored PNG/PDF
    certificate_key TEXT, -- Storage key for management

    -- Metadata
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    downloaded_at TIMESTAMPTZ,
    download_count INTEGER DEFAULT 0,

    -- Unique constraint: one certificate per user per seed completion
    UNIQUE(user_id, seed_id, room_id)
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX idx_seed_certificates_seed_id ON seed_certificates(seed_id);
CREATE INDEX idx_issued_certificates_user_id ON issued_certificates(user_id);
CREATE INDEX idx_issued_certificates_seed_id ON issued_certificates(seed_id);
CREATE INDEX idx_issued_certificates_room_id ON issued_certificates(room_id);

-- ==========================================
-- RLS POLICIES: seed_certificates
-- ==========================================
ALTER TABLE seed_certificates ENABLE ROW LEVEL SECURITY;

-- Anyone can read certificate configurations for enabled certificates
CREATE POLICY "Anyone can read enabled certificate configs"
    ON seed_certificates FOR SELECT
    USING (enabled = true);

-- Seed creators can manage their certificate configurations
CREATE POLICY "Seed creators can manage certificate configs"
    ON seed_certificates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM seeds
            WHERE seeds.id = seed_certificates.seed_id
            AND seeds.created_by = auth.uid()
        )
    );

-- Admins can manage all certificate configurations
CREATE POLICY "Admins can manage all certificate configs"
    ON seed_certificates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- ==========================================
-- RLS POLICIES: issued_certificates
-- ==========================================
ALTER TABLE issued_certificates ENABLE ROW LEVEL SECURITY;

-- Users can read their own certificates
CREATE POLICY "Users can read their own certificates"
    ON issued_certificates FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own certificates
CREATE POLICY "Users can create their own certificates"
    ON issued_certificates FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own certificate download stats
CREATE POLICY "Users can update their certificate stats"
    ON issued_certificates FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Seed creators can view certificates for their seeds
CREATE POLICY "Seed creators can view certificates for their seeds"
    ON issued_certificates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM seeds
            WHERE seeds.id = issued_certificates.seed_id
            AND seeds.created_by = auth.uid()
        )
    );

-- Mentors can view certificates for rooms they mentor
CREATE POLICY "Mentors can view certificates for their rooms"
    ON issued_certificates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM seed_rooms
            WHERE seed_rooms.id = issued_certificates.room_id
            AND seed_rooms.mentor_id = auth.uid()
        )
    );

-- Admins can manage all certificates
CREATE POLICY "Admins can manage all certificates"
    ON issued_certificates FOR ALL
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

-- Function to update certificate updated_at timestamp
CREATE OR REPLACE FUNCTION update_seed_certificate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER seed_certificates_updated_at
    BEFORE UPDATE ON seed_certificates
    FOR EACH ROW
    EXECUTE FUNCTION update_seed_certificate_updated_at();

-- Function to check if a user is eligible for a certificate
CREATE OR REPLACE FUNCTION is_certificate_eligible(
    p_user_id UUID,
    p_seed_id UUID,
    p_room_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM seed_room_completions
        WHERE user_id = p_user_id
        AND room_id = p_room_id
        AND room_id IN (
            SELECT id FROM seed_rooms WHERE seed_id = p_seed_id
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get certificate configuration with seed info
CREATE OR REPLACE FUNCTION get_certificate_config_with_seed(p_seed_id UUID)
RETURNS TABLE (
    config_id UUID,
    seed_id UUID,
    seed_title TEXT,
    enabled BOOLEAN,
    template_style TEXT,
    title_template TEXT,
    subtitle_template TEXT,
    description_template TEXT,
    signature_enabled BOOLEAN,
    signature_name TEXT,
    signature_title TEXT,
    signature_image_url TEXT,
    logo_url TEXT,
    border_color TEXT,
    accent_color TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.id,
        sc.seed_id,
        s.title,
        sc.enabled,
        sc.template_style,
        sc.title_template,
        sc.subtitle_template,
        sc.description_template,
        sc.signature_enabled,
        sc.signature_name,
        sc.signature_title,
        sc.signature_image_url,
        sc.logo_url,
        sc.border_color,
        sc.accent_color
    FROM seed_certificates sc
    JOIN seeds s ON s.id = sc.seed_id
    WHERE sc.seed_id = p_seed_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
