# SHIFT Island tree close-up and tree style: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A team picks a seed on day one, sees its tree up close growing with its reflections as roots, earns a pick-1-of-3 style gift after every campfire round, and the island map, the guide and a promo video all show it.

**Architecture:** One pure drawing module (catalog + close-up grid) in `lib/shift-island/`, used by the web (canvas), the bot (PNG) and the promo renderer (frames → ffmpeg). Ownership and gifts live in schema 13 (SECURITY DEFINER functions, actor-first, `sq:` refusals) that the bot and `shift_quest_web` call; both gate on `schemaOf(api) >= 13`, so a pre-migration deploy behaves exactly as today.

**Tech Stack:** TypeScript, Next.js 16 App Router, discord.js 14 (Components V2), Postgres functions (Supabase), Jest, the pg-based db suites in `supabase/tests/shift_quests/`, ffmpeg (local tool only).

**Spec:** `docs/superpowers/specs/2026-11-14-shift-tree-style-design.md`

## Global Constraints

- Migrations apply straight to production: additive, idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE`, `ON CONFLICT DO NOTHING`), RLS enabled on every new table with no direct policies; access only through functions. Helpers `shift_quest__*` are never granted to roles.
- New public functions: `REVOKE ALL ... FROM PUBLIC, anon, authenticated`; `GRANT EXECUTE ... TO shift_quest_bot, service_role`; and inside the `IF EXISTS (pg_roles 'shift_quest_web')` block to `shift_quest_web`. Add each to the web allowlist in `supabase/tests/shift_quests/run-local.sh`.
- `shift_quest_schema_version()` returns 13. Bot and web gate every new call on `schemaOf(api) >= 13` (`bot/src/quests/schema.ts`).
- The database stores item ids only (`shape:round`, `leaf:forest`, `bark:oak`, `bloom:cream`, seeds `oak|sakura|pine|maple`); colours and Thai names live in `lib/shift-island/tree-style.ts`. An unknown id resolves to that slot's default.
- Gifts come only from a closed campfire round (`rd_close_go`). Web reflections never create gifts.
- Stage numbers and every rule built on `shift_quest__milestones` stay unchanged. The seed is a pre-stage at stage 0.
- Copy: no em dashes, never น้องๆ, no ปลูก, no streak or loss wording, nothing that ranks teams. All new Thai copy goes through the three-model review (agy draft, cursor proofread, codex logic) before merge.
- Students are minors: nothing names a student to another team; the bot never DMs.
- New runtime lib files imported by the bot are added to `FILES` in `bot/deploy.sh`.
- Never push to `main`; PR, CI green, squash-merge. Promo video files are not committed.

## Review Focus

1. **Database older than schema 13** (bot or web deployed before the migration): no seed card, no 🔍, no gift, round close works exactly as at schema 12, and the map draws default trees. Tests in Tasks 4 and 7.
2. **Unknown or malformed style data** (removed item id, `equipped` missing a slot, non-object JSON): that slot draws its default, nothing throws. Tests in Tasks 1 and 4.
3. **Two teammates pick the same gift at once, or one double-clicks**: exactly one pick lands, the other gets `sq:gift_gone`, `owned` has no duplicate. Test in Task 3.
4. **Other teams and plain plots**: style only on name-visible plots; root count and recent glow only on the caller's own tree. Tests in Tasks 3 and 4.
5. **Stale button**: a student who left the team, or has no project, presses an old gift or seed button and gets the refusal text, never a crash or another team's tree. Tests in Tasks 3 and 7.

---

### Task 1: Tree style catalog

**Files:**
- Create: `lib/shift-island/tree-style.ts`
- Test: `lib/shift-island/__tests__/tree-style.test.ts`

**Interfaces:**
- Produces:
  - `type TreeSlot = "shape" | "leaf" | "bark" | "bloom"`
  - `type SeedId = "oak" | "sakura" | "pine" | "maple"`
  - `interface TreeStyle { shape: string; leaf: string; bark: string; bloom: string }` (full item ids)
  - `interface TreeItem { id: string; slot: TreeSlot; name: string; colors?: [string, string, string]; stamp?: string[] }`
  - `const TREE_ITEMS: readonly TreeItem[]`, `const DEFAULT_STYLE: TreeStyle`, `const SEEDS: Record<SeedId, { name: string; style: TreeStyle }>`
  - `function resolveStyle(raw: unknown): TreeStyle` (unknown or missing slot → default)
  - `function treeItem(id: string): TreeItem | null`
  - `function mapTreeColor(style: TreeStyle, ch: string, row: number): string | null`: override hex for a 32×40 tree sprite pixel, or null for "use PALETTE". Leaf keys `l m n` → leaf colors [0,1,2]; blossom `f y p` → bloom colors [0,1,2]; bark `b c e` → bark colors only when `row < 29` (rows 29+ are soil).

Catalog (ids, Thai names, colours dark→light; blossom is [highlight, centre, petal]):

| slot | id | name | colours / stamp |
|---|---|---|---|
| shape | shape:round (default) | กลม | `.##.` `####` `####` `.##.` |
| shape | shape:maple | เมเปิล | `..#..` `#.#.#` `#####` `.###.` `..#..` |
| shape | shape:heart | หัวใจ | `##.##` `#####` `.###.` `..#..` |
| shape | shape:pine | สน | `#...#` `.#.#.` `..#..` (tiered triangle canopy) |
| shape | shape:willow | หลิว | `#` `#` `#` (round canopy, strands hang 4px below its edge) |
| shape | shape:star | ดาว | `.#.` `###` `.#.` |
| leaf | leaf:forest (default) | ป่าเขียว | #39775D #50976B #78B880 |
| leaf | leaf:autumn | ใบไม้แดง | #8E3B2E #C9603A #EFA052 |
| leaf | leaf:mint | มิ้นต์ | #2F6F73 #3F9C96 #86D1C0 |
| leaf | leaf:gold | ทอง | #9C7A22 #C9A23A #F0D36A |
| leaf | leaf:dusk | ม่วงค่ำ | #4A3F73 #6E5FA6 #A596D9 |
| leaf | leaf:sky | ฟ้า | #2F5E8C #4A86C0 #8EC2EA |
| bark | bark:oak (default) | โอ๊ก | #79583F #A97950 #C89561 |
| bark | bark:birch | เบิร์ช | #5E5A52 #CFC8B8 #F2EEE3 |
| bark | bark:ebony | ไม้ดำ | #2B211C #4A3A32 #6E5747 |
| bark | bark:cedar | ซีดาร์แดง | #6A2E22 #9A4A32 #C26A48 |
| bark | bark:ash | เทา | #55595C #80878A #AEB5B7 |
| bloom | bloom:cream (default) | ครีม | #FFF1D6 #F4C56A #ECA6B2 |
| bloom | bloom:sakura | ซากุระ | #FFF0F4 #F7D27A #F48FB1 |
| bloom | bloom:lantern | โคมไฟ | #FFF4C4 #E9782F #F4C56A |
| bloom | bloom:frost | น้ำแข็ง | #FFFFFF #7FB7E8 #CFE8FF |
| bloom | bloom:peach | พีช | #FFE3D0 #F5A35C #F7B98E |

