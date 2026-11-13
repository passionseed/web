# SHIFT Island: campfire rounds and roots

Status: approved in conversation 2026-11-13 (approach A for roots; build order below).

## Why

The founder wants students to come back daily and work together, with
reflection and getting unstuck counting as growth, and a focus/rest rhythm
(pomodoro: focus mode, then diffuse mode). Today the pieces exist but are
disconnected and unrewarded: `/work start` (intention), `/work end`
(reflection), 🧱 (stuck form), ✍️ (check-in), the progress journal, and the
campfire (live presence in the coworking voice channel).

## Goals

1. **Campfire rounds** in the coworking voice channel's text chat: a shared,
   clock-aligned rhythm of 🔥 focus 25 minutes, then 🌊 rest 5 minutes
   (diffuse mode), twice an hour on the Bangkok clock (:00 to :25 focus,
   :25 to :30 rest, :30 to :55 focus, :55 to :00 rest). Runs only while at
   least one person sits at the campfire. One bot message per round, edited
   from focus to rest, the previous round's message deleted (no clutter, no
   pings).
   - Focus message button **🎯 ตั้งใจ** opens a one-field form (intention),
     saved with `shift_quest_work_start`.
   - Rest message button **✍️ ปิดรอบ** opens a form: ได้อะไรจากรอบนี้
     (required) and ติดตรงไหน (optional). Saved as a journal entry
     (`shift_quest_progress_add`, private), ending any open work session.
     When there is a stuck note, the answer offers the existing "send to
     mentors" button.
   - Rest message carries one rotating diffuse-mode prompt (stand up, water,
     look far away, walk) as fine print.
   - Every answer is private (ephemeral); the round message is the only
     public thing and names no one.
2. **Roots (approach A)**: reflections grow a tree's roots, a second visible
   layer; the 7 stages still come only from mentor-confirmed milestones, and
   shop gates stay on stage.
   - A reflection counts when it is a journal note (kind `note`) whose
     `learned` has at least 10 characters. At most 3 count per member per
     Bangkok day.
   - Roots per project tree: the sum of counted reflections of its members.
     Level 0 (none), 1 (1 to 4), 2 (5 to 14), 3 (15 or more).
   - Drawn on the web island and in the bot's pictures (live post, /island),
     zero for plain (not consented) plots, like stage.

## Non-goals (later phases, in this order)

3. Fire pit in the Discord picture; confirm the coworking channel is the
   voice channel so the web fire shows.
4. Encounters during 🌊 rests. Built: see "Quest card and campfire
   encounters" in `docs/features/shift-high-quests.md`.
5. A quest card in Discord with a 🌐 link. Built (same section).

## Anti-goals

- No minutes stored or shown per person; no coins for time; no leaderboard.
- No DMs. Group space only (AGENTS.md safeguarding).
- No ping or mention in round messages.

## Constraints

- Migrations apply straight to production: additive and idempotent, timestamp
  after main's newest. Schema version 10; the bot treats rounds and roots as
  optional below 10.
- Thai copy is DRAFT until the multi-model review; no em dashes, no น้องๆ,
  no ปลูก, no streak wording.

## Approaches considered for "reflections grow the tree"

- **A, roots and leaves (picked)**: a separate visible layer; stages and prize
  gates untouched; easy to cap.
- B, reflections count toward stages: faster growth, but gameable and it
  would unlock real-money items through writing.
- C, mentors turn reflections into growth: quality built in, more mentor load,
  slower.

## Calls made by the builder

- Clock-aligned rounds (no per-person timer state, every sitter shares one
  rhythm).
- Reflections reuse the progress journal (data export, erasure and the
  journal view already cover it) instead of a new table.
- Roots come from a new read `shift_quest_island_roots()` (slot and level),
  merged by slot, so the large map functions stay untouched.
- A web guide page explains the island, stages, roots, campfire rounds and
  coins.
