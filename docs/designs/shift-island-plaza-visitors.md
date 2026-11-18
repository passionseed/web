# SHIFT High Island: who stopped by today

Status: built on `feat/shift-island-plaza-visitors`, 2026-11-18, stacked on
[shift-island-one-next-step.md](shift-island-one-next-step.md). The migration
(`20261118110000_shift_quest_island_visitors.sql`, schema 18) is **not
applied**: it waits for the founder's go, after #324's schema 16 (applied) and #321's 17. Until it is
applied the island draws no figures and works as before. Thai copy is DRAFT
and needs the three-model review in the root `AGENTS.md`.

## The moment

**Who:** any student opening `/shift/island`. **When:** every visit. **What
they see:** the island is alive. One small figure in the plaza for each person
who checked in today (the Bangkok day). Strangers stroll, stop, wave or look at
a phone and walk back; when the plaza is busy a couple sit by the campfire. If
the student checked in today, one of the figures is them, with their own
picture and คุณ over its head. When today's check-in lands (the dust puff after
the card's tap), their figure walks up the path into the plaza. Their
teammates who came today stand beside them in the team's colour, and the label
under the crowd says so:

> วันนี้มีคนแวะเกาะ 7 คน
> เพื่อนร่วมทีมแวะมาแล้ว 2 คน

Nobody checked in today: nothing is drawn. More people than eight figures:
the line's count already says how many (the "+N" label was dropped on
2026-11-18 with the plaza's new layout).

## Decisions (founder, 2026-11-18)

| # | Question | Answer |
|---|---|---|
| 1 | What a figure is | One per check-in today, drawn in the plaza only. No figures on plots, no real avatars for anyone but the viewer themself, nothing that lets anyone compare teams. |
| 2 | The legal and consent line | "Be creative on following the legal/consent thing. It's good to have, but don't restrict all the idea so it's a shit app." Hard lines kept: no student's name or face shown to other teams, no student data in the repo, only people inside the SHIFT island see anything. |
| 3 | You arrive | The viewer's own figure carries their own avatar (or initial) and a คุณ tag, on their own screen only. It walks in when the day's check-in lands. |
| 4 | Your team | The database also tells the caller how many of their own team checked in today. Those figures wear the team's colour and gather with the viewer; the label adds the team's line. Only that team sees it: teammates already know each other. |
| 5 | A crowd, not clones | Each figure gets its own hair and shirt colours and some idle life: walk, pause, wave, a look at the phone, a few sit by the fire when there are many. |
| 6 | Next step, not built | An opt-in โชว์ตัวฉันบนเกาะ (below). |

## Why it is shaped like this

- **No names, no comparison.** The count is one number for the whole island.
  Strangers' outfits, routes and poses go by figure order, never by person,
  so the same counts always draw the same picture and nothing in it can be
  traced to anyone. Teams are never placed, counted or coloured for anyone
  but themselves, so no team can see another's turnout. This keeps the
  island's "no pressure mechanics" rule (`components/shift/island/AGENTS.md`):
  no leaderboard, no streak, no "you missed".
- **Your own data, on your own screen.** The viewer's figure comes from their
  own check-in (`taps_today`) and their own picture (`me.avatarUrl`), which
  the page already has. The plot pin does the same (`PlotMarker`).
- **The team's line is for the team.** `shift_quest_island_visitors(actor)`
  counts only the caller's active teammates on their current project, the
  caller left out. Someone only invited, or who left, is not told.
- **The database holds the rule.** Two integers come back, never an id, a
  name, a project or a time. Same gate as the campfire read; the website's
  login only. Erased members are never counted.
- **The campfire stays honest.** Visitors sit only in seats the coworking
  room leaves empty, and the campfire's own count stays the room's.
- **It never breaks the island.** Before schema 18 the website never calls the
  function; any failure is no figures. Nothing in the bot's picture changes.

## What was rejected

- **Figures on each team's plot** (who came, by team): it compares teams.
- **Everyone's real avatar or Discord name in the plaza**: other teams would
  see faces and names without an opt-in (see the next step).
- **The plot `visitor` flag** for this: it means milestone 3 on the map, not
  a check-in, and is left alone.
- **A grey number only**: the founder wants the island to feel alive, so the
  number became people with a little life.

## How it works

- **Database** (`supabase/migrations/20261118110000_shift_quest_island_visitors.sql`):
  `shift_quest_island_visitors(p_actor) → {count, team}`, STABLE, SECURITY
  DEFINER, `search_path` pinned, revoked from PUBLIC, anon, authenticated and
  the bot, granted to `shift_quest_web` and `service_role`. A partial index on
  the Bangkok date of taps keeps the count to one day's rows. Schema 18.
  Tested in `supabase/tests/shift_quests/visitors.ts` (the Bangkok day's edges,
  repeat taps, notes, invited and departed teammates, erased members, grants).
- **Page data**: `lib/supabase/shift-quests/visitors.ts` reads it from schema
  18 (`VISITORS_SCHEMA`), soft both ways, into `IslandPageData.visitors`.
  `visitorsNow` (`lib/shift-island/visitors.ts`) adds the viewer once when
  their check-in landed after the page loaded.
- **The crowd** (`lib/shift-island/live/crowd.ts`): `crowdPlan` (the viewer,
  up to 3 teammates, up to 5 strollers and 2 guests at the fire, 8 at most;
  the line's count covers the rest) and the actors. Positions are fixed offsets from the plaza
  centre; the tests walk every frame of every figure past every tree, tag,
  pin, lamp and plaza piece, on land, for islands of 1 to 150 plots.
- **The sprites** (`crowdSprites.ts`): the plot visitor (standing, a stride
  frame, two wave frames) and the story's tester (on the phone), each
  recoloured by swapping two palette keys. They live only in the web's atlas;
  the bot's sprites and picture are unchanged, so no bot deploy.
- **The engine**: an actor may now carry one step per frame (`steps`: where it
  stands and which way it faces), so figures walk, and `once` actors (the
  arrival) play from when they appear and then hold their last frame. Under
  reduced motion every figure stands still and the viewer is already home.
- **The labels** (`PlazaLayer`): the day's count (and the team's line) under
  the crowd and the viewer's picture with คุณ over their
  head, held back until their arrival walk ends. The count is read out once
  for screen readers.

## Next step, not built: โชว์ตัวฉันบนเกาะ

An opt-in for a student to let their own figure carry their Discord name or
avatar for everyone on the island: the same people who already see them in
the SHIFT Discord. It needs, and is waiting on the founder to approve:

- A per-member opt-in flag (default off), set only by the student, with a
  parent's consent where `consent_required` asks for it, and withdrawn as
  easily as it was given.
- A read that returns, for opted-in members who checked in today, a display
  name and an avatar URL only (never a team, plot or time), behind the same
  gate as this one, so the plaza can draw those figures with a name tag.
- The same rules as the team's name on the map (`components/shift/island/AGENTS.md`):
  nothing shows without the person's own yes, and no team is ever ranked.