Seeds: oak ต้นโอ๊ก = all defaults; sakura ซากุระ = heart, forest, cedar, sakura; pine สน = pine, mint, ebony, frost; maple เมเปิล = maple, autumn, birch, lantern.

- [ ] **Step 1: Write the failing tests**: `resolveStyle(null)` and `resolveStyle({leaf:"leaf:nope"})` equal `DEFAULT_STYLE` (slot-wise); `resolveStyle({leaf:"leaf:autumn"}).leaf === "leaf:autumn"`; every `SEEDS[*].style` id is in `TREE_ITEMS` with the right slot; ids unique; each slot has exactly one default that matches `DEFAULT_STYLE`; `mapTreeColor(autumnStyle,"m",5) === "#C9603A"`; `mapTreeColor(birchStyle,"c",28) === "#CFC8B8"` and `mapTreeColor(birchStyle,"c",29) === null`; `mapTreeColor(DEFAULT_STYLE,"o",3) === null`; no name contains "—".
- [ ] **Step 2: Run** `pnpm jest lib/shift-island/__tests__/tree-style.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `lib/shift-island/tree-style.ts` with the table above. No Discord, Node or DOM imports (shared by bot and web).
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(shift): tree style catalog and seeds`.

### Task 2: Close-up drawing

**Files:**
- Create: `lib/shift-island/tree-closeup.ts`
- Test: `lib/shift-island/__tests__/tree-closeup.test.ts`
- Reference: the approved mockup's `closeGrid` (`/tmp/claude-1004/-home-bunyasit-passionseed-pseed/668bbc5f-6bfd-40c6-b98a-64f208952156/scratchpad/tree-zoom/mockup.html`), ported and extended.

