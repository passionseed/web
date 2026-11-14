# SHIFT Island: tree close-up and tree style

Status: approved in conversation 2026-11-14 (gifts from campfire rounds only; seed approach A). Founder picked the cutaway close-up (mockup C) and
"whoever finishes a round picks 1 of 3". Mockup:
`scratchpad/tree-zoom/mockup.html` (not committed; the drawing code moves into
`lib/shift-island/tree-closeup.ts`).

## Why

The founder wants the island to feel like a game: in Homescapes, finishing
levels earns you a choice of how a piece of your home looks. Here, finishing
a campfire work round earns the team a choice of how its tree looks: leaf
shape, leaf colour, bark, blossom. The team sees its tree up close, growing
from seed to blossom, with its reflections as roots underground. Nobody has
onboarded yet, so this is also the launch hook: a short promo animation that
shows the tree growing and being customised.

## Goals

1. **Close-up view (cutaway)**: the team's tree large, sky above, the ground
   cut open below. Same pixel style as the island.
   - Grows with the tree's stage, 0 to 7 (ที่ดินว่าง → ผลิดอก). The camera
     zooms in more at small stages so a seed or sprout fills the frame.
     Stage 0 shows the empty plot with a marker; 1 a seed underground;
     2 a sprout; 3 to 5 a growing tree; 6 fruit; 7 blossom.
   - Roots underground = the team's root reflections, not the stage.
     Builder's call: the own-team close-up draws one root per qualifying
     reflection (capped at 15, the top roots level), and tips glow for the
     last 7 days. That needs a count and a recent count from the own-roots
     read (own team only). Other teams' close-ups draw only the 0 to 3
     roots level they can already see, with no glow, so nothing new about
     when they were active leaks.
2. **Tree style**: four slots, each with a few items.
   - Leaf shape: กลม (default), เมเปิล, หัวใจ, สน. Close-up only.
   - Leaf colour: ป่าเขียว (default), ใบไม้แดง, มิ้นต์, ทอง, ม่วงค่ำ.
   - Bark: โอ๊ก (default), เบิร์ช, ไม้ดำ, ซีดาร์แดง.
   - Blossom: ครีม (default), ซากุระ, โคมไฟ, น้ำแข็ง. Colours the fruit at
     stage 6 and the flowers at stage 7.
   - The island map tree (32×40 sprite, web and Discord picture) picks up
     the leaf, bark and blossom colours. Shape shows only in the close-up.
3. **Gift after a round** (the Homescapes moment): closing a campfire round
   with a reflection (`shift_quest_round_close`) gives the student who
   closed it one gift for the team: pick 1 of 3 items the team does not own
   yet, all from one slot. The pick is owned by the team and put on the
   tree at once. A gift can be left for later; it waits in the close-up,
   where any teammate can open it (the closer gets first pick in Discord;
   a gift belongs to the team, so a closer leaving changes nothing).
   - Builder's call: once the chosen slot has fewer than 3 unowned items,
     the remaining options come from other slots, so it stays "1 of 3"
     until the team owns all but 2 items; then 2, then 1, then no more
     gifts. The catalog grows to about 6 items per slot (cheap: code-drawn)
     so a team gets roughly 20 gifts before running out.
4. **Wardrobe**: in the close-up, any team member can switch the tree to
   any item the team owns. Defaults are always owned.
5. **Where it shows**
   - Web island: tapping your own plot, or the tree in your HUD, opens the
     close-up full screen with the wardrobe and any waiting gift.
   - Discord: after ✍️ ปิดรอบ saves, the reply shows the gift as one image
     of the 3 options and 3 buttons. `/island` gets a 🔍 button that replies
     (ephemeral) with the close-up image. The `/island` picture recolours
     the team's tree.
   - Other teams' plots on the web: the close-up shows their tree and style
     only when the plot is not plain (existing visibility rule), and roots
     only where the roots rules already allow them.
6. **Promo animation**: about 15 s, 1080×1920 MP4 plus a 1080×1080 loop for
   Discord. Seed → tree with roots spreading → "round done" gift card →
   pick → the tree changes → quick wardrobe cycle → end card with `/start`.
   Rendered from the same drawing code (frames in Node, encoded with
   ffmpeg), so it matches the app exactly. Thai copy through the
   three-model review. Not posted; the founder posts it.
   - Builder's call: the render script is committed under `scripts/`; the
     MP4 and loop are not (public repo, large binaries) and go to the
     founder directly. ffmpeg stays a local tool.

