-- Migration: Create admission_plans tables for TCAS round planning

-- Main plan table
CREATE TABLE IF NOT EXISTS admission_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Plan',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs per round in each plan
CREATE TABLE IF NOT EXISTS admission_plan_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES admission_plans(id) ON DELETE CASCADE,
  round_number INT NOT NULL CHECK (round_number >= 1 AND round_number <= 5),
  program_id TEXT REFERENCES tcas_programs(program_id) ON DELETE CASCADE,
  priority INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, round_number, program_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admission_plans_user ON admission_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_admission_plan_rounds_plan ON admission_plan_rounds(plan_id);
CREATE INDEX IF NOT EXISTS idx_admission_plan_rounds_round ON admission_plan_rounds(round_number);

-- RLS policies
ALTER TABLE admission_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_plan_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plans" ON admission_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans" ON admission_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans" ON admission_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans" ON admission_plans
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own plan rounds" ON admission_plan_rounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admission_plans
      WHERE admission_plans.id = admission_plan_rounds.plan_id
      AND admission_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own plan rounds" ON admission_plan_rounds
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admission_plans
      WHERE admission_plans.id = admission_plan_rounds.plan_id
      AND admission_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own plan rounds" ON admission_plan_rounds
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM admission_plans
      WHERE admission_plans.id = admission_plan_rounds.plan_id
      AND admission_plans.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admission_plans_updated_at
  BEFORE UPDATE ON admission_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();