-- Individual user enrollments in learning maps
-- This table tracks when a user starts/joins a learning map adventure
CREATE TABLE public.user_map_enrollments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  map_id uuid NOT NULL,
  enrolled_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone, -- When they finish the entire map
  progress_percentage integer DEFAULT 0, -- Overall progress through the map
  PRIMARY KEY (id),
  CONSTRAINT user_map_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_map_enrollments_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id) ON DELETE CASCADE,
  UNIQUE (user_id, map_id) -- Prevent duplicate enrollments
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_map_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS policies to ensure users can only see/modify their own enrollments
CREATE POLICY "Users can view their own map enrollments" ON public.user_map_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own map enrollments" ON public.user_map_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own map enrollments" ON public.user_map_enrollments
  FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON TABLE public.user_map_enrollments TO anon;
GRANT ALL ON TABLE public.user_map_enrollments TO authenticated;
GRANT ALL ON TABLE public.user_map_enrollments TO service_role;
