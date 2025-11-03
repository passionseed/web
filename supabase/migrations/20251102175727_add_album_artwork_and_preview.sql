-- Add album artwork and preview URL fields to song_of_the_day table
ALTER TABLE public.song_of_the_day 
ADD COLUMN album_cover_url text,
ADD COLUMN preview_url text,
ADD COLUMN spotify_id text,
ADD COLUMN duration_ms integer,
ADD COLUMN popularity integer;