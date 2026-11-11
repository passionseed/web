-- Quest reviewers: people a board's owner lets see everyone's quest work in the
-- board's Quest dashboard (lib/whiteboard/quests.ts). The work itself is on
-- the board, visible to every member; this only opens the dashboard that
-- lists it per person. The owner and site admins always can.
--
-- Additive and safe to run twice. whiteboard_members already has RLS (admin
-- only); routes check the caller's role and use the service role.

ALTER TABLE public.whiteboard_members
  ADD COLUMN IF NOT EXISTS quest_reviewer BOOLEAN NOT NULL DEFAULT false;