**Interfaces:**
- Consumes: Task 1 (`TreeStyle`, `treeItem`, `resolveStyle`), `PALETTE` from `bot/assets/island/sprites`.
- Produces:
  - `interface CloseupInput { style: TreeStyle; stage: number; seeded: boolean; roots: { count: number; recent: number } }`
  - `type PixelGrid = (string | null)[][]` (hex or transparent, row-major)
  - `const CLOSEUP_SIZE = { w: 96, h: 150, ground: 96 }`
  - `function closeupGrid(input: CloseupInput): PixelGrid`: always 96×150, sky above `ground`, cut-open soil below, deterministic (seeded RNG, no `Math.random`).
  - `function gridToRgba(grid: PixelGrid, scale: number): { width: number; height: number; data: Uint8Array }`

Behaviour pinned by the spec:
- Stage 0, not seeded: empty plot with a small marker stake (reuse the map's `stage_0` look: a post), no roots. Stage 0 seeded: a seed underground, no sprout. Stage 1: seed with a sprout just breaking the surface. Stage 2: two-leaf sprout. Stages 3–7: tree scaled by `[.34,.56,.78,1,1]`; stage 6 fruit and stage 7 flowers in the bloom colours.
- Camera: stages 0–2 draw at 2× magnification about the plot centre (a seed or sprout fills the frame); 3–7 at 1×.
- Roots: one root per `min(count, 15)`; the last `min(recent, count)` roots get a glowing tip (`PALETTE.y` + `PALETTE.f`); `count = 0` draws none.
- Shape stamps from Task 1; `shape:pine` uses the tiered canopy; `shape:willow` adds hanging strands.

- [ ] **Step 1: Write the failing tests**: grid is 150 rows × 96 cols for every stage 0–7; same input → identical grid (JSON equal); stage 0 unseeded vs seeded differ only below `ground`; stage 7 with `bloom:sakura` contains `#F48FB1` and stage 5 does not; `leaf:autumn` stage 7 contains `#C9603A` and not `#50976B`; roots `{count:0}` vs `{count:5}` differ below ground, `{count:15}` equals `{count:40}`; `{count:5,recent:0}` contains no `#F4C56A` below ground and `{count:5,recent:2}` does; `resolveStyle({shape:"shape:nope"})` draws like `shape:round`; `gridToRgba(grid,2)` gives width 192, height 300, `data.length === 192*300*4`.
- [ ] **Step 2: Run** `pnpm jest lib/shift-island/__tests__/tree-closeup.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `tree-closeup.ts` (pure; no DOM, Node or Discord imports).
- [ ] **Step 4: Run** the same command. Expected: PASS. Also render stages 0–7 for two styles to a PNG with a throwaway script and look at it before committing.
- [ ] **Step 5: Commit** `feat(shift): tree close-up drawing with growth and roots`.

### Task 3: Schema 13 migration and db suite

**Files:**
- Create: `supabase/migrations/20261114120000_shift_quest_tree_style.sql`
- Create: `supabase/tests/shift_quests/tree.ts`
- Modify: `supabase/tests/shift_quests/run-local.sh` (allowlist entries; add `tree` to the `for DB in ...` list and `suite "tree" tree tree.ts`; header comment line)

**Interfaces:**
- Produces (all `SECURITY DEFINER`, `SET search_path = public`, actor = Discord id text, resolved with `shift_quest__student` and `shift_quest__current_project`):
  - Tables: `shift_quest_tree_items(id text pk, slot text check in ('shape','leaf','bark','bloom'), is_default boolean not null default false, sort int)` seeded with Task 1's ids (`ON CONFLICT DO NOTHING`); `shift_quest_tree_style(project_id uuid pk references shift_quest_projects, seed text null, equipped jsonb not null default '{}', owned text[] not null default '{}', updated_at timestamptz)`; `shift_quest_tree_gifts(id uuid pk default gen_random_uuid(), project_id uuid not null, member_id uuid not null, session_id uuid null, options text[] not null, picked text null, created_at timestamptz default now(), picked_at timestamptz null)`. RLS enabled, no policies.
  - `shift_quest_tree_get(p_actor text) RETURNS jsonb`: `{seed, equipped:{shape,leaf,bark,bloom}, owned:[ids], gifts:[{id, options}], roots:{count, recent}, stage}`; `owned` always includes defaults; `gifts` = the project's unpicked gifts, oldest first; `roots.count` = the qualifying-notes count from the same counter as `shift_quest__project_roots` (extract a helper `shift_quest__project_root_notes(uuid, timestamptz)` returning the count since the given instant, null = all time) capped at 15; `recent` = count in the last 7 days.
  - `shift_quest_seed_plant(p_actor text, p_seed text, p_idea text) RETURNS jsonb` (= tree_get): idea trimmed 1..500 via `shift_quest__check_len`; refuses `sq:seed_unknown`, `sq:seed_planted`; sets seed, adds the seed's 4 items to `owned`, equips them; fills `shift_quest_projects.ambition` only when it is null.
  - `shift_quest_round_close_gift(p_actor text, p_session uuid, p_learned text, p_stuck text) RETURNS jsonb`: calls `shift_quest_round_close` (unchanged), then creates at most one gift: none when the member already got 2 gifts today (Asia/Bangkok date of `created_at`) or the team owns everything. Options: up to 3 unowned ids from the slot with the most unowned items (ties: `sort` order of the slot rotated by the project's gift count), filled from other slots when that slot has fewer than 3. Returns `{id: <progress uuid>, gift: null | {id, options}}`.
  - `shift_quest_tree_pick(p_actor text, p_gift uuid, p_item text) RETURNS jsonb` (= tree_get): locks the gift `FOR UPDATE`; refuses `sq:gift_gone` (missing, already picked, or not the caller's current project) and `sq:item_not_offered`; sets `picked`, adds to `owned` without duplicates, equips the item in its slot.
  - `shift_quest_tree_equip(p_actor text, p_item text) RETURNS jsonb` (= tree_get): refuses `sq:item_not_owned`.
  - `shift_quest_island_styles() RETURNS jsonb`: `[{slot, seed, equipped}]` for plots whose project passes `shift_quest__name_visible` and has a style row. Never a count, a name or a member.
  - `shift_quest_schema_version()` → 13.

- [ ] **Step 1: Write `tree.ts`** in the style of `roots.ts` (synthetic ids; bot and web connections). Checks: schema version 13; tree_get on a fresh project = defaults, seed null, no gifts; seed_plant sets seed `sakura` look and owned ⊇ its items, ambition filled when null and kept when set; second seed_plant → `sq:seed_planted`; unknown seed → `sq:seed_unknown`; idea of 501 chars refused; round_close_gift creates a gift with 3 distinct unowned options; third round close the same Bangkok day → `gift: null`; pick → owned +1, equipped updated, gift gone from tree_get; two concurrent picks on one gift from two teammates' connections → exactly one ok, one `sq:gift_gone`, owned has no duplicates; pick by a member of another project → `sq:gift_gone`; pick of an id not offered → `sq:item_not_offered`; equip of an unowned id → `sq:item_not_owned`; owning all but 2 items → gift has 2 options; owning all → no gift; island_styles omits a plain (not name-visible) project and never includes `roots`; tree_get `roots.count` matches a known number of qualifying notes and `recent` counts only the last 7 days (backdate rows as admin); all functions callable as `shift_quest_web`.
- [ ] **Step 2: Run** `pnpm test:db:quests`. Expected: the `tree` suite FAILS (functions missing); every other suite passes.
- [ ] **Step 3: Write the migration.** Header comment states schema 13, prod-first, functions + tables, the maintainer applies it.
- [ ] **Step 4: Run** `pnpm test:db:quests`. Expected: all suites PASS, including migrations applied twice.
- [ ] **Step 5: Commit** `feat(shift): schema 13 seeds, tree style and round gifts`.

### Task 4: Shared tree readers and map recolour

**Files:**
- Create: `bot/src/quests/island/tree.ts` (reader, shared by bot and web like `roots.ts`)
- Modify: `bot/src/quests/island/scene.ts` (`IslandPlot` gains `style?: TreeStyle; seeded?: boolean`; stage 0 + seeded uses sprite `stage_seed`)
- Modify: `bot/assets/island/sprites.ts` (add `stage_seed`: `stage_1` with its `n` pixel removed)
- Modify: `bot/src/quests/island/render.ts` (bitmap cache keyed by sprite + style; colour lookup via `mapTreeColor` for tree sprites)
- Modify: `lib/shift-island/live/draw.ts` (atlas gets a recoloured copy per distinct style; key `${sprite}|${styleKey}`)
- Modify: `lib/supabase/shift-quests/types.ts` (`IslandMapPlot` gains `style?`, `seeded?`; new `MyTree` type matching tree_get)
- Modify: `lib/supabase/shift-quests/page.ts` (map gets styles; page data gets `tree: MyTree | null` via `soft()`)
- Modify: `components/shift/island/PlotSheet.tsx`, `components/shift/island/HudSheets.tsx` (pass a recoloured palette to `PixelIcon` for styled trees)
- Modify: `bot/deploy.sh` (`FILES` += `lib/shift-island/tree-style.ts lib/shift-island/tree-closeup.ts`)
- Test: `bot/src/quests/__tests__/island-tree.test.ts`, extend `lib/supabase/shift-quests/__tests__/` page test

**Interfaces:**
- Consumes: Task 1, Task 3's function names and JSON shapes.
- Produces:
  - `export const TREE_SCHEMA = 13`
  - `stylesFrom(raw: unknown): ReadonlyMap<number, { seed: string | null; style: TreeStyle }>`
  - `readStyles(api: QuestApi, log: string)`: never throws; empty map below schema 13 or on failure (logged once per cause, like `readRoots`)
  - `readMyTree(api: QuestApi, actor: string, log: string): Promise<MyTree | null>`: null below 13 or on failure
  - `withStyles(plots, styles, mine: MyTree | null)`: style only on non-plain plots; a `mine` plot uses `mine`'s style and seed
  - `styleKey(style: TreeStyle): string`

- [ ] **Step 1: Write the failing tests**: `stylesFrom` drops malformed entries and resolves unknown ids to defaults; `withStyles` leaves plain plots unstyled and uses `mine` for the own plot; `readStyles` and `readMyTree` make no call when `schemaOf` < 13 (fake api); `renderIsland` with one plot styled `leaf:autumn` at stage 7 contains the autumn mid colour and the same plot unstyled does not; a stage 0 seeded plot renders differently from unseeded; soil pixels of a `bark:birch` tree equal the default's.
- [ ] **Step 2: Run** `pnpm jest bot/src/quests/__tests__/island-tree.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the reader, scene/render/atlas changes, page wiring and deploy list.
- [ ] **Step 4: Run** `pnpm jest bot/src/quests lib/supabase/shift-quests lib/shift-island`. Expected: PASS, existing island render tests unchanged.
- [ ] **Step 5: Commit** `feat(shift): team tree colours on the island map`.

### Task 5: Copy and stage names

**Files:**
- Modify: `components/shift/island/copy.ts` (`STAGE_NAMES[1]` → `เมล็ดงอก`; new `PRE_STAGE = "เมล็ด"`; new `TREE` block)
- Modify: `bot/src/quests/island/copy.ts` (same stage name; new `TREE` block for buttons, seed modal, gift reply, close-up caption)
- Modify: `bot/src/quests/copy.ts` (`errorText` for `seed_unknown`, `seed_planted`, `gift_gone`, `item_not_offered`, `item_not_owned`)
- Modify: `lib/content/shift-island.ts` and its test if they repeat stage names
- Test: `components/shift/island/__tests__/copy.test.ts`, `bot/src/quests/__tests__/` copy tests

Copy the builder writes, then sends through review: seed card title and one-line ask (what the team wants to build), the 4 seed blurbs, seed planted confirmation, gift heading after a round (one gift for the team, pick 1 of 3, the team sees it on the island), "เก็บไว้ก่อน" (keep for later), wardrobe heading, 🔍 button label, close-up caption (roots = reflections), refusal lines.

- [ ] **Step 1: Write failing copy tests**: `STAGE_NAMES[1] === "เมล็ดงอก"` in both copy files; every new string has no "—", no "น้องๆ", no "ปลูก", no "สตรีค"/"streak"; each new `sq:` code has `hasErrorText` true.
- [ ] **Step 2: Run** `pnpm jest components/shift/island/__tests__/copy.test.ts bot/src/quests/__tests__`. Expected: FAIL.
- [ ] **Step 3: Write the copy.**
- [ ] **Step 4: Three-model review**: `agy -p "<copy + rules>" --print-timeout 600s`, `cursor-agent --trust --mode ask -p "<copy + rules>"`, `codex exec -s danger-full-access "<copy + rules>" < /dev/null`; save to `scratchpad/thai-review-tree/`; apply lines two reviewers flag, checked against the copy rules.
- [ ] **Step 5: Run** the tests again. Expected: PASS. **Commit** `feat(shift): tree and seed copy, stage 1 renamed`.

### Task 6: Web close-up, seed and wardrobe

**Files:**
- Create: `components/shift/island/tree/TreeCanvas.tsx` (draws `closeupGrid` to a `<canvas>` with `image-rendering: pixelated`; respects `useReducedMotion` for the grow-in)
- Create: `components/shift/island/tree/TreeSheet.tsx` (IslandSheet: canvas, waiting gift card, wardrobe tabs per slot showing owned items, seed card when `seed` is null)
- Create: `components/shift/island/tree/SeedPicker.tsx` (4 seed previews + one-line idea field, max 500)
- Create: `app/shift/island/tree-actions.ts` (`plantSeed(seed, idea)`, `pickGift(giftId, item)`, `equipItem(item)`: server actions, `supabase.auth.getUser()` via the existing viewer helper, call the Task 3 functions, return `{ ok: true, tree: MyTree } | { ok: false, code }`, `revalidatePath("/shift/island")`)
- Modify: `components/shift/island/IslandApp.tsx` (own plot tap and HUD tree open `TreeSheet`)
- Modify: `components/shift/island/PlotSheet.tsx` (another team's non-plain plot shows `TreeCanvas` with its style and stage; roots drawn from its public level only, `count = [0,3,8,15][level]`, `recent = 0`; a plain plot shows no tree, as today)
- Modify: `components/shift/island/QuestBoard.tsx` (seed card at the top while `tree.seed` is null)
- Test: `components/shift/island/__tests__/tree-sheet.test.tsx`, `app/shift/island/__tests__/tree-actions.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 2, 4 (`MyTree` on page data), 5 (`TREE` copy).

- [ ] **Step 1: Write failing tests**: TreeSheet with `seed: null` shows the seed card; with one gift shows 3 option buttons whose labels are the item names; clicking one calls `pickGift(giftId, item)`; wardrobe lists only owned items per slot and marks the equipped one; `tree: null` (schema < 13) renders no tree button and no seed card; PlotSheet for a plain plot renders no canvas, and for a visible plot with roots level 2 passes `{count: 8, recent: 0}`; actions map `sq:gift_gone` to `{ ok:false, code:"gift_gone" }` and reject a missing session.
- [ ] **Step 2: Run** `pnpm jest components/shift/island/__tests__/tree-sheet.test.tsx app/shift/island/__tests__/tree-actions.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, following `docs/ui-design-system.md` (Dawn theme for students, existing island sheet styles, phone width first).
- [ ] **Step 4: Run** `pnpm lint && pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(shift): web tree close-up, seed choice and wardrobe`.

### Task 7: Discord seed, gifts and 🔍

**Files:**
- Create: `bot/src/quests/handlers/tree.ts`
- Create: `bot/src/quests/island/closeup-png.ts` (`closeupPng(input, scale=4): Buffer`; `giftPreviewPng(base: CloseupInput, options: string[]): Buffer`, options side by side; `seedPreviewPng(): Buffer`, the 4 seeds at stage 7)
- Modify: `bot/src/quests/handlers/rounds.ts` (`rd_close_go`: at schema ≥ 13 call `shift_quest_round_close_gift`, else unchanged; when `gift` is present, the saved view adds the gift image and 3 buttons `tr_pick:<giftId>:<i>` plus `tr_later`)
- Modify: `bot/src/quests/handlers/island.ts` (at schema ≥ 13: `is_tree` 🔍 button; `tr_seed` button while seed is null)
- Modify: handler registry (where `is_reflect` is registered)
- Test: `bot/src/quests/__tests__/tree-handlers.test.ts`

**Interfaces:**
- Custom ids: `is_tree`; `tr_seed` (reply: seed preview + 4 buttons `tr_seed_pick:<seed>`); `tr_seed_pick:<seed>` opens modal `tr_seed_go:<seed>` (field idea, 1..500); `tr_pick:<giftId>:<index 0..2>` (index into the gift's options read from tree_get, never the id in the custom id); `tr_later` (removes the buttons, gift waits).
- All replies ephemeral; modal submits `deferReply` first (as #288).

- [ ] **Step 1: Write failing tests** with the existing test helpers: schema 12 → `rd_close_go` calls `shift_quest_round_close` and shows no gift; schema 13 with a gift → calls `shift_quest_round_close_gift`, reply has an image attachment and 3 `tr_pick` buttons; `tr_pick` with `sq:gift_gone` replies with `errorText("gift_gone")`; `tr_seed_go:pine` calls `shift_quest_seed_plant(actor,"pine",idea)`; `is_tree` replies with a PNG attachment; schema 12 `/island` has no `is_tree` or `tr_seed` button.
- [ ] **Step 2: Run** `pnpm jest bot/src/quests/__tests__/tree-handlers.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm jest bot`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(shift): Discord seed choice, round gifts and tree close-up`.

### Task 8: Guide

**Files:**
- Modify: `lib/content/shift-island-guide.ts`, `app/shift/island/guide/parts.tsx` if a new part is needed
- Test: `lib/content/__tests__/shift-island-guide.test.ts`

Content: the seed as the first step (no review needed), the close-up (tap your tree on the web, 🔍 in `/island`), roots = reflections, a gift after every campfire round (pick 1 of 3, the whole team's tree), the wardrobe, stage names matching `STAGE_NAMES` (with เมล็ด before stage 1).

- [ ] **Step 1: Failing test**: guide stage list equals `[PRE_STAGE, ...STAGE_NAMES.slice(1)]` where it lists stages; guide mentions 🔍 and the campfire gift; copy rule checks pass.
- [ ] **Step 2: Run** `pnpm jest lib/content/__tests__/shift-island-guide.test.ts`. Expected: FAIL.
- [ ] **Step 3: Write it**; three-model review as in Task 5.
- [ ] **Step 4: Run** again. Expected: PASS. **Commit** `docs(shift): guide covers seeds, the close-up and round gifts`.

### Task 9: Promo animation

**Files:**
- Create: `scripts/render-tree-promo.ts` (run with `pnpm tsx scripts/render-tree-promo.ts <outDir>`; writes PNG frames with `gridToRgba` + `encodePng`, then calls `ffmpeg`; exits with a clear message when ffmpeg is missing)
- Output (not committed): `output/marketing/2026-11-14/tree-promo/tree-promo-1080x1920.mp4`, `tree-promo-1080.gif` (or `.mp4` loop)

Storyboard, 30 fps, about 15 s: 0–1.5 s empty plot, title; 1.5–3 s seed card, a seed is chosen, it drops into the soil; 3–7 s growth stages 1→7 with roots spreading (eased, 0.5 s per stage); 7–9 s "จบรอบกองไฟ" gift card with 3 options, one gets picked; 9–12 s wardrobe cycle (leaf colour, shape, bark, blossom, 0.75 s each) on the stage 7 tree; 12–15 s end card: `/start` in the SHIFT server and the guide URL. Text drawn with a pixel font already in the repo (`components/shift/poster/pixel`) or rendered once as PNG overlays; Thai copy through the three-model review.

- [ ] **Step 1: Render** a 3-frame dry run and read the PNGs (frame 0, middle, last).
- [ ] **Step 2: Render** the full set and encode; check duration with `ffprobe` (14–16 s) and size (< 15 MB for Discord).
- [ ] **Step 3: Commit** the script only: `feat(shift): tree promo renderer`.

### Task 10: Ship

- [ ] **Step 1:** `pnpm lint && pnpm test && pnpm build` green locally (or CI if local tsc runs out of memory); open the PR; CI `build` and `test:db:quests` green.
- [ ] **Step 2:** From a detached worktree of the PR head with `supabase/.temp` copied in (and the untracked `meta_marketing_sync` migration restored from `origin/feat/meta-marketing-sync`): `supabase db push --linked --dry-run` lists only `20261114120000_shift_quest_tree_style.sql`; then `--yes`. Verify with read-only queries: `shift_quest_schema_version() = 13`, grants on the new functions for `shift_quest_bot` and `shift_quest_web`, 22 rows in `shift_quest_tree_items`.
- [ ] **Step 3:** Squash-merge; deploy the bot from up-to-date `main` (`PATH=<sshshim>:$PATH bash bot/deploy.sh localhost`); check the container is healthy and logs are clean.
- [ ] **Step 4:** Check the live guide page shows the new sections; hand the promo files to the founder.
