-- Migration: Create saved_programs table for TCAS program bookmarks

CREATE TABLE IF NOT EXISTS saved_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id TEXT REFERENCES tcas_programs(program_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, program_id)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_saved_programs_user ON saved_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_programs_program ON saved_programs(program_id);

-- RLS policies
ALTER TABLE saved_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved programs" ON saved_programs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved programs" ON saved_programs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved programs" ON saved_programs
  FOR DELETE USING (auth.uid() = user_id);