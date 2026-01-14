-- Ensure Spotify and theme columns exist in ps_projects
-- This is a recovery migration since 20260103140000 seemed to have not applied correctly in the target environment

ALTER TABLE public.ps_projects 
ADD COLUMN IF NOT EXISTS spotify_track_id text,
ADD COLUMN IF NOT EXISTS spotify_track_name text,
ADD COLUMN IF NOT EXISTS spotify_artist_name text,
ADD COLUMN IF NOT EXISTS spotify_album_cover_url text,
ADD COLUMN IF NOT EXISTS theme_color jsonb,
ADD COLUMN IF NOT EXISTS preview_url text;
