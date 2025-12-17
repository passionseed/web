-- Update certificate system to support uploaded templates with custom name positioning

-- Add new columns for uploaded template and name positioning
ALTER TABLE seed_certificates
ADD COLUMN IF NOT EXISTS certificate_template_url TEXT,
ADD COLUMN IF NOT EXISTS name_position_x INTEGER DEFAULT 400,
ADD COLUMN IF NOT EXISTS name_position_y INTEGER DEFAULT 300,
ADD COLUMN IF NOT EXISTS name_font_size INTEGER DEFAULT 48,
ADD COLUMN IF NOT EXISTS name_font_family TEXT DEFAULT 'serif',
ADD COLUMN IF NOT EXISTS name_text_color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS name_text_align TEXT DEFAULT 'center';

-- Add comment
COMMENT ON COLUMN seed_certificates.certificate_template_url IS 'URL to the uploaded certificate template image';
COMMENT ON COLUMN seed_certificates.name_position_x IS 'X coordinate for student name placement (pixels from left)';
COMMENT ON COLUMN seed_certificates.name_position_y IS 'Y coordinate for student name placement (pixels from top)';
COMMENT ON COLUMN seed_certificates.name_font_size IS 'Font size for student name in pixels';
COMMENT ON COLUMN seed_certificates.name_font_family IS 'Font family for student name (serif, sans-serif, etc.)';
COMMENT ON COLUMN seed_certificates.name_text_color IS 'Hex color for student name text';
COMMENT ON COLUMN seed_certificates.name_text_align IS 'Text alignment for student name (left, center, right)';
