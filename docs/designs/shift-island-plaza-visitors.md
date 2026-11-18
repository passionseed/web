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
the student checked in today, one of the figures is them, with a small คุณ
over its head. When today's check-in lands (the dust puff after the card's
tap), their figure walks up the path into the plaza. Their teammates who came
today stand beside them in the team's colour. No count is printed on the
island: tap anyone and they say it under their line (a teammate says the
team's):

> สวัสดี วันนี้แวะมาที่เกาะแล้ว
> วันนี้มีคนเช็กอินบนเกาะแล้ว 7 คน

Nobody checked in today: nothing is drawn. More people than eight figures:
eight are drawn, and the count they say is the whole day's (no "+N").

## Decisions (founder, 2026-11-18)

| # | Question | Answer |
|---|---|---|
| 1 | What a figure is | One per check-in today, drawn in the plaza only. No figures on plots, no real avatars for anyone but the viewer themself, nothing that lets anyone compare teams. |
| 2 | The legal and consent line | "Be creative on following the legal/consent thing. It's good to have, but don't restrict all the idea so it's a shit app." Hard lines kept: no student's name or face shown to other teams, no student data in the repo, only people inside the SHIFT island see anything. |
| 3 | You arrive | The viewer's own figure carries their own avatar (or initial) and a คุณ tag, on their own screen only. It walks in when the day's check-in lands. **Narrowed later on 2026-11-18 ("dont clutter"):** the tag is the word คุณ alone, small; the viewer's picture stays on their own plot's pin (`PlotMarker`). |
| 4 | Your team | The database also tells the caller how many of their own team checked in today. Those figures wear the team's colour and gather with the viewer; a tapped teammate says the team's count. Only that team sees it: teammates already know each other. |
| 5 | A crowd, not clones | Each figure gets its own hair and shirt colours and some idle life: walk, pause, wave, a look at the phone, a few sit by the fire when there are many. |
| 6 | Next step, not built | An opt-in โชว์ตัวฉันบนเกาะ (below). |
| 7 | Words on the island | **2026-11-18, later ("dont clutter"):** no always-on text over the plaza but the small คุณ. No count under the crowd, no "+N", no name over the notice board, no count over the campfire: a tapped person says the day's count, the campfire opens its sheet with the room's count, the notice board opens the board. The Demo Day sign's two-line label went with the rearranged plaza (#336): a pixel countdown board over the stage reads D-10 on its own. The plot signs from #336 (a project's name under its tree, close view only) stay: they belong to the plots, not the plaza. |

## Why it is shaped like this

- **No names, no comparison.** The count is one number for the whole island.
  Strangers' outfits, routes and poses go by figure order, never by person,
  so the same counts always draw the same picture and nothing in it can be
  traced to anyone. Teams are never placed, counted or coloured for anyone
  but themselves, so no team can see another's turnout. This keeps the
  island's "no pressure mechanics" rule (`components/shift/island/AGENTS.md`):
  no leaderboard, no streak, no "you missed".
- **Your own data, on your own screen.** The viewer's figure comes from their
  own check-in (`taps_today`), which the page already has. Their own picture
  (`me.avatarUrl`) shows on their plot's pin (`PlotMarker`), not over the
  figure (decision 7).
- **The team's line is for the team.** `shift_quest_island_visitors(actor)`
  counts only the caller's active teammates on their current project, the
  caller left out. Someone only invited, or who left, is not told.
- **The database holds the rule.** Two integers come back, never an id, a
  name, a project or a time. Same gate as the campfire read; the website's
  login only. Erased members are never counted.
