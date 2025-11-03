-- Create song_of_the_day table for daily song selections
CREATE TABLE public.song_of_the_day (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    song_url text NOT NULL,
    song_title text NOT NULL,
    artist text NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure one song per user per day
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Create index for efficient queries
CREATE INDEX idx_song_of_the_day_user_date ON public.song_of_the_day(user_id, date);
CREATE INDEX idx_song_of_the_day_date ON public.song_of_the_day(date);

-- Enable RLS
ALTER TABLE public.song_of_the_day ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own songs" ON public.song_of_the_day
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own songs" ON public.song_of_the_day
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own songs" ON public.song_of_the_day
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own songs" ON public.song_of_the_day
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_song_of_the_day_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER song_of_the_day_updated_at
    BEFORE UPDATE ON public.song_of_the_day
    FOR EACH ROW
    EXECUTE FUNCTION update_song_of_the_day_updated_at();