7. **Choose your seed (the easy first step)**. Today the first progress
   waits for a mentor to approve the first main quest, so a new team can
   sit on an empty plot for days. New first step, **เลือกเมล็ด**, offered as
   soon as the team has a plot (top of the quest board, Discord and web,
   and in the close-up of an empty plot):
   - Write one line about what the team wants to build (rough is fine; it
     fills the project's `ambition` when empty, prefilled when not), then
     pick 1 of 4 seeds. No mentor review: the seed is in the ground at once.
   - Any team member can do it, once per project. Teams that already have
     progress but no seed get the same card; until then they draw as โอ๊ก.
   - Seeds set the starting look and those items become owned:
     - ต้นโอ๊ก: กลม, ป่าเขียว, โอ๊ก, ครีม (today's look)
     - ซากุระ: หัวใจ, ป่าเขียว, ซีดาร์แดง, ซากุระ
     - สน: สน, มิ้นต์, ไม้ดำ, น้ำแข็ง
     - เมเปิล: เมเปิล, ใบไม้แดง, เบิร์ช, โคมไฟ
   - **The seed sits before stage 1 (approach A)**: stage numbers and every
     rule built on them stay as they are. Stage 0 with a seed draws a seed
     in the ground (map: the stage-1 mound without its green pixel;
     close-up: the seed underground). The first approved main quest makes
     it sprout. Stage 1 is renamed from เมล็ด to a sprouting name (working
     copy: เมล็ดงอก), and the pre-stage is called เมล็ด.
8. **Guide**: when the feature ships, the island guide
   (`lib/content/shift-island-guide.ts`, `/shift/island/guide`) explains
   the seed, the close-up, gifts after rounds and the wardrobe, and the
   stage names match. Same Thai review.

## Non-goals

- Buying looks with coins. Coins stay for real-world prizes.
- Trading, gifting between teams, rarity tiers, random loot boxes with
  duplicates.
- Per-student trees or decorations.
- New hand-drawn sprites: every look is drawn by code from the palette and
  small leaf stamps.

## Anti-goals (a failure even if it works)

- Anything that punishes missing a day: no wilting, no losing items, no
  streak wording.
- A pick that slows saving the reflection: the reflection saves first, the
  gift follows.
- Ranking or comparing teams by their tree style.
- Showing a student's name to another team through the tree.

## Constraints

- Migrations go straight to production: additive, idempotent, RLS on every
  new table, access only through SECURITY DEFINER functions granted to the
  bot role and `shift_quest_web` (same pattern as roots). Bot gates new
  calls on `schemaOf(api) >= 13`.
- One drawing module (`lib/shift-island/tree-closeup.ts` plus the item
  catalog `lib/shift-island/tree-style.ts`) used by the web, the bot image
  and the promo renderer. Item ids are stable strings (`leaf:autumn`); the
  database stores ids, the code owns colours. An unknown id draws as the
  default.
- Bot deploy: new lib files go in `bot/deploy.sh` FILES.
- Copy rules: no em dashes, no น้องๆ, no ปลูก, no streak wording. Thai copy
  gets the three-model review.

## Approaches considered

- **Close-up look**: A (scale the sprite up: cheap, blocky, colours only),
  B (detailed close-up drawn by code), C (B plus the cutaway with roots).
  **Picked C**: it shows both rewards, the chosen look and the roots.
- **Seed**: A (seed before stage 1, rename stage 1), B (seed is stage 1,
  8 stages, every stage rule moves), C (lighter first quest, seed as its
  reward, still waits on review). **Picked A**: instant and leaves the live
  stage maths alone.
- **Who picks**: A (whoever closed the round picks 1 of 3 for the team),
  B (rounds unlock items, anyone equips from a wardrobe), C (per-student
  decorations). **Picked A**, plus B's wardrobe so a teammate can switch
  back to anything already owned.

## Data (builder's detail)

- `shift_quest_tree_items(id text pk, slot text, sort int)`: the catalog
  ids, seeded idempotently, so SQL can choose options. Colours stay in code.
- `shift_quest_tree_style(project_id pk, equipped jsonb, owned text[],
  updated_at)`.
- `shift_quest_tree_gifts(id, project_id, member_id, session_id unique,
  slot, options text[3], picked text null, created_at, picked_at)`.
- `shift_quest_round_close` (replaced) also creates the gift when the
  student's team has unowned items left and returns `gift: {id, options}`.
- New functions: `shift_quest_tree_get(actor)`,
  `shift_quest_tree_pick(actor, gift_id, item)`,
  `shift_quest_tree_equip(actor, item)`; web twins through
  `shift_quest_web`. Island map data gains each visible plot's `style`.
- `shift_quest_tree_style` also holds `seed text null`; new function
  `shift_quest_seed_plant(actor, seed, idea)` (and the web twin).
- Schema version 13.

## Left to the builder

Exact gift cap, slot rotation order, the close-up's layout on phone
widths, button copy, and the animation's storyboard timing.
