-- Add Spotify and theme columns to ps_projects
ALTER TABLE public.ps_projects 
ADD COLUMN IF NOT EXISTS spotify_track_id text,
ADD COLUMN IF NOT EXISTS spotify_track_name text,
ADD COLUMN IF NOT EXISTS spotify_artist_name text,
ADD COLUMN IF NOT EXISTS spotify_album_cover_url text,
ADD COLUMN IF NOT EXISTS theme_color jsonb,
ADD COLUMN IF NOT EXISTS preview_url text;
