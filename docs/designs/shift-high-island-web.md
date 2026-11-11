# SHIFT High Island on the web: build plan

Branch `feat/shift-high-quests` (worktree `web-shift-quests`, PR #268). Nothing
is merged or applied to production. This plan builds on the quest bot and the
island migrations already on this branch (`docs/designs/shift-high-island.md`,
`docs/features/shift-high-quests.md`).

## Decision

**The website is the game. Discord is the doorbell.**

Discord chat UI is too cramped for the island: walls of text, a 40-component
cap, nothing persists, and parents never see it. Students play at
`/shift/island` on the website and sign in with the Discord account they use in
the SHIFT server. The bot keeps reminders, the weekly island post, inbox
notifications and mentor review. For now the bot only gains a link button to
the website. Mentors keep reviewing in Discord.

## Prototype scope

A student can:

1. Open `/shift/island`, sign in with Discord, and land back on the island.
2. Start (once), and create a project if they have none (or accept an invite).
3. See the island picture with their tree marked, and tap plots.
4. Open the quest board: 7 main quests (any order), side quests that branch by
   route and unlock by prerequisites, their own proposed quests, and shared
   island quests.
5. Open a quest, read what to send, submit proof plus one reflection.
6. Tap the daily check-in, press "ติด" (stuck) to ask for help in a group space,
   rest and wake.

Out of scope for the prototype: mentor review on the web, inbox on the web,
squads, coins and rewards, appeals, withdraw, project invites sent from the
web, Discord Activity embedding, TOS flow changes.

## Architecture

```
Browser (phone)                     Next 16 server (Vercel)                       Quest Postgres
-----------------                   ------------------------------------------    ------------------------
/shift/island  ── GET ───────────▶  app/shift/island/page.tsx (force-dynamic)
                                      resolveIslandViewer()  ── getUser() ──▶     Supabase Auth (cookies)
                                        Discord id from identities
                                        shift_quest_session(actor, NULL) ──────▶  login shift_quest_web
                                        guild member + roles ──▶ Discord REST     (EXECUTE on an allowlist
                                      getIslandPage(viewer)                         of shift_quest_* only)
                                        shift_quest_island / _island_map /
                                        shift_quest_board / _project_list ─────▶
                                      islandPicture(map)  (hotspots, src)
<img src=/api/shift/island/map?v=> ─▶ app/api/shift/island/map/route.ts
                                        same viewer gate, renderIsland() PNG
Server actions (POST)  ───────────▶ app/shift/island/actions.ts
                                        re-derive viewer, zod + caps,
                                        shift_quest_* call, refresh()
Discord bot ── link button ───────▶ https://www.passionseed.org/shift/island
```

Key choices:

- **Direct pg, own login role.** The web talks to the quest database over a
  direct pg connection as a new least-privilege login `shift_quest_web`, the
  same model as the bot's `shift_quest_bot`. Never supabase-js rpc: every
  `shift_quest_*` function trusts the `p_actor` it is given, so none is exposed
  through the Data API. Locally `SHIFT_QUEST_DATABASE_URL` points at the
  sandbox Postgres; in production at the Supavisor pooler as
  `shift_quest_web.<project ref>`.
- **Lazy pool.** Nothing connects at import, build or prerender time. Every
  page that needs data is `force-dynamic`. CI builds with placeholder env and
  no database.
- **One renderer.** The web shows the same PNG the bot posts, rendered by
  `bot/src/quests/island/render.ts` in a route handler at request time. Plot
  hotspots come from the same placement math (`plotBoxes`), so the picture and
  the tap targets cannot drift.
- **Shared code, no copies of rules.** The web imports `createQuestApi`,
  `toQuestError`, `QuestError`, `QuestDbError` and `Session` from
  `bot/src/quests/api.ts` (pure TS over a `pg.Pool`), and `renderIsland` from
  the bot renderer. All rules stay in Postgres.
- **Self-contained page.** No SiteNav or SiteFooter, no dependency on site
  chrome, its own viewport colour, so it can later be wrapped as a Discord
  Activity.

## Files and owners (five builders, disjoint)

| Builder | Owns |
|---|---|
| db | `supabase/migrations/20261111090900_shift_quests_board.sql`, `supabase/tests/shift_quests/web_board.ts`, `supabase/tests/shift_quests/run-local.sh`, `bot/quests-sandbox.sh`, `.github/workflows/ci.yml` (comment only), `docs/features/shift-high-quests.md` (new runbook section) |
| data | `lib/supabase/shift-quests/**` (types.ts and board.ts written first), `app/shift/island/actions.ts`, `lib/shift/discordGuild.ts` (one new export), `app/auth/callback/route.ts` (failure branch), `.env.example` |
| ui | `app/shift/island/**` except `actions.ts` (page.tsx, loading.tsx, error.tsx), `components/shift/island/**` |
| map | `bot/src/quests/island/render.ts` (new `plotBoxes` export, shared placement helper), `bot/src/quests/__tests__/island.test.ts`, `lib/shift-island/**`, `app/api/shift/island/map/route.ts` |
| bot | `bot/src/quests/weblink.ts`, `bot/src/quests/handlers/island.ts`, `bot/src/quests/handlers/student.ts`, `bot/src/quests/index.ts` (comment only), `bot/src/quests/__tests__/weblink.test.ts`, `bot/src/quests/__tests__/island-cards.test.ts`, `bot/src/quests/__tests__/student-cards.test.ts`, `bot/README.md` |

The worktree has uncommitted bot work (handlers, view.ts, tests). Build on the
working tree as it is; never revert or reformat other people's changes.

## Database: side quests and the board (migration 090900)

Additive and idempotent; applied after wave 2 (090800). Keeps every wave-1
and wave-2 behaviour.

### Template columns

On `public.shift_quest_templates`, all `ADD COLUMN IF NOT EXISTS`:

| Column | Type | Meaning |
|---|---|---|
| `side` | `boolean NOT NULL DEFAULT false` | A side quest on the web board |
| `route_keys` | `text[]` (NULL = every route) | Routes it is meant for, each one of software, creative, service, other |
| `requires_milestones` | `smallint[] NOT NULL DEFAULT '{}'` | Main quests (1..7) the current project must have approved |
| `requires_slugs` | `text[] NOT NULL DEFAULT '{}'` | Side quest slugs the current project must have an approved instance of |
| `branch_of` | `smallint` (1..7 or NULL) | The main quest it hangs off on the board |
| `icon` | `text` (`^[a-z_]{2,20}$` or NULL) | Web icon key |

Checks (added with `DO` blocks that test `pg_constraint` first): route_keys
subset of the four routes; requires_milestones values 1..7; branch_of 1..7; a
side quest has `milestone IS NULL`.

### Unlock rule

A side quest is unlocked for a project when every `requires_milestones` value
is in `shift_quest__milestones(project)` and every `requires_slugs` slug has an
approved instance in that project (any member). Helper:
`shift_quest__side_missing(p_project uuid, p_template public.shift_quest_templates) RETURNS jsonb`
giving `{missing_milestones: int[], missing_slugs: text[]}`. Route is a soft
filter only (shown as `route_match`); any route may take any side quest.

Enforced in one place for every path: a `BEFORE INSERT` trigger
`shift_quest_instances_side_gate` on `shift_quest_instances` (function
`shift_quest__side_gate()`) refuses a side template with `sq:no_project` when
the new row has no project and `sq:quest_locked` when anything is missing.

Side quests are web-only: `shift_quest_templates(p_actor)` is replaced (newest
body copied verbatim from 090100) with one extra filter `AND NOT t.side`, so
the bot's `/quest` browse never lists them.

### New functions

All `plpgsql SECURITY DEFINER SET search_path = public`, refusing through
`shift_quest__fail`.

`shift_quest_board(p_actor text) RETURNS jsonb STABLE`. Gate: `__student`
(`not_started`). Shape:

```json
{
  "project": null,
  "main": [{
    "milestone": 1, "template_id": "uuid", "slug": "find-something-worth-fixing",
    "title": "...", "purpose": "...", "evidence_criteria": "...", "reflection_prompt": "...",
    "done": false,
    "in_flight": null,
    "mine": null
  }],
  "side": [{
    "template_id": "uuid", "slug": "side-five-voices", "title": "...", "purpose": "...",
    "examples": "...", "evidence_criteria": "...", "reflection_prompt": "...",
    "route_keys": null, "route_match": true, "branch_of": 1,
    "requires_milestones": [1], "requires_slugs": [], "icon": "compass",
    "repeatable": false, "sort_order": 110,
    "locked": true, "missing_milestones": [1], "missing_slugs": [],
    "approved": false, "mine": null
  }],
  "proposed": [],
  "help_open": []
}
```

- `project`: null or `{id, route, stage, milestones_done}` for the current project.
- `main`: the published milestone templates ordered by milestone. `in_flight`
  exactly as in `shift_quest_island` (`{instance_id, state, version, mine, owner}`).
- `mine` (main and side): the caller's most recent non-archived instance of
  that milestone or template in the current project, as `QuestMine`:
  `{instance_id, state, version, updated_at, latest_submission: null|{revision, status, created_at}, latest_review: null|{outcome, feedback, created_at}}`
  (build it from `shift_quest__quest_json`). Never another member's instance.
- `side`: published side templates ordered by `branch_of NULLS LAST, sort_order, slug`.
  With no current project every side quest is `locked` with
  `missing_milestones = requires_milestones`.
- `proposed`: the caller's non-archived instances with `template_id IS NULL`,
  newest first, at most 20, each `QuestMine` plus `title, goal, criteria`.
- `help_open`: the caller's help requests with status open or claimed:
  `{id, instance_id, status, visibility, created_at}`.

`shift_quest_side_choose(p_actor text, p_template uuid) RETURNS jsonb`
`{instance_id, version, created}`. Student, current project (`no_project`),
template must be `side` and published (`template_unavailable`), unlocked
(`quest_locked`), not already approved in the project when not repeatable
(`quest_done`). Advisory lock on `'shift_quest_side:' || member || ':' || template`.
Returns the caller's open instance (active, clarification, submitted, paused)
when there is one; otherwise `shift_quest_choose(p_actor, p_template, left(purpose, 1000), '-', NULL, NULL)`.

`shift_quest_side_submit(p_actor text, p_template uuid, p_proof text, p_reflection text, p_artifact_url text) RETURNS jsonb`
`{instance_id, submission_id, revision, version, created}`. Same gates and lock
as side_choose, `quest_appealed` when the caller's open instance is appealed,
resumes a paused one, then
`shift_quest_submit(p_actor, id, NULL, p_proof, p_reflection, p_artifact_url, 'reviewers', NULL, '{}')`.
Mirrors `shift_quest_milestone_submit` (090700:771-836).

`shift_quest_schema_version()` returns **3** here and **4** after
`20261111091000_shift_quests_board_fixes` (see "Review fixes" below). The bot
keeps `REQUIRED_SCHEMA = 2` (it uses nothing new); the web requires 4.

### The web role

```
shift_quest_web: NOLOGIN NOINHERIT (LOGIN and password out of band, like the bot)
  statement_timeout 8s, CONNECTION LIMIT 20, USAGE ON SCHEMA public
  no table privileges, no helpers, no admin, review, staff, outbox or data functions
```

The migration revokes every `shift_quest_*` function from `shift_quest_web`,
then grants EXECUTE on exactly this allowlist (by signature):

| Function | Used for |
|---|---|
| `shift_quest_schema_version()` | startup check (needs 4) |
| `shift_quest_session(text, text)` | viewer (name passed as NULL on reads) |
| `shift_quest_start(text, text, boolean)` | start |
| `shift_quest_island(text)` | project, taps today, resting, season |
| `shift_quest_island_map(text)` | picture |
| `shift_quest_board(text)` | quest board |
| `shift_quest_checkin(text, text)` | check-in tap and note |
| `shift_quest_rest(text, boolean)` | rest and wake |
| `shift_quest_resume(text, uuid)` | resume one paused quest (091000) |
| `shift_quest_island_optin(text, uuid, boolean)` | show the project name |
| `shift_quest_milestone_start(text, smallint)` | start a main quest (091000) |
| `shift_quest_milestone_submit(text, smallint, text, text, text)` | main quests |
| `shift_quest_side_choose(text, uuid)` | side quests |
| `shift_quest_side_submit(text, uuid, text, text, text)` | side quests |
| `shift_quest_propose(text, text, text, text, text, text)` | own quests |
| `shift_quest_submit(text, uuid, integer, text, text, text, text, text, text[])` | own quests |
| `shift_quest_help_create(text, text, text, text, uuid)` | stuck |
| `shift_quest_project_create(text, text, text, text)` | claim a plot |
| `shift_quest_project_list(text)` | pending invites |
| `shift_quest_project_respond(text, uuid, boolean)` | accept an invite |

The usual grant loop (revoke from PUBLIC, anon, authenticated; grant
service_role and shift_quest_bot on every non-helper) is repeated at the end so
the new functions reach the bot and nothing reaches the Data API. Every later
migration that adds a student function must add it to this allowlist on
purpose.

### Draft side quests (Thai, for founder review)

**DRAFT COPY. Needs the founder's multi-model Thai review (AGENTS.md) before
publishing.** Seeded with `status = 'draft'`, so production shows nothing until
an admin publishes each slug (`/admin template-state`, i.e.
`shift_quest_admin_template_state(actor, slug, true)`). The sandbox publishes
them. Insert with `ON CONFLICT (slug, version) DO NOTHING`, version 1.

| slug | branch | requires | routes | icon | repeatable | title | purpose | evidence_criteria | reflection_prompt |
|---|---|---|---|---|---|---|---|---|---|
| side-five-voices | 1 | m1 | all | compass | no | ฟังเสียงจริงอีก 5 คน | คุยกับคนที่เจอปัญหานี้จริงเพิ่มอีก 5 คน เพื่อดูว่าเรื่องที่คุณเลือกยังจริงอยู่ไหม | สรุปแบบไม่ระบุตัวตนว่าคุยกับใครบ้าง (เช่น "นักเรียน ม.4 สามคน") ได้ยินอะไรซ้ำ และอะไรไม่ตรงกับที่คิดไว้ | ประโยคไหนจากที่คุยที่คุณยังคิดถึงอยู่ |
| side-open-on-phone | 2 | m2 | software | gear | no | ให้คนอื่นเปิดได้จากมือถือ | ทำให้งานของคุณเปิดใช้ได้จากลิงก์เดียวบนมือถือ โดยไม่ต้องรันบนเครื่องคุณ | ลิงก์ที่เปิดได้จริง และบอกว่าลองเปิดบนมือถือแบบไหนแล้ว | อะไรพังตอนย้ายจากเครื่องคุณขึ้นเว็บ แล้วแก้ยังไง |
| side-readme | 2 | m2 | software | scroll | no | เขียนคู่มือให้เพื่อนรันเองได้ | เขียน README สั้นๆ ที่ทำให้เพื่อนรันหรือใช้งานของคุณได้เองโดยไม่ต้องถามคุณ | ลิงก์ README และบอกว่าใครลองทำตามแล้ว (บอกแค่บทบาท เช่น "เพื่อนร่วมห้อง") | เพื่อนติดตรงไหนตอนทำตาม |
| side-thirty-second-cut | 2 | m2 | creative | paint | no | ตัวอย่าง 30 วินาที | ทำตัวอย่างที่สั้นที่สุดที่ทำให้คนเข้าใจว่างานของคุณคืออะไร เช่น คลิป ภาพชุด หรือเพลงท่อนเดียว | ลิงก์ตัวอย่าง และบอกว่าตัดอะไรทิ้งไปเพื่อให้เหลือ 30 วินาที | ถ้าคนดูจำได้แค่อย่างเดียว คุณอยากให้เป็นอะไร |
| side-clear-offer | 2 | m2 | service | megaphone | no | บอกให้ชัดว่าช่วยอะไร | ทำหน้าเดียวที่บอกว่าบริการของคุณช่วยใคร ทำอะไรให้ และเริ่มใช้ได้ยังไง | ลิงก์หรือคำอธิบายของหน้านั้น ห้ามใส่เบอร์โทร ที่อยู่ หรือข้อมูลส่วนตัว | ประโยคไหนที่คุณเขียนใหม่บ่อยที่สุด เพราะอะไร |
| side-outside-circle | 3 | m3 | all | visitor | no | ให้คนนอกวงเพื่อนลอง | ให้คนที่ไม่ใช่เพื่อนสนิทหรือครอบครัวลองงานของคุณ เช่น เพื่อนต่างห้อง ครูวิชาอื่น หรือคนในชุมชน SHIFT | สรุปแบบไม่ระบุตัวตนว่าใครลอง (บอกแค่บทบาท) เกิดอะไรขึ้น และต่างจากตอนเพื่อนสนิทลองยังไง | อะไรที่คนนอกเห็น แต่เพื่อนสนิทไม่เคยพูด |
| side-fix-one-thing | 3 | m3 + side-outside-circle | all | hammer | yes | แก้หนึ่งอย่างจากสิ่งที่เห็น | เลือกปัญหาหนึ่งข้อที่เห็นตอนคนลอง แก้มัน แล้วให้คนลองอีกรอบ | ก่อนแก้เป็นยังไง แก้อะไร และรอบใหม่เป็นยังไง ผลที่ไม่ดีขึ้นก็นับ | ทำไมเลือกแก้ข้อนี้ก่อนข้ออื่น |
| side-demo-three-minutes | 3 | m2, m3 | all | lantern | no | เตรียมเดโม 3 นาที | ซ้อมเล่างานของคุณใน 3 นาที: ปัญหา สิ่งที่ทำ และสิ่งที่เรียนรู้ ให้พร้อมสำหรับ Demo Day | ลิงก์คลิปซ้อมหรือสไลด์ และบอกว่าซ้อมให้ใครฟังแล้ว (บอกแค่บทบาท) | ตอนไหนที่คนฟังสนใจที่สุด |
| side-handoff-page | 5 | m5 | all | key | no | คู่มือส่งต่อหนึ่งหน้า | เขียนหน้าเดียวที่บอกว่า ถ้าคุณหายไปหนึ่งเดือน คนในทีมจะทำงานนี้ต่อได้ยังไง | ลิงก์หรือข้อความของหน้านั้น ห้ามใส่รหัสผ่าน โทเคน หรือข้อมูลบัญชีส่วนตัว | ส่วนไหนที่ยังมีแค่คุณคนเดียวที่ทำได้ |
| side-review-a-friend | 6 | none | all | heart | yes | ช่วยดูงานเพื่อนหนึ่งชิ้น | ลองใช้งานของเพื่อนอีกโปรเจกต์ แล้วให้คำติชมในห้องรวมของเกาะที่เขาเอาไปใช้ต่อได้ | ลิงก์ข้อความคำติชมในห้องรวม (ไม่ใช่ข้อความส่วนตัว) และบอกว่าเพื่อนเอาไปใช้ยังไง | การดูงานคนอื่นทำให้คุณเห็นอะไรในงานตัวเอง |
| side-share-a-lesson | 7 | m3 | all | well | yes | แบ่งสิ่งที่เรียนรู้ให้ทั้งเกาะ | เล่าสิ่งหนึ่งที่คุณเรียนรู้จากการทำโปรเจกต์ เป็นโพสต์หรือคลิปสั้น แล้วแชร์ในห้องรวมของเกาะ | ลิงก์โพสต์ในห้องรวม | ถ้าย้อนกลับไปเริ่มใหม่ได้ จะบอกตัวเองว่าอะไร |

`sort_order` 110, 120, ... in table order. `routes` (the old free-text
column, NOT NULL) gets a short Thai line: "ทุกเส้นทาง" or the route's Thai
name. `examples` and `support_options` get one short Thai line each (also
draft). No reward rule.

## Web data layer (lib/supabase/shift-quests)

Server-only except `types.ts` and `board.ts`, which are pure and client-safe.

- `db.ts`: lazy `pg.Pool` from `SHIFT_QUEST_DATABASE_URL`, kept on
  `globalThis` so dev hot reload does not leak pools. Refuses a URL whose user
  is not `shift_quest_web` (or `shift_quest_web.<ref>` on the pooler). TLS
  verified against the embedded Supabase CA (`ca.ts`, copied from
  `bot/supabase-ca.pem`, public), plain only for 127.0.0.1, localhost, ::1.
  `max: 2`, `idleTimeoutMillis: 10_000`, `connectionTimeoutMillis: 5_000`,
  `application_name: "shift-island-web"`, `pool.on("error")`. Never a named
  prepared statement (Supavisor transaction mode). Schema check: memoized
  `shift_quest_schema_version() >= 4`.
- `identity.ts`: `discordActor(user)` uses `extractDiscordIdentity`
  (`lib/projectseed/discord.ts`), requires `/^\d{17,20}$/`, and picks the
  display name (guild nick, else `custom_claims.global_name`, else
  `user_name`, `#0` stripped).
- `eligibility.ts`: pure `isEligible({sessionRoles, studentRoleIds, memberRoleIds})`,
  same rule as `bot/src/quests/context.ts`: staff roles reviewer, admin,
  fulfillment always pass; otherwise an overlap of `settings.student_role_ids`
  and the member's guild roles.
- `discordGuild.ts` gains `fetchShiftGuildMember(discordId)` (reuses the
  private `guildConfig` and `discordFetch`) returning
  `{ok: true, roles, nick} | {ok: false, reason: "not_member" | "not_configured" | "rate_limited" | "error"}`.
  Cached per Discord id in a module Map: 60 s for success, 15 s for
  not_member. Called for everyone, staff included (someone removed from the
  SHIFT server loses the website too, as in the bot); skipped only for a
  non-staff viewer while `student_role_ids` is empty (pilot closed).
- `viewer.ts`: `resolveIslandViewer = cache(async () => ...)`.
- `page.ts`: `getIslandPage(viewer)`, `getIslandMap(actor)`.
- `errors.ts`: `questErrorText(code)` Thai map (bot's ERRORS without emoji,
  markdown or slash-command hints, plus quest_locked, quest_done,
  quest_appealed, schema and config codes).
- `board.ts`: tile status derivation and the one keynote quest.
- `app/shift/island/actions.ts`: every mutation.

Data flow for one page view: `getUser()` (cookies) then
`shift_quest_session(actor, NULL)` then the Discord member lookup (everyone
but a non-staff viewer of a closed pilot), then in parallel `shift_quest_island`,
`shift_quest_island_map`, `shift_quest_board` (only with a project) and
`shift_quest_project_list` (only without a project). Then the picture route
repeats the gate and calls `shift_quest_island_map` once more.

Data flow for one action: POST (Next checks Origin against Host) then
`resolveIslandViewer()` again (never trusts the client), zod validation with
the DB's own caps, one `shift_quest_*` call, `QuestError` mapped to Thai, then
`refresh()` from `next/cache` so the page re-renders in the same response.

## Island picture (map builder)

- `render.ts` keeps its pixels (the pinned sha256 in `island.test.ts` must not
  change). Refactor tree placement into one internal helper used by both
  `renderIsland` and a new export `plotBoxes(plots)`, which returns
  `{width, height, boxes: [{slot, left, top, width, height}]}` in native
  pixels at scale 1. A box covers the tree sprite and its number tag.
- `lib/shift-island/picture.ts` (server-only): `islandPicture(map)` returns
  hotspots in percent of the image, each grown to at least 12 by 12 native px
  (48 CSS px at the 4x it can be shown at, comfortable at 2x), clamped to the
  image, plus `src = /api/shift/island/map?v=<pictureVersion(map)>`.
  `renderIslandPng(map)` calls `renderIsland(plots, {scale: 1, markMine: true, festival: map.season !== null})`.
- `app/api/shift/island/map/route.ts`: GET, `force-dynamic`, same viewer gate
  (401 signed out or no Discord, 403 not eligible or not started, 503
  unavailable), 200 `image/png` with `Cache-Control: private, no-store` and
  `X-Content-Type-Options: nosniff`. A render failure is 500 with one log line
  (code and slot only); the page still works without the picture.

## Screens (UI builder)

Mobile first (390 x 844 is the reference), Dawn theme, pixel island as a lit
diorama in the Dawn night sky. Thai first, no em dashes, no emoji in the web
copy, never talk down. All copy below is a **draft for the founder's Thai
review**; it lives in `components/shift/island/copy.ts` and must pass
`lintText` (`lib/marketing/copyRules.ts`).

### Shell

- Root: `<main lang="th" className="dawn-theme ...">` with `DawnScene`
  (`components/projectseed/dawn-scene.tsx`) behind it. Styles in
  `components/shift/island/island.module.css`, which defines its own tokens
  (`--ease-tension: cubic-bezier(0.05,0.7,0.35,0.99)`,
  `--ease-snap: cubic-bezier(0.4,0,0.2,1)`, island colours copied from
  `bot/assets/island/sprites.ts` PALETTE), because `:root` does not.
- `export const viewport = { themeColor: "#000006", colorScheme: "dark" }`.
- Fonts: Kodchasan 600 for Thai headings, Bai Jamjuree 16px / 1.6 for body,
  Space Mono for digits. Never Mitr, never Tiny5 for Thai, no eyebrow labels,
  no uppercase tracking on Thai.
- One gold (#fed95c) element per screen: the keynote quest card. Blue is for
  interactive elements. Red only for real errors; declined and stuck are never
  red.

### Gate states (one card each, centred, the island art dimmed behind)

| State | Heading | Body | Action |
|---|---|---|---|
| signed out | เกาะ SHIFT | ต้นไม้ของคุณบนเกาะโตทุกครั้งที่พี่เลี้ยงยืนยันงานที่คุณทำได้จริง | เข้าสู่ระบบด้วย Discord (fine print: ใช้บัญชี Discord เดียวกับที่อยู่ในเซิร์ฟเวอร์ SHIFT) |
| auth error discord_identity_exists | เข้าสู่ระบบไม่สำเร็จ | บัญชี Discord นี้ผูกกับอีกบัญชีหนึ่งอยู่แล้ว ออกจากระบบแล้วเข้าด้วย Discord อีกครั้ง | เข้าสู่ระบบด้วย Discord |
| auth error discord_email | เข้าสู่ระบบไม่สำเร็จ | Discord ยังไม่ได้ยืนยันอีเมลของบัญชีนี้ ยืนยันอีเมลใน Discord ก่อนแล้วลองใหม่ | เข้าสู่ระบบด้วย Discord |
| auth error discord_auth | เข้าสู่ระบบไม่สำเร็จ | ลองอีกครั้งได้เลย | เข้าสู่ระบบด้วย Discord |
| no Discord on this account | ใช้ Discord ที่อยู่ใน SHIFT | ตอนนี้คุณเข้าสู่ระบบด้วย {label} ซึ่งยังไม่ได้ผูก Discord | เข้าด้วย Discord ที่ใช้ใน SHIFT |
| not eligible: no_role | ยังเข้าเกาะไม่ได้ | บัญชี Discord นี้ยังไม่มีสิทธิ์เข้าเกาะ ถ้าคุณเป็นนักเรียน SHIFT High ทักทีมงานในห้องช่วยเหลือของเซิร์ฟเวอร์ได้เลย | สลับบัญชี Discord |
| not eligible: not_in_guild | ยังเข้าเกาะไม่ได้ | บัญชี Discord นี้ยังไม่ได้อยู่ในเซิร์ฟเวอร์ SHIFT เข้าเซิร์ฟเวอร์ก่อนแล้วกลับมาที่นี่ | สลับบัญชี Discord |
| not eligible: pilot_closed | เกาะยังไม่เปิด | ทีมงานจะประกาศในเซิร์ฟเวอร์ SHIFT เมื่อเปิดให้เข้า | none |
| not eligible: discord_unavailable | เช็กสิทธิ์ไม่ได้ตอนนี้ | Discord ไม่ตอบกลับ ลองรีเฟรชอีกครั้งในอีกสักครู่ | ลองอีกครั้ง |
| unavailable | เกาะปิดปรับปรุงชั่วคราว | งานและต้นไม้ของคุณยังอยู่ครบ ลองใหม่อีกครั้งในอีกสักครู่ | ลองอีกครั้ง |
| not started | ยินดีต้อนรับสู่เกาะ SHIFT | four rules: 1 โปรเจกต์ = ต้นไม้ 1 ต้น โตได้ 7 ขั้น ทำขั้นไหนก่อนก็ได้ / ถึงขั้นไหนแล้ว ส่งหลักฐานสั้นๆ กับคำตอบหนึ่งข้อ พี่เลี้ยงจะดูแล้วยืนยัน / ต้นไม้โตจากงานที่พี่เลี้ยงยืนยันเท่านั้น ไม่ได้โตจากจำนวนครั้งที่กด / พักนานแค่ไหนก็ได้ ต้นไม้ไม่เหี่ยว ไม่มีการนับวันต่อเนื่อง | เริ่มเลย |

### No project yet

- Heading: จับจองที่ดินบนเกาะ. Body: สร้างโปรเจกต์เรื่องที่คุณใส่ใจ แล้วต้นไม้ของคุณจะเริ่มจากเมล็ด หรือรอเพื่อนชวนเข้าโปรเจกต์ของเขาก็ได้
- Form: ชื่อโปรเจกต์ (max 80), เส้นทาง as four chips (ซอฟต์แวร์, งานสร้างสรรค์, บริการ, อื่นๆ), อยากให้มันไปถึงไหน (ไม่บังคับ, max 500). Button: จับจองที่ดิน.
- Pending invites above the form: "{project} ชวนคุณเข้าทีม" with buttons เข้าร่วม and ไม่ใช่ตอนนี้.
- The island picture is shown (no marker) so the student sees the place first.

### Island (signed in, with a project), top to bottom

> Superseded by "Full-screen island (HUD)" below: the island is now a
> full-screen world with a HUD, and the blocks listed here open as sheets.

1. **Top bar** (56px, sticky): เกาะ SHIFT, the project name, a small avatar.
2. **Season strip** (48px, only when `island.season` is set): "{season name} · Demo Day {d MMM} · อีก {n} วัน" and a 7-cell pixel meter of `stage_at_cutoff`, with a small flag at `table_bar` and `stage_bar`. Tap opens a sheet: โต๊ะโชว์งานเมื่อนับได้ {table_bar} ขั้น / ขึ้นเวทีเมื่อนับได้ {stage_bar} ขั้น / เป้าหมายของทั้งเกาะ {count}/{target} / ของปลดล็อก (list). No ranking, no names.
3. **Island viewport** (about 45svh): the PNG at 2x (`image-rendering: pixelated`), horizontally pannable, scrolled so the student's plot is centred. Transparent button hotspots at least 48px: own plot aria-label "แปลงของคุณ #{n}, {stage name}"; others "แปลง #{n}". Tapping another plot opens a small sheet with only what the database returned: แปลง #{n}, stage name unless plain, ป้าย: {name} when named. Never a member, a profile or a contact path. Toggle "ดูทั้งเกาะ" fits to width.
4. **Today card** (below the keynote card): before the tap, a quiet button เช็กอินวันนี้ (min-h-12) and quiet buttons ติด and ขอพัก. After the tap (optimistic): วันนี้คุณลงมือแล้ว and a link เพิ่มโน้ตสั้นๆ (เห็นแค่คุณ, max 300). Resting: กำลังพัก ต้นไม้ไม่เหี่ยว ไม่มีอะไรหาย with button กลับมาแล้ว. No counts of days, no streaks, no heatmap.
5. **Keynote card** (the one gold element, above the Today card): the caller's open quest that needs them most (clarification first, then active, then paused, then submitted), "ทำต่อ: {title}" and its state chip ("รอพี่เลี้ยงดู: {title}" for a submitted one). With none open, the lowest available main quest: "เริ่มที่: {title}".
6. **Quest board**.
   - เควสต์หลัก, "7 ขั้นของต้นไม้ ทำขั้นไหนก่อนก็ได้": a ring of 7 pixel tiles (56 to 64px) around the student's tree sprite (stage n at 3x). No numbers on the ring, no first or last. Icons: m1 compass, m2 hammer, m3 visitor, m4 door, m5 key, m6 path, m7 lantern.
   - เควสต์เสริม, "แตกกิ่งจากเควสต์หลัก": groups by `branch_of`, each headed "ต่อจาก {main title}" with a stepped 2px connector line. Route chips (ทุกเส้นทาง, ซอฟต์แวร์, งานสร้างสรรค์, บริการ, อื่นๆ) default to the project's route; quests with `route_match` false show under ทุกเส้นทาง.
   - เควสต์ที่ฉันเสนอ: the student's proposed quests, plus button เสนอเควสต์ของฉัน (sheet: ชื่อเควสต์ 80, อยากให้เกิดอะไร 1000, ทำเสร็จแล้วดูจากอะไร 1000, ก้าวแรก 500, ทำไมสำคัญ ไม่บังคับ 1000).
   - ทั้งเกาะ: the island goal from the season ("ทั้งเกาะช่วยกัน: {main title} {count}/{target} ภายใน {deadline}", unlock text when set) and the side quest ช่วยดูงานเพื่อนหนึ่งชิ้น when published.
7. **Footer**: show-name switch โชว์ชื่อโปรเจกต์บนเกาะ (fine print: ชื่อจะขึ้นบนเกาะเมื่อทุกคนในทีมเปิด), the growth rule ต้นไม้โตเมื่อพี่เลี้ยงยืนยันงาน ไม่ได้โตจากจำนวนครั้งที่กดหรือเวลาออนไลน์, and the signed-in Discord name with สลับบัญชี.

Desktop and landscape at 1024px or wider: two columns, island sticky on the
left, board on the right. Handle heights under 600px.

### Tile states (from `board.ts`)

| Status | Look | Chip |
|---|---|---|
| locked | transparent tile, 2px stone outline, sprite as a 60% stone silhouette, focusable, opens the unlock rule (lock in the label and description) | ล็อกอยู่ |
| available | sand tile, 2px ink outline, full-colour sprite, hard 3px wood offset shadow | ทำได้เลย |
| active | available plus halo (gold only on the keynote, blue otherwise) | กำลังทำ |
| paused | available, moon pixel | พักไว้ |
| submitted | available, outlined cell | รอพี่เลี้ยงดู |
| clarification | available plus halo | ขอข้อมูลเพิ่ม |
| appealed | available | อุทธรณ์อยู่ |
| declined | available plus a small coral notch, never red | ลองส่งใหม่ได้ |
| held | available, dimmed sprite | {owner} ทำอยู่ (or เพื่อนร่วมทีมทำอยู่) |
| done | leaf tile, cream pixel check, no animation, label below the tile | ผ่านแล้ว |

A tile with an open help request also gets a small lamp-gold flag:
ขอความช่วยเหลือแล้ว.

### Quest detail sheet

vaul Drawer on mobile (`dawn-panel rounded-t-3xl border-0 pb-[env(safe-area-inset-bottom)]`,
`shouldScaleBackground={false}`), Dialog at 1024px or wider.

- Title, purpose, state chip, mentor feedback when `latest_review` exists
  ("พี่เลี้ยงบอกว่า: {feedback}").
- ส่งอะไร: evidence_criteria. คำถามหนึ่งข้อ: reflection_prompt.
- Locked: ปลดล็อกเมื่อผ่าน {titles of missing main and side quests}. No form.
- Held by a teammate: {owner} ถืองานขั้นนี้อยู่ ช่วยกันในงานนั้นได้. No form.
- Form: หลักฐาน (ลิงก์หรือเล่าสั้นๆ) textarea 2000, ลิงก์งาน (ไม่บังคับ, ขึ้นต้นด้วย https://) 500, the reflection prompt as a label for a textarea 2000. Font 16px (no iOS zoom), live counters near the cap. Button ส่งให้พี่เลี้ยงดู, or ส่งฉบับใหม่ when submitted or clarification. Done: ผ่านแล้ว ส่งซ้ำเพื่อเรียนรู้ต่อได้ for repeatable quests.
- Secondary button ติด opens the stuck sheet with this quest attached.
- Success toast: ส่งแล้ว พี่เลี้ยงจะดูใน Discord แล้วแจ้งผลในกล่องข้อความของบอท.

### Stuck sheet

- Heading ติดตรงไหน. Textarea: เล่าสั้นๆ ว่าติดอะไร และลองอะไรไปแล้ว (1000).
- Choice: ถามเพื่อนในห้องช่วยเหลือ (community) or ถามทีมพี่เลี้ยง (mentors).
- Fine print: คำขอจะไปที่ห้องรวมใน Discord ไม่มีแชตส่วนตัว
- Button ส่งคำขอ. Toast: ส่งคำขอแล้ว คำตอบจะมาในห้องรวมและกล่องข้อความของบอท

### Motion

Glow layers animate clip-path, opacity and filter together: charge in with
keyframes of 520 to 700ms on `--ease-tension`, snap out over 160ms on
`--ease-snap`. Touch: `@media (hover: none)` replays them on `.in-view` through
`InViewAnimator` with a custom selector. Every tappable gets an `:active`
press (translateY 1px, pixel shadow 3px to 1px over 80ms). Check-in: a 400ms
pixel dust puff at the tree base, the tree does not change. No confetti, coin
showers, bounce or pulse badges. `prefers-reduced-motion`: everything off.

## Security model

- **Identity**: only `supabase.auth.getUser()` on the server; anonymous users
  count as signed out. The actor is the Discord snowflake from the user's
  `identities` (`provider === "discord"`), checked against `^\d{17,20}$`. The
  client never sends an actor; actions take only object ids (uuid, validated)
  and length-capped text.
- **Gate on every entry**: `/shift/island` is public at the proxy, so the page,
  every server action and the picture route each run `resolveIslandViewer()`
  themselves. During an auth outage `getUser` errors render the signed-out
  card, never a crash.
- **Eligibility fails closed**: a member of the SHIFT guild right now, and
  either a staff role in the quest DB or a configured student role held in
  the guild. Discord errors give `discord_unavailable`, not access (staff
  included).
- **Least-privilege DB**: `shift_quest_web` executes an explicit allowlist and
  owns nothing; all rules stay in SECURITY DEFINER functions. The pool refuses
  any other login. TLS verified against Supabase's CA off loopback.
- **No side effects during render**: `shift_quest_session` gets a NULL display
  name on reads; names are written only in start and project create.
- **Privacy**: the island map's consent rules come from the database
  (`plain` plots show only the slot). The board never returns another
  member's instances; the only other name is a teammate's display name on a
  milestone they hold (as in the bot).
- **Safeguarding (minors)**: help goes to group spaces only (community help
  channel or the mentors' queue). No DMs, no profiles, no contact paths
  between adults and students. Evidence prompts say not to post personal
  data.
- **Logging**: never log student text. Errors log the function name and
  SQLSTATE, or a `QuestError` code.
- **Caching**: page `force-dynamic`; picture `private, no-store`. Server
  actions keep Next's Origin check; caps are enforced in code because
  `bodySizeLimit` is 50mb.
- **Secrets**: `SHIFT_QUEST_DATABASE_URL` from env only; the role password is
  set out of band; `.env.example` documents the variable with no value.

## Test plan

Automated:

1. `pnpm test:db:quests`: the new `web_board.ts` suite (web role allowlist and
   denials, schema 4, seeds, board shape and privacy, unlocks by milestone and
   by slug, the side gate trigger on `shift_quest_choose`, side choose and
   submit, quest_done and quest_appealed, bot browse hides side quests), plus
   the existing suites, the once-versus-twice catalog check, and
   `check_privileges` extended to `shift_quest_web`.
2. Jest (`pnpm exec jest lib/supabase/shift-quests lib/shift-island app/shift/island components/shift/island bot/src/quests`):
   identity and snowflake, eligibility matrix, viewer resolution with Supabase,
   pg and Discord mocked, pool refusal and lazy creation, error mapping,
   every action's validation and error mapping, tile status derivation,
   `plotBoxes` against the renderer, picture hotspots, the map route's status
   codes, UI states and forms, and the bot link button with and without env.
   The pinned island image hash stays unchanged.
3. Types: `pnpm exec tsc --noEmit -p tsconfig.json` filtered to touched files;
   `pnpm exec tsc --noEmit -p bot/tsconfig.json` filtered to `bot/src/quests`.
4. `pnpm lint`.
5. Build with placeholder env (no DB, no Discord):
   `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key NEXT_PUBLIC_SITE_URL=http://localhost:3000 pnpm build`.

Manual (founder, local):

```bash
# 1. Sandbox database with the board migrations; you are admin (staff need no
#    student role, but must be in the SHIFT server: .env.local needs
#    DISCORD_SHIFT_GUILD_ID and DISCORD_SHIFT_BOT_TOKEN or DISCORD_BOT_TOKEN).
QUEST_SANDBOX_PORT=55451 QUEST_SANDBOX_ADMIN_ID=<your Discord user id> bot/quests-sandbox.sh --db-only --reset
# 2. Web against it (Supabase auth from .env.local; the shell variable wins over .env files).
SHIFT_QUEST_DATABASE_URL=postgresql://shift_quest_web:sandbox@127.0.0.1:55451/postgres pnpm dev
# 3. Open http://localhost:3000/shift/island on a phone-sized window.
```

Walk: sign in with Discord, start, claim a plot (software), see your tree as a
seed with the marker, tap a neighbour's plot, open the board, submit main
quest 2, check its tile says รอพี่เลี้ยงดู, approve it as the sandbox's
stand-in reviewer (you cannot review your own work: `sq:conflict_of_interest`).
The sandbox prints the exact command; it is:

```bash
psql -h 127.0.0.1 -p 55451 -U postgres -d postgres -c \
  "select public.shift_quest_review_decide('100000000000000701', s.id, 'approved', 'Sandbox review', true)
   from public.shift_quest_submissions s where s.status = 'pending'"
```

Reload: the tree grows, the m2 side quests unlock for software. Submit one,
tap check-in twice (the second is a no-op), press ติด and confirm the help
flag, rest and wake, toggle the project name.

## Open questions

See the structured plan's `openQuestions`; the main ones: TOS modal on the
island, side quest copy review and publish order, who reviews side quests,
the production web role password and pooler user, and the Discord Activity
path.

## Review fixes (PR #268)

Applied after the first review, before merge:

- **Staff and the guild.** Staff skip only the student-role and pilot checks;
  everyone must be in the SHIFT server (`viewer.ts`), failing closed.
- **One main call to action.** The keynote card sits above the Today card.
  With nothing open it offers the lowest available main quest
  (`starterQuest`, "เริ่มที่: {title}"); a quest waiting on a mentor reads
  "รอพี่เลี้ยงดู: {title}" with no duplicate chip. The check-in is a quiet
  button "เช็กอินวันนี้", never "ทำต่อ".
- **Main quests can be started** (`shift_quest_milestone_start`, sharing
  `shift_quest__milestone_open` with `shift_quest_milestone_submit`).
- **A submitted quest** shows "ส่งแล้ว รอพี่เลี้ยงดูอยู่" with the form behind
  a quiet "ส่งฉบับใหม่". **A paused quest** shows a resume button
  (`shift_quest_resume`) instead of a form that would fail.
- **Legend under the ring**: icon and name of each main quest, two columns;
  branch headings carry their main quest's icon; side quests never reuse a
  main quest icon (new sprites bubble, eye, star).
- **Drafts survive a swipe**: proof, propose and stuck text live in a
  tab-memory store (`drafts.ts`) until sent.
- **Phones**: vertical swipes on the island scroll the page
  (`touch-action: pan-x pinch-zoom` under 1024px); fitted hotspots drop the
  48px floor; a failed picture recovers with the next picture or a retry;
  own plot outlined, a tap hint, and the own-plot sheet links to the board.
- **Gates** link into Discord (`shiftDiscordUrls`): the invite (or server)
  when not in the server, the server when the role is missing. Start and
  no-project screens offer a quiet account switch.
- **TOS modal** is skipped on every `/shift` route (`isShiftPath`); whether
  students need their own consent step is open for the founder.
- **Stuck sheet** says who will read the request, per audience.
- **Database**: side quests are `not_repeatable` per project
  (`shift_quest_choose`); a teammate's approval never strands the caller's
  own open side quest (`shift_quest__side_open` order); caps on help and
  proposals (`too_many_open`); draft seed icons and `side-share-a-lesson`
  branching off main quest 3. Schema 4.
- **Refusals that mean a stale page** refresh it in the same response.
- **Bot link button**: http://localhost only with `SHIFT_ISLAND_URL_ALLOW_HTTP=1`.

## Immersive island, story, quest page, canvas submission

Wave 3, for the pilot on Saturday 14 Nov. Founder decisions: **no AI anywhere**
(no AI calls, no "copy for AI" button), a short story on the first visit, a
living island, a quest page without a wall of text, and submission straight
from the student's SHIFT canvas on the whiteboard
(`docs/features/whiteboard.md`, "SHIFT project canvas and note versions").
Everything that works today keeps working: board, stuck, propose, check-in, the
bot link, eligibility, the bot's PNG and its pinned hash.

### Builders and files (disjoint)

| Builder | Owns (nobody else edits these) |
|---|---|
| art | `bot/assets/island/motion-sprites.ts` (new), `bot/assets/island/motion-preview.ts` (new), `bot/src/quests/__tests__/motion-sprites.test.ts` (new), `components/shift/island/sprites.ts` (new web icons only), `.gstack/tmp/art/**` (previews, gitignored) |
| living-island | `bot/src/quests/island/scene.ts` (new), `bot/src/quests/island/render.ts`, `bot/src/quests/__tests__/island.test.ts`, `bot/src/quests/__tests__/scene.test.ts` (new), `lib/shift-island/picture.ts`, `lib/shift-island/__tests__/picture.test.ts`, `lib/shift-island/live/**` (new), `components/shift/island/live/**` (new), `components/shift/island/IslandViewport.tsx`, `components/shift/island/__tests__/IslandViewport.test.tsx`, `app/api/shift/island/map/route.ts` |
| story | `components/shift/island/story/**` (new), `components/shift/island/StartCard.tsx`, `components/shift/island/__tests__/StartCard.test.tsx` (new) |
| quest-page | `components/shift/island/QuestDetailSheet.tsx`, `IslandSheet.tsx`, `IslandApp.tsx`, `NoProject.tsx` (anchor id only), `model.ts`, `copy.ts`, `island.module.css`, `components/shift/island/__tests__/QuestDetailSheet.test.tsx`, `components/shift/island/__tests__/copy.test.ts`, `components/shift/island/__fixtures__/board.ts`, `app/shift/island/page.tsx` |
| canvas-submit | `supabase/migrations/20261111091100_shift_quest_canvas_links.sql` (new), `supabase/tests/shift_quests/web_canvas.ts` (new), `supabase/tests/shift_quests/web_board.ts`, `supabase/tests/shift_quests/run-local.sh`, `lib/supabase/shift-quests/{types,db,viewer,page,validate,errors}.ts`, `lib/supabase/shift-quests/canvas.ts` (new), `lib/supabase/shift-quests/canvas-snapshot.ts` (new), `lib/supabase/shift-quests/__tests__/**`, `lib/shift-island/quest-canvas.ts` (new), `lib/shift-island/__tests__/quest-canvas.test.ts` (new), `app/shift/island/actions.ts`, `components/shift/island/canvas/**` (new), `docs/features/shift-high-quests.md` (schema 5 runbook line) |

Shared-file rule: the owner writes the shared module first (types and stubs
compile before anything else), then fills it in. Each builder keeps its Thai
copy in its own module (`story/copy.ts`, `canvas/copy.ts`,
`lib/shift-island/quest-canvas.ts`, `copy.ts` for quest-page) and adds a
`lintText` test for it, because `copy.test.ts` only scans `copy.ts`. Each new
UI area gets its own CSS module; only quest-page edits `island.module.css`.

### Architecture

```
server (page render)                                   client
--------------------                                   ------
getIslandPage(viewer)  + shift_quest_canvas_get ──▶ page.canvasLink {linked, linkedAt}
islandPicture(map)     + buildScene(plots) ─────────▶ picture.scene (tiles string, trees, tags)
                                                       IslandViewport: <img> SSR first paint
                                                         └ IslandLive (next/dynamic, ssr:false)
                                                             one <canvas>, atlas drawImage,
                                                             sea/foam/boat/gulls/clouds/sway,
                                                             Bangkok light, pause off-screen

quest sheet opens ──▶ action loadQuestCanvas(ref) ──▶ canvas.ts (service role, after getUser)
                        re-verify link (board member + owner/editor + same project)
                        read ONE board, pre-filter to the frame, summarizeElements
                      ◀── QuestCanvasContext (no user ids, no comments)
ส่งเควสต์ ──▶ composer ──▶ action submitQuestCard({ref, notes:[{id,hash}], line, link})
                        re-read + re-verify + hash check + zone check
                        snapshot text (≤ 2000) ──▶ existing submit function
```

- **One scene, two rasterizers.** `scene.ts` (pure, no node or DOM) builds the
  display list; `renderIsland` rasterizes it to PNG exactly as today (pinned
  hash unchanged), and the web draws the same scene on a canvas with motion
  sprites. Hotspots still come from `plotBoxes`. Lighting and motion exist
  only on the web.
- **The link lives in the quest DB** (one row per quest project, shared by
  teammates, because teammates share one open quest per milestone). It is never
  trusted: every read and submit re-verifies it against the whiteboard.
- **Snapshot into existing columns.** The quest card is rendered server-side
  as text into `evidence`; the line goes to `reflection`; the link to
  `artifact_url`. No change to review, export, erase or the bot.

### Shared contracts (exact)

`bot/src/quests/island/scene.ts` (living-island, written first):

```ts
export const TILE_CODES = { water_a: "a", water_b: "b", sand: "s", sand_b: "t", grass_a: "1", grass_b: "2",
  grass_c: "3", plaza: "p", shore_n: "N", shore_s: "S", shore_e: "E", shore_w: "W" } as const;
export type TileKey = keyof typeof TILE_CODES;
export interface ScenePoint { x: number; y: number }
export interface SceneTree { slot: number; stage: number; sprite: string; left: number; top: number; w: number; h: number;
  key: ScenePoint | null; visitor: ScenePoint | null; lantern: ScenePoint | null; mine: boolean }
export interface SceneTag { slot: number; x: number; y: number; w: number; h: number }
export interface IslandScene {
  v: 1; cols: number; rows: number; tile: 16; width: number; height: number; glyph: number;
  tiles: string;            // cols*rows chars, row-major, TILE_CODES values
  paths: number[];          // cell indexes (y*cols+x) where "path" is drawn, in draw order
  well: ScenePoint; banner: ScenePoint | null; boatStill: ScenePoint;
  trees: SceneTree[]; tags: SceneTag[];
  marker: { x: number; y: number; scale: number } | null;
  lanes: { boatY: number; gullY: number };   // boatY inside the bottom 2 water rows, gullY in the top 2
}
export function buildScene(plots: IslandPlot[], options?: { markMine?: boolean; festival?: boolean }): IslandScene;
```

`render.ts` keeps `export * from "./scene"` so `picture.ts` and its jest mock
keep importing from `@/bot/src/quests/island/render`.
`IslandPicture` gains `scene: IslandScene | null`.

`bot/assets/island/motion-sprites.ts` (art, a compiling stub first: every
frame a copy of its frame 0):

```ts
export type MotionSpriteName =
  | "water_a_1" | "water_a_2" | "water_b_1" | "water_b_2"
  | "shore_n_1" | "shore_n_2" | "shore_s_1" | "shore_s_2" | "shore_e_1" | "shore_e_2" | "shore_w_1" | "shore_w_2"
  | "boat_1" | "gull_0" | "gull_1" | "cloud_a" | "cloud_b"
  | "stage_2_b" | "stage_3_b" | "stage_4_b" | "stage_5_b" | "stage_6_b" | "stage_7_b"
  | "lantern_glow_0" | "lantern_glow_1" | "lamp_post" | "festoon"
  | "builder_0" | "builder_1" | "tester_0" | "tester_1";
export const MOTION_SIZES: Record<MotionSpriteName, [w: number, h: number]>;
export const MOTION_SPRITES: Record<MotionSpriteName, string[]>;   // PALETTE keys only, "." transparent
export const WATER_FRAMES: Record<"water_a" | "water_b", readonly [string, string, string]>;  // [base, _1, _2]
export const SHORE_FRAMES: Record<"shore_n" | "shore_s" | "shore_e" | "shore_w", readonly [string, string, string]>;
export const SWAY_FRAMES: Readonly<Record<string, MotionSpriteName>>;  // "stage_2" -> "stage_2_b" ... stage_7
export const ACTOR_FRAMES: { boat: readonly ["boat", "boat_1"]; gull: readonly ["gull_0", "gull_1"];
  builder: readonly ["builder_0", "builder_1"]; tester: readonly ["tester_0", "tester_1"];
  lanternGlow: readonly ["lantern_glow_0", "lantern_glow_1"] };
```

Sizes: water and shore frames 16x16, boat_1 20x12, gull 8x5, cloud_a 48x16,
cloud_b 32x12, stage_N_b 32x40, lantern_glow 16x16, lamp_post 6x16, festoon
48x8, builder and tester 10x14. `components/shift/island/sprites.ts` gains
`WebIcon` keys `"book" | "send" | "sos" | "link"` (16x16).

`lib/shift-island/live/types.ts` and `components/shift/island/live/IslandCanvas.tsx` (living-island):

```ts
export type LightPhase = "dawn" | "day" | "dusk" | "night";
export interface LiveActor { frames: readonly string[]; x: number; y: number; frameMs?: number; flip?: boolean }
export interface IslandCanvasProps {
  scene: IslandScene;
  phase?: LightPhase | "auto";        // default "auto" = Bangkok time, decided after mount
  paused?: boolean;                   // true stops every timer
  still?: boolean;                    // one frame, no loop (reduced motion forces it)
  actors?: LiveActor[];               // extra sprites (story), native px, drawn above trees
  ambient?: boolean;                  // boat, gulls, clouds (default true)
  crop?: { x: number; y: number; w: number; h: number };   // native px; default whole scene
  className?: string;
  onReady?: () => void;               // first frame drawn
  onFail?: () => void;                // no 2D context or an exception: caller keeps its fallback
}
export default function IslandCanvas(props: IslandCanvasProps): JSX.Element;  // "use client"
export function bangkokPhase(nowMs: number): LightPhase;  // in lib/shift-island/live/lighting.ts
```

`IslandViewport` gains `paused?: boolean`.

`lib/shift-island/quest-canvas.ts` (canvas-submit, client-safe, written first):

```ts
import type { ShiftCardKind } from "@/lib/whiteboard/shift-cards";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";

export type CanvasLinkState = { linked: false } | { linked: true; linkedAt: string };
export interface QuestGuideItem { id: string; label: string }
export interface QuestGuide {
  zones: ShiftCardKind[];             // notes the card may use; [] = line + link only (SubmitForm)
  checklist: QuestGuideItem[];        // at most 3
  examples: string[];                 // main quests only (side quests use board examples)
}
export function questGuide(q: { kind: BoardRef["kind"]; slug: string | null }): QuestGuide;
export interface CanvasChoice { boardId: string; frameId: string; title: string; boardTitle: string;
  role: "owner" | "team"; lastEdited: number | null; notes: number; versions: number; linked: boolean }
export interface ContextRow { kind: ShiftCardKind; label: string; text: string | null; version: number | null; count: number | null }
export interface ChecklistHint { id: string; hinted: boolean; detail: string | null }
export interface PickableNote { id: string; kind: ShiftCardKind; day: number | null; zoneTitle: string;
  text: string; version: number | null; editedSinceVersion: boolean;
  history: { v: number; why: string | null }[];   // newest first, at most 3
  byTeam: boolean; pii: boolean; hash: string }
export type QuestCanvasContext =
  | { state: "unlinked" } | { state: "no_zones" } | { state: "not_yours" } | { state: "error" }
  | { state: "gone"; candidates: CanvasChoice[] }
  | { state: "ready"; canvas: { title: string; boardTitle: string; lastEdited: number | null };
      context: ContextRow[]; hints: ChecklistHint[]; notes: PickableNote[] };
export interface QuestCardTarget { ref: BoardRef; slug: string | null; title: string; reflectionPrompt: string;
  version: number | null; resubmit: boolean }
export const CARD_LIMITS = { notes: 8, line: 2000, link: 500, evidence: 2000, noteChars: 400, why: 140 } as const;
```

`IslandPageData` gains `canvasLink: CanvasLinkState`. The `not_started` and
`ready` viewer variants gain `userId: string` (server-only, like `actor`).

canvas-submit components (`components/shift/island/canvas/`):

```ts
export function useQuestCanvas(target: { ref: BoardRef; slug: string | null } | null, link: CanvasLinkState):
  { context: QuestCanvasContext | null; loading: boolean; reload: () => void };
export function CanvasLinkSheet(props: { open: boolean; link: CanvasLinkState; onClose: () => void; onLinked: () => void }): JSX.Element;
export function QuestCardComposer(props: { target: QuestCardTarget; context: Extract<QuestCanvasContext, { state: "ready" }>;
  onReload: () => void; onSubmitted: () => void; onCancel: () => void }): JSX.Element;
```

Server actions in `app/shift/island/actions.ts`: `listMyCanvases()`,
`linkCanvas({boardId, frameId})`, `unlinkCanvas()`,
`loadQuestCanvas({ref, slug})`, `submitQuestCard({ref, slug, version?, notes: {id, hash}[], line?, link?})`.
Reads never call `refresh()`.

Story (`components/shift/island/story/StoryLauncher.tsx`):

```ts
export function StoryLauncher(props: { demoDay: string | null; cta: "start" | "claim" | "island"; onCta?: () => void }): JSX.Element;
// Renders the small book button; opens the overlay by itself on the first visit (localStorage "shift-island-story-v1").
```

### Story (first visit, about 15 s, skippable)

A full-screen Dawn overlay (`role="dialog"`, `aria-modal`, focus trapped,
Escape closes) with one pixel panel drawn by `IslandCanvas` from synthetic
scenes (`buildScene` with made-up plots, `markMine: false`), one Thai line in
Kodchasan 600 below it, four 6px pixel dots, and "ข้าม" top right. Each panel
holds 3.6 s, then a hard cut (no slide, no zoom). A tap on the panel goes to the
next one. The last panel waits for its button. Seen state:
`localStorage["shift-island-story-v1"] = "seen"` on skip, close or CTA (in
try/catch; private mode just shows it again). Decided after mount, so no
hydration mismatch. The book button (pixel `book` icon, 44px target,
`aria-label` "ดูเรื่องเล่าของเกาะอีกครั้ง") re-opens it from the top bar and
from the start card.

| # | Scene | Line (draft) |
|---|---|---|
| 1 | `buildScene([])`, phase dawn, sea moving, gulls, no boat | เกาะนี้ยังว่าง |
| 2 | one plot, stage 1, crop around it, builder actor beside it, day | ทุกโปรเจกต์คือต้นไม้หนึ่งต้น |
| 3 | one plot, stage 5, builder plus tester actor trying something, day | ต้นไม้โตจากงานจริง |
| 4 | 8 plots of mixed stages, 3 lanterns, festival banner and festoon, night | `{d MMM}` เทศกาล Demo Day (no date known: คืนเทศกาล Demo Day) |

CTA on panel 4: not started "ไปที่เกาะ" (closes, focuses เริ่มเลย); no project
"จับจองที่ดิน" (closes, scrolls to the create form); with a project
"ไปที่เกาะ". Skip: "ข้าม". The date comes from `island.season.demo_day` via
`thaiShortDate`, never hardcoded; the not-started screen has no season, so it
shows the undated line. Reduced motion: no auto-advance, still frames, a
"ต่อไป" button. If the canvas fails, each panel shows the matching tree sprite
through `PixelIcon` on the sky colour. No lore, no characters with names, no
lecturing.

### Living island

- **Layers** (redraw order, clipped to the visible rect): sea cells (water and
  shore frames), one blit of an offscreen land layer (sand, grass, plaza,
  paths, well, banner), boat, trees (sway frame A or B) with key flag, visitor
  and lantern, lantern glow at night (earned lanterns only), plaza lamp posts at
  night, festoon in festival, cloud shadows (`cloud_a/b` at globalAlpha 0.14),
  tags and marker (untinted), gulls.
- **Clock** (pure functions of elapsed ms, tick 125 ms): sea ping-pong 0-1-2-1
  every 3 ticks, foam every 4, boat 1 px per 2 ticks along `lanes.boatY`
  (the sprite faces left, so mirror it when sailing right; about 90 s across, wraps off-screen), 2 gulls 1 px
  per tick with a flap every 2 ticks, clouds 1 px per 4 ticks, sway as gusts
  every 6 to 8 s (1.6 s of A/B flips at 400 ms, delayed by tree x).
- **Light**: `bangkokPhase(now)` from UTC+7: dawn 05:30, day 07:00, dusk
  17:30, night 19:00. Per-phase RGB multiply applied once to the palette when
  building the atlas (day = identity, so daytime matches the PNG). Rechecked
  every 60 s and on `visibilitychange`.
- **Crisp pixels**: `imageSmoothingEnabled = false` everywhere, integer
  coordinates, `image-rendering: pixelated`, and the zoom becomes
  `pxPerNative = max(1, round(2 * dpr)) / dpr` for both img and canvas.
- **Cheap**: `setTimeout` to the next due tick then one `requestAnimationFrame`;
  nothing drawn when nothing visible changed; no `getImageData`, filters,
  shadowBlur or React state per frame. Budget on a low-end Android: at most 8
  ticks/s, at most 2 ms per redraw, init under 16 ms for the pilot island.
- **Pauses** with zero timers when off-screen (IntersectionObserver), tab
  hidden, `paused` prop (any sheet open) or reduced motion (one still frame:
  frame 0 sea, sway A, boat at `boatStill`, no gulls or clouds).
- **Fallback**: the SSR `<img>` stays as first paint and is hidden only after
  the first canvas frame; any failure keeps it. Hotspots and the check-in puff
  stay above the canvas (`pointer-events: none` on the canvas).
- **Bot unchanged**: no new render options, sprites.ts and PALETTE untouched,
  `RENDER_REVISION` stays `island-1`, `PINNED_6` stays.

### Quest page (sheet)

Order on a phone, top to bottom; at most one screen before the action bar:

1. Badge: pixel icon plus "เควสต์หลัก {n}/{total}" (n = milestone,
   total = `board.main.length`), "เควสต์เสริม" or "เควสต์ที่คุณเสนอ". Title
   (sheet title). State chip (and help flag).
2. One line of why: the quest's `purpose`, clamped to 2 lines.
3. Mentor feedback when there is a review: "พี่เลี้ยงบอกว่า: {feedback}".
4. **สำหรับโปรเจกต์คุณ** (only for quests whose guide has zones): rows of
   `{zone emoji from SHIFT_CARDS} {label}: {note, 2-line clamp} v{n}` or a
   count ("{n} ใบ"), "ยังไม่มีโน้ต" when empty. States:
   - not linked: one card "เชื่อมแคนวาส" / "เลือกแคนวาสโปรเจกต์ของคุณบนไวท์บอร์ด แล้วเควสต์จะดึงโน้ตของคุณมาให้" / button เชื่อมแคนวาส
   - not on the canvas team: "คุณยังไม่ได้อยู่ในทีมของแคนวาสนี้ ขอให้เจ้าของแคนวาสเพิ่มคุณในทีมก่อน"
   - gone: "หาแคนวาสที่เชื่อมไว้ไม่เจอ อาจถูกลบหรือย้ายไปแล้ว" / button เลือกใหม่
   - error: "โหลดโน้ตจากแคนวาสไม่ได้ตอนนี้ ส่งแบบเขียนเองได้เลย"
   - loading: a 3-row pixel skeleton
5. **เสร็จเมื่อ**: at most 3 items with a pixel check that lights when a
   hint matches, plus one quiet line "ติ๊กให้จากโน้ตในแคนวาส พี่เลี้ยงเป็นคนดูและตัดสิน".
   Quests without a guide show `evidence_criteria` as the single item, unticked.
6. Collapsed rows (`<details>`): "ตัวอย่างที่ผ่าน" (main: `questGuide().examples`;
   side: board `examples`), "รายละเอียดทั้งหมด" (evidence criteria and the
   reflection prompt).
7. Status notices exactly as today (locked, held, appealed, done, closed,
   paused with resume, submitted waiting).
8. **Sticky bar** (IslandSheet `footer`): [ส่งเควสต์] primary with the `send`
   icon and [ติด] quiet with the `sos` icon. Hidden send when the action is
   not a form. ส่งเควสต์ opens, inside the same sheet, the quest card composer
   when the context is `ready` and the guide has zones, otherwise the existing
   `SubmitForm` (unchanged). "เขียนเองแทน" in the composer switches to
   `SubmitForm`.

Emoji appear only from `SHIFT_CARDS` data (so they match the whiteboard);
buttons use pixel icons; `copy.ts` stays emoji-free.

### Quest guides and zones (`questGuide`)

| Quest | Zones | Context rows (label) | เสร็จเมื่อ (hint rule) |
|---|---|---|---|
| m1 หาเรื่องที่คุ้มค่าจะแก้ | problem, target, interview | ปัญหาตอนนี้ (problem latest) · คนที่เจอ (target) · คุยแล้ว (interview count) | เขียนปัญหาที่เลือก (problem written) · รู้ว่าใครเจอปัญหานี้ (target written) · คุยหรือสังเกตคนจริงอย่างน้อย 1 คน (interview ≥ 1) |
| m2 ทำให้มันมีอยู่จริง | idea, ship | ปัญหาที่แก้ (problem) · ไอเดีย (idea vN) · ปล่อยแล้ว (ship) | มีไอเดียที่บอกว่าแก้ปัญหาข้อไหน (idea written) · มีชิ้นงานที่คนอื่นลองได้ (ship written) · บอกเหตุผลของการตัดสินใจหลัก (no hint) |
| m3 ให้ความจริงทำให้คุณแปลกใจ | test, pivot | ลองกับ (target) · สิ่งที่จะให้ลอง (idea vN) · ลองแล้ว (test count) | มีคนจริงลองงานของคุณ (test ≥ 1) · จดสิ่งที่ไม่ตรงกับที่คิด (no hint) · บอกว่าจะเปลี่ยนอะไร (pivot ≥ 1 or idea has v2+) |
| m4 ทำให้เขาอยากกลับมา | test, pivot | งานตอนนี้ (ship vN) · ผลทดสอบล่าสุด (latest test) · เปลี่ยนแผนแล้ว (pivot count) | ลองปรับหนึ่งอย่าง (pivot ≥ 1 or ship v2+) · ดูว่าใครกลับมา (test ≥ 1) · บอกสิ่งที่เรียนรู้ ถึงไม่มีใครกลับมาก็นับ (no hint) |
| m5, m6, m7 | none (line + link; quest 5's ownership checklist is not on the web allowlist) | none | 3 items from the evidence criteria, no hints |
| side-five-voices | interview, target | | |
| side-outside-circle | test | | |
| side-fix-one-thing | test, pivot | | |
| side-open-on-phone, side-thirty-second-cut, side-clear-offer | ship, idea | | |
| side-demo-three-minutes | problem, idea, ship | | |
| other side, proposed | none | | |

Side rows show the zones' latest notes; side checklists are the evidence
criteria (one item). Main examples are copied (draft) from the starter
templates' `examples` column (`090500`), because `shift_quest_board` returns
none for main quests.

### Canvas link (picker sheet)

Title "เชื่อมแคนวาส", description "เห็นเฉพาะแคนวาสที่คุณเป็นเจ้าของหรืออยู่ในทีม".
One row per canvas: title, "บอร์ด {board} · แก้ล่าสุด {date} · โน้ต {n} ใบ",
chip "เจ้าของ" or "ทีม", "เชื่อมอยู่" on the current one. Button
"เชื่อมแคนวาสนี้"; quiet "เลิกเชื่อม". Fine print "เพื่อนในทีมเควสต์จะเห็นโน้ตเมื่ออยู่ในทีมของแคนวาสด้วย".
Empty: "ยังไม่มีแคนวาสที่คุณเป็นเจ้าของหรืออยู่ในทีม สร้างแคนวาสโปรเจกต์บนไวท์บอร์ดก่อน" with a
link "เปิดไวท์บอร์ด" (`/whiteboard`). The list loads only when the sheet opens.

### Quest card composer

- Heading "การ์ดเควสต์". "เลือกโน้ตที่จะส่ง (สูงสุด 8 ใบ)", grouped by zone
  (emoji and Thai short title from `SHIFT_CARDS`), each a sticky in its
  whiteboard colour with a 2px ink outline and hard pixel shadow, a checkbox,
  "v{n}" and the latest "เปลี่ยนเพราะ {why}" lines, "แก้หลัง v{n}" when
  edited since the last version, "โน้ตจากคนนอกทีม" when the author is not
  the canvas owner or team.
- Line: label is the quest's reflection prompt, placeholder "ตอบสั้นๆ หนึ่งบรรทัด (ไม่บังคับ)".
  Link: "ลิงก์งาน (ไม่บังคับ ขึ้นต้นด้วย https://)".
- Always: "อย่าใส่ชื่อจริง เบอร์โทร หรือช่องทางติดต่อของคนที่ลองงานคุณ".
  Per flagged note: "โน้ตนี้อาจมีเบอร์โทร อีเมล หรือไอดีของใครบางคน แก้ในแคนวาสก่อนส่งดีกว่า".
  Never edits the text.
- Preview "หน้าตาที่พี่เลี้ยงจะเห็น": the pixel card (the same text the server
  will store, built by the same pure function), a meter "{n}/2000" and
  "บางโน้ตยาวเกิน จะถูกตัดท้าย" when cut. "ส่งแล้วการ์ดนี้จะไม่เปลี่ยน ถึงจะแก้โน้ตในแคนวาสทีหลัง".
- Bar: [ส่งให้พี่เลี้ยงดู] (or ส่งฉบับใหม่) and quiet [กลับ]. On
  `notes_changed`: "โน้ตในแคนวาสเพิ่งเปลี่ยน ดูการ์ดอีกครั้งแล้วค่อยส่ง" and
  a reload.
- Ticked ids, line and link persist in `useDraft("card:" + refKey)`.

Snapshot text (`canvas-snapshot.ts`, deterministic, at most 2000 code points):

```
การ์ดเควสต์จากแคนวาส: {canvas title, 80}
{for each ticked note, in zone order}
{emoji} {Thai zone title}{ day N}{ v{n}}{ (โน้ตจากคนนอกทีม)}
{note text, trimmed, cut at the note budget with "…(ตัด)"}
v{n-1} → v{n} เปลี่ยนเพราะ: {why, 140}     (at most 2 lines)
```

Note budget = min(400, floor((2000 - header) / count)). The note hash is
FNV-1a (53-bit, hex) of `{latest version}|{raw text}`: change detection only,
so the snapshot builder stays isomorphic and the composer previews the exact
stored text. Empty line: the
server stores "ส่งเป็นการ์ดเควสต์ ไม่ได้เขียนเพิ่ม" as the reflection,
because the database requires one. Never author ids, Discord ids or comments.

### Data and privacy model

- Migration `20261111091100_shift_quest_canvas_links.sql` (quest DB, additive,
  idempotent): table `shift_quest_canvas_links(project_id uuid PK → shift_quest_projects ON DELETE CASCADE,
  board_id uuid NOT NULL, frame_id text 1..100, canvas_project text 1..100,
  linked_by uuid NULL → shift_quest_members ON DELETE SET NULL, linked_at, updated_at)`,
  RLS on with no policies, revoked from PUBLIC, anon, authenticated, granted to
  service_role. No canvas title or text stored. Functions
  `shift_quest_canvas_get(text)`, `shift_quest_canvas_link(text, uuid, text, text)`,
  `shift_quest_canvas_unlink(text)`; on the web allowlist (migration,
  `run-local.sh` `web_allow`, `web_board.ts`); `shift_quest_schema_version()`
  returns 5; web `REQUIRED_SCHEMA = 5`; bot stays 2.
- Reads of whiteboards use `createAdminClient()` only after
  `resolveIslandViewer()` returned ready, and never `loadBoard`, `openBoard`
  or `roleFor` (they write `last_opened_at` or let site admins in).
- **Verify on every read and submit** (`verifyLink`, pure): board exists; the
  user is `owner_id` or has a `whiteboard_members` row; a live frame with that
  id passes `isProjectFrame`; `accessOf(frame)` lists the user as owner or
  editor (never `canEditCanvas`, which lets moderators in);
  `customData.project === canvas_project`. Otherwise `gone`, `not_yours` or
  `retagged`. A lost link is never re-pointed automatically: candidates with the
  same project are offered.
- Never sent to the browser: Supabase user ids, owner or editor ids, version
  `by`, `createdBy`/`updatedBy`, comments, anything outside the linked frame.
- The browser sends only ids, hashes, the line and the link. The server
  re-reads the canvas and builds the text, checks each note is live, inside a
  zone of the linked frame, of a zone kind mapped to that quest, and that its
  hash matches (`noteHash`, see above).
- Tester privacy: the regex pass flags phones (Thai 0x and +66), emails,
  LINE ids and @handles; warn only.
- Logs: codes only, never note text, ids of boards are fine.
- Safeguarding: no new channel; the card goes to mentor review in the group
  queue as today.

### Test plan (wave 3)

Automated, from the worktree:

1. `pnpm exec jest bot/src/quests lib/shift-island lib/supabase/shift-quests components/shift/island app/shift/island`:
   pinned `PINNED_6` unchanged; `renderIslandPng` identity; scene vs
   `plotBoxes` and picture size; tree rect inside its hotspot; motion sprite
   sizes, palette keys, seam edges, soil rows, no key clashes;
   `bangkokPhase` boundaries in UTC+7 whatever the device zone; clock frame
   math; IslandViewport with the live layer mocked (img still 960 wide) and
   with a null 2D context (img kept); story auto-open once, skip, re-open,
   CTA, reduced motion, undated panel 4; quest sheet badge, context states,
   checklist hints, collapsed rows, sticky bar, SubmitForm fallback, every
   copy module through `lintText`; `verifyLink` matrix (owner, editor, removed
   editor, handed over, deleted frame, retagged, moderator only, duplicated
   board, legacy createdBy owner, not a member); frame pre-filter equals full
   `summarizeElements`; snapshot budget and cuts; PII regex; every new action's
   validation, refusals and that reads do not refresh.
2. `pnpm test:db:quests`: new `web_canvas.ts` (link, relink, unlink, project
   member gate, teammate shares the link, cascade on project delete, web role
   can execute exactly the allowlist, schema 5, RLS on).
3. `pnpm exec tsc --noEmit -p tsconfig.json` filtered to touched files;
   `pnpm exec tsc --noEmit -p bot/tsconfig.json`.
4. `rtk proxy pnpm lint`.
5. Placeholder-env build (no DB, no Discord, no Supabase at import).

Manual (founder, after the integrator applies 091100 to the sandbox on
55451; the dev server keeps running): phone-sized window at
http://localhost:3000/shift/island. Story shows once, book re-opens it. The
sea moves, the boat crosses, trees sway; switch the clock to 20:00 Bangkok and
see night with only earned lanterns glowing; turn on reduced motion and see a
still island; open a sheet and see the island pause. Open quest 3: unlinked
prompt, link your own SHIFT canvas, see target and idea notes in
สำหรับโปรเจกต์คุณ, ticks on เสร็จเมื่อ, send a card with two notes,
check the stored evidence in the sandbox, edit a note on the whiteboard and
confirm the stored card did not change. Check DevTools Performance at 6x CPU
throttle with the island in view.

## Full-screen island (HUD)

Founder feedback after the first try: "island page should be full IMMERSIVE".
`/shift/island` is now a full-screen game, not a page with a picture in it.

- **World** (`IslandViewport`, `lib/shift-island/live/world.ts`): a fixed,
  full-screen scroller (100% of the viewport, `viewport-fit=cover`). The page
  itself never scrolls (`html:has(.world) { overflow: hidden }`). The island is
  drawn at whole device pixels per native pixel: at least the usual ~2x, larger
  when the whole island fits between the HUD bars (capped at 6 CSS px); "ดูทั้งเกาะ"
  (in the menu) fits it at the largest whole scale. The world is never smaller
  than the screen; a bigger island gets a strip of sea on every side so no plot
  has to sit under the HUD. Touch pans natively, a mouse drags to pan (a drag
  never ends in a plot click), focus scrolls with `scroll-padding` clear of the
  bars. It opens centred on the student's plot.
- **Endless sea**: the canvas's crop may reach past the scene. `redrawRect`
  draws open-water tiles there with the same animated frames (the choice comes
  from `openWaterTile` in `scene.ts`, the island's own rule, so there is no
  seam) and foam only at the real shore. The boat, gulls and clouds cross the
  whole frame (`Span` in `clock.ts`), so nothing turns round in sight. The bot's
  PNG is unchanged (pinned hash).
- **Light**: the canvas tints the whole screen; a fixed shade adds a dawn or
  dusk wash and a night vignette.
- **HUD** (`IslandHud.tsx`, `world.module.css`): top left a chip (tree, project
  name, 7-cell stage meter) that opens the project sheet (check-in, stuck, rest,
  season); top right round pixel buttons: the story book, an envelope with the
  unread count (only when there is mail), and a menu (whole island or close
  view, show-name switch, account). Bottom: the keynote quest (the one gold
  element) and the quest board button (wide when there is no keynote). With no
  plot yet: a chip "ยังไม่มีที่ดิน" and one bottom action, จับจองที่ดิน (or the
  invite count), which opens the claim sheet with the name field focused.
- **Sheets** (`HudSheets.tsx` and the existing ones) open over the island,
  which stays in view behind a lighter dim (`bg-black/45`) and is paused. A quest
  opened from the board returns to the board when it closes; one opened from
  the bottom bar returns to the world. The story still plays full screen.
- Gates and the start card keep the Dawn sky and the centred card; the loading
  state is the full-screen sea with the HUD's shapes.

