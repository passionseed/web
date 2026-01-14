-- Create Angpao9393 countdown state table
CREATE TABLE IF NOT EXISTS public.angpao_countdown (
  id INTEGER PRIMARY KEY DEFAULT 1,
  remaining_seconds BIGINT NOT NULL DEFAULT 0,
  is_running BOOLEAN NOT NULL DEFAULT false,
  last_daily_increment_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (id = 1) -- Ensure only one row exists
);

-- Insert initial row
INSERT INTO public.angpao_countdown (id, remaining_seconds, is_running, last_daily_increment_date)
VALUES (1, 0, false, CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.angpao_countdown ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read
CREATE POLICY "Allow public read access" ON public.angpao_countdown
  FOR SELECT USING (true);

-- Allow anyone to update (since no login required)
CREATE POLICY "Allow public update access" ON public.angpao_countdown
  FOR UPDATE USING (true);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_angpao_countdown_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_angpao_countdown_timestamp
  BEFORE UPDATE ON public.angpao_countdown
  FOR EACH ROW
  EXECUTE FUNCTION update_angpao_countdown_updated_at();