- **The campfire stays honest.** Visitors sit only in seats the coworking
  room leaves empty, and the campfire's own count (its button's name and its
  sheet) stays the room's.
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
  up to 3 teammates, up to 5 strollers and 2 guests at the fire, 8 at most,
  the rest only counted) and the actors. Positions are fixed offsets from the plaza
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
- **Words on the island** (`PlazaLayer`, decision 7): only a small คุณ over
  the viewer's head, held back until their arrival walk ends. The Demo Day
  stage's countdown board is pixel art with the days on its face, and the plot
  signs under named plots belong to the plots (close view only). The day's count (and the team's line) is never drawn: today's
  visitors say it when tapped (`figureLine.ts`), and screen readers get it in
  the people button's name, or read once where nobody can be greeted.

## Tap anyone (founder decision, 2026-11-18)

Every walking or standing person on the web island can be tapped, and says
one short, true line in a small speech bubble over their head (DRAFT copy,
`FIGURES` in `components/shift/island/copy.ts`). Today's visitors add the
day's count on a second line, since the island prints none (decision 7): the
viewer and strangers the island's (`VISITORS.count`), a teammate the team's
(`VISITORS.team`). Never a name, and nothing that points to a student:

| Who | What they stand for | What they say |
|---|---|---|
| The viewer's own figure | They checked in today | นี่คือคุณ ... |
| A teammate (team colour) | A teammate who checked in today | เพื่อนร่วมทีมของคุณ วันนี้เช็กอินแล้ว (3 variants) |
| A stranger | Someone who checked in today | A friendly hello that they came (5 variants) |
| The visitor beside a tree | The team passed main quest 3, its first partner (ได้พันธมิตรคนแรก) | ยืนแทนพันธมิตรคนแรกของทีมนี้ ... (ทีมคุณ by the viewer's own tree) |
| The story's builder | The team building real work | คนที่ลงมือสร้างงานจริง ทีละชิ้น |
| The story's tester | Someone outside the team trying the work | คนนอกทีม มาลองงานที่ทำจริง |

- **Same figure, same line.** A figure is a kind and a number only
  (`lib/shift-island/live/figures.ts`: figure order in the crowd, a tree's
  slot), and the line is picked from those.
- **Easy to hit while it walks.** The page asks the living island where each
  actor stands on the frame last painted (`LiveIsland.actorBoxes`) and counts
  a fingertip (44 CSS px) round the figure, plus a pixel for a step taken;
  on the whole island only the figure itself. Over a plot's or the plaza's own
  button only the figure itself counts, so the plot still opens. The bubble
  follows a walker with style writes only on a frame the engine painted (it
  hands back the same boxes until it paints again), slides sideways to stay
  on screen, and hangs under the feet when there is no room over the head (the
  top of a story panel, the top of the screen). It closes after 5 s, on
  Escape, on a tap on the bubble itself (which opens nothing under it), on a
  tap elsewhere and when a sheet opens. A tapped story figure holds its panel
  while it talks; a figure a narrow screen's crop cuts off is not tapped or
  described.
- **Keyboard and screen readers.** A people button, out of sight until a
  keyboard focuses it and named with the day's count: each press has the next
  of today's visitors say their line (the viewer, the team, everyone else,
  then round again), and a live region reads it as "คนที่ 2: ...". No total:
  some of the day's count sit at the campfire or are not drawn at all. The
  person who speaks is scrolled into view with their
  bubble, above the next-step card (the HUD measures its bottom bar into the
  world's scroll-padding, which also keeps keyboard-focused plots clear of
  it). A tree's partner is named in its plot's button (มีพันธมิตรคนแรกแล้ว).
  The story's panel describes who is in the picture.
  Reduced motion: nobody walks, so the bubble holds still and does not
  animate in.
- **Adding a figure** (the campfire's evening guest, PR #331): a kind in
  `figures.ts`, its lines in `FIGURES`, and one entry in `plazaWorld` with its
  actor's index. The tap, the bubble and the live region come with it; the
  people button's turn takes it only with a rank in `figureLine.ts`
  `TURN_RANK` (today's visitors), otherwise its words go in the name of the
  button it stands on (the campfire's), as a tree's partner's do. A guest at the campfire wins a tap on itself over the
  campfire's own tap target, as a tree's partner does over its plot.

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
