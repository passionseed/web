-- Elemental sign-up asks "where did you find the post?". Self-reported, so it
-- stays separate from `source` (tracked links). Nullable: sign-ups made before
-- this question, and old cached forms, have no answer.
-- Additive and idempotent: safe to apply straight to production.

alter table public.hackathon_event_registrations
  add column if not exists heard_from text;
