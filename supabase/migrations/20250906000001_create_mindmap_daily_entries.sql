-- Create mindmap_daily_entries table for storing daily updates on mindmap topics
CREATE TABLE public.mindmap_daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mindmap_node_id UUID NOT NULL REFERENCES public.mindmap_nodes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, mindmap_node_id, date)
);

-- Enable RLS
ALTER TABLE public.mindmap_daily_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own daily entries"
  ON public.mindmap_daily_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily entries"
  ON public.mindmap_daily_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily entries"
  ON public.mindmap_daily_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily entries"
  ON public.mindmap_daily_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX mindmap_daily_entries_user_id_idx ON public.mindmap_daily_entries(user_id);
CREATE INDEX mindmap_daily_entries_node_date_idx ON public.mindmap_daily_entries(mindmap_node_id, date);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_mindmap_daily_entries_updated_at
  BEFORE UPDATE ON public.mindmap_daily_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();