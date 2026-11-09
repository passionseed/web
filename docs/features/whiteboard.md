# Whiteboard

Our own FigJam-style board at [`/whiteboard`](https://www.passionseed.org/whiteboard), built on
Excalidraw. First used for the SHIFT High community session on 2026-10-24.

## What people can do

- Draw together live: cursors, edits, presence, and follow mode (click someone in the
  top-right list, or open "+N" when it is collapsed).
- Stickies, stamps, 9 templates (including a team check-in), pinned comment threads, emoji reactions, a shared timer,
  import, duplicate, and export.
- Saving is automatic. Ctrl/Cmd+S saves at once. Edits that could not be saved are kept in
  localStorage and replayed on the next visit.
- Version history: named versions any time, plus an automatic snapshot every 30 minutes of
  editing (the newest 100). Restoring is undoable; any version can be copied to a new board.
- Sharing: a link with access off, view, or edit (rotatable), and member roles. Everyone
  needs a PassionSeed account.
- Speaker script (**สคริปต์**, spike): a private timeline of keywords ("5:00 keyword, keyword"
  per line) with a running clock, in its own window (Document Picture-in-Picture, or a popup
  on shift-click or where that is missing). Sharing the tab or browser window in Discord shows
  only the board; sharing the entire screen shows the script too. Kept in localStorage per
  board, so it is only on that browser. Code: `components/whiteboard/script/`,
  `lib/whiteboard/script.ts`.

## Running a session

1. Sign in and open **Whiteboard** in the top menu.
2. Create a board, or start from a template.
3. Click **Share**, leave link access on "edit", and send the link to the group.
4. Everyone needs a PassionSeed account. The link asks them to sign in, shows which board
   they are joining, and then opens it. First-timers use the same Google or Discord button.

People who have not finished onboarding are sent to `/onboard` first and lose the board link
(the onboard gate in `utils/supabase/proxy.ts` drops the path and query). Send them the link
again afterwards.

## How it works

| Piece | Where |
|---|---|
| Pages | `app/whiteboard/` (list, board, share link) |
| API | `app/api/whiteboards/` |
| Database access | `lib/supabase/whiteboards.ts` (role check, then service role) |
| Pure logic and schemas | `lib/whiteboard/core.ts`, `lib/whiteboard/templates.ts` |
| Editor and sync | `components/whiteboard/` (`useWhiteboardSync.ts` is the core) |
| Schema | `supabase/migrations/20261023120000_whiteboards.sql`, `20261025120000_whiteboard_changes.sql` |
| Link previews | `lib/og/whiteboard.tsx`, `app/whiteboard/**/opengraph-image.tsx` |

- **Tables** (`whiteboards`, `whiteboard_members`, `whiteboard_files`, `whiteboard_versions`,
  `whiteboard_comments`) are admin-only under RLS. Routes check the caller's role with
  `guardBoard`, then use the service role, like the alumni board.
- **Saving:** clients send only changed elements. `whiteboard_merge_elements` merges them
  atomically (highest element version wins) and takes the automatic snapshots.
- **Realtime:** a private Supabase channel `whiteboard:<id>`, authorised by RLS on
  `realtime.messages`. Viewers may only send `cursor` events and presence, so cursors and the
  follow-mode viewport share the `cursor` event. Follow state lives in presence, one entry per
  browser tab.
- **Keeping it smooth:** every Excalidraw update re-renders the whole editor, and its
  `onChange` fires on every one (each cursor, each frame of a drag). So incoming cursors and
  edits are applied at most once per animation frame, the localStorage backup runs at most
  once a second, the thumbnail waits until nobody has edited for 3 seconds, and overlays
  (`useViewportTick`) re-render only when the view or elements actually change. Keep props
  passed to `<Excalidraw>` stable: it skips re-rendering only when they are unchanged.
- **Authorship:** every element carries `customData.createdBy` and `customData.updatedBy`
  (user ids), recorded from 2026-10-24. The server sets `updatedBy` on save. Elements from
  before then have no author.
- **Change history:** `whiteboard_merge_elements` also writes one `whiteboard_changes` row per
  save (from 2026-10-25): which elements the saver added, edited (with the old text), moved or
  restyled, or deleted. The saver is the `customData.updatedBy` the API stamps. Admins see it in
  the board's **ใครทำอะไร** (Activity) tab, grouped into sessions per person
  (`lib/whiteboard/activity.ts`), and can turn on name tags over every note
  (`AuthorsLayer.tsx`). `GET /api/whiteboards/<id>/activity` is admin-only.
- **Share links:** `/whiteboard/join/<token>` renders (so chat apps read the preview tags) and
  hands off to `/whiteboard/join/<token>/enter`, which signs in, joins, and redirects with a
  real 307. Don't call `redirect()` from a whiteboard page: every page streams because of
  `app/loading.tsx`, and a mid-stream redirect can crash Next's client router ("This page
  couldn't load"). Signed-out visits redirect in `utils/supabase/proxy.ts`, keeping `?next=`.
  `/login` shows the board being joined when `next` is a whiteboard path.

## Board apps (plugins) and the community calendar

- **Apps menu (แอป):** board windows like FigJam plugins, in `components/whiteboard/plugins/`.
  A plugin is one entry in `registry.tsx` (`BoardPlugin`: id, name, icon, size, Component).
  `PluginHost` renders the open ones as draggable windows; which are open and where is kept
  in localStorage per board. A plugin gets the Excalidraw API, the board, and
  `broadcast` / `onBroadcast` over the board's realtime channel (event `plugin`, filtered by
  plugin id), so it can tell everyone's copy to refresh. Viewers can't broadcast (RLS).
- **Widgets on the canvas:** an app with a `widget` size can also be placed on the board,
  where everyone sees it and it moves and zooms with the canvas (like a FigJam widget). It is
  an Excalidraw `embeddable` element whose link is `lib/whiteboard/widgets.ts`'s
  `https://www.passionseed.org/whiteboard/widget/<id>`; `validateEmbeddable` allows that link
  and `renderEmbeddable` draws `plugins/BoardWidget.tsx` instead of an iframe. Its body takes
  clicks right away (it overrides Excalidraw's "click the middle to activate"); drag its title
  bar to move it. Editors place widgets from the Apps menu; the
  window icon next to an app opens it as a private window instead.
- **Calendar plugin and `/calendar`:** community time blocks (`calendar_blocks`,
  `calendar_block_people`, migration `20261025140000_calendar_blocks.sql`). Anyone signed in
  adds blocks and says "ไปด้วย"; everyone signed in sees every block and who joined (a group
  space). Only the creator or an admin edits. Only a board's owner can attach their board's
  share link to a block. The weekly SHIFT alumni session and the viewer's alumni team meetings
  are merged in read-only. Times are Bangkok. Code: `lib/calendar/core.ts` (schema, Bangkok
  time, week layout), `lib/supabase/calendar.ts`, `app/api/calendar/`, `components/calendar/`.

- **Announcing blocks** (`/admin/calendar`, `lib/calendar/notify.ts`,
  `lib/supabase/calendar-notify.ts`, migration `20261025160000_calendar_notify.sql`):
  - *Instagram group:* Instagram's API has no group chats (only 1:1 business DMs inside a
    24-hour window), so nothing posts automatically. Each block has **แชร์ลงกลุ่ม IG**: the
    phone share sheet, or on a computer copy the filled-in message and open the group's
    `instagram.com/direct/t/…` link from settings (that link only opens for members; join
    links are rejected). Links point to `/calendar?block=<id>`.
  - *Discord:* a channel webhook (kept server-side only) gets a post when a block is added and
    reminders before it starts. Reminders run in Postgres: pg_cron job `calendar-reminders`
    every 5 minutes calls `calendar_send_reminders()`, which posts through pg_net and logs each
    notice in `calendar_block_notices` so it is sent once. Mentions are always off.

- **Rooms for booked sessions** (migration `20261025180000_calendar_rooms.sql`): a block can
  name one of the Discord voice rooms admins list at `/admin/calendar`, and new blocks get a
  room board made from the `room` template (Arrive, Help, Close). The block, its reminders and
  the IG message link the voice room next to the board. There is no voice bot: attendance is
  read from **room cards** (`lib/whiteboard/cards.ts`: Arrive 👋, Help 🙏, I can help 🙋,
  Close ✅), which are in the board kit and the Library and are tagged in `customData.card`.
  A card counts for whoever placed it (`createdBy`); the template's example cards count only
  once someone writes on them. `lib/calendar/attendance.ts` turns that into counts (booked vs
  arrived, walk-ins, help asked and given, closed with a next step), shown on the block once
  it starts and at `/admin/calendar` for the last 90 days. Nothing per person is stored, and it
  shows who used the board, not who spoke in voice.

## SHIFT cards, project frames and versions

SHIFT and SHIFT High students log their project on the board itself, so mentors (and an AI
reading the board) can follow each student without forms. Code: `lib/whiteboard/shift-cards.ts`,
`components/whiteboard/shift/`.

- **SHIFT tab in the board kit** (also in the 📚 Library): nine typed cards. Each is a sticky
  with its name and one question printed on it, then room to write, tagged `customData.card`;
  the author is stamped like every element. Students write freely under the question.
  Excalidraw selects all of a text when editing starts on a laptop, so `useShiftCardCaret`
  moves the caret to the end on SHIFT cards (otherwise the first key wipes the question).
  New cards take the first free card-sized slot near the middle of the screen
  (`freeSlot`), so several clicks lay cards out side by side.

  | Card | Kind | Versions | Matching `shift_round_evidence` type |
  |---|---|---|---|
  | 🎯 ปัญหา · Problem | `problem` | yes | `problem_statement` |
  | 👥 กลุ่มเป้าหมาย · Target user | `target` | yes | `problem_statement` (`user_group`) |
  | 💡 ไอเดีย · Idea | `idea` | yes | `ideas` |
  | 🚀 ปล่อยงาน · Ship | `ship` | yes | `mvp` |
  | 🎤 สัมภาษณ์ · Interview | `interview` | no | `interview` |
  | 🔍 ตัวอย่าง/คู่แข่ง · Reference | `reference` | no | none yet |
  | 🧪 ทดสอบ · Test | `test` | no | `tester` |
  | 🔀 เปลี่ยนแผน · Pivot | `pivot` | no | `change` |
  | 📅 วันนี้ · Daily | `daily` | no | `daily` |

  Rule of thumb: things you believe get versions; things that happened (an interview, a
  test) get a new card each time. A Pivot card's arrows from the interview or test that caused
  it are the "why" of the pivot log.
- **Project frame** (**+ โปรเจกต์**, or the **โปรเจกต์ SHIFT** template): an Excalidraw frame
  tagged `customData.project` with a random id, starting with an empty Problem and Target
  card. A card added from the kit while the screen's centre is inside a project frame joins it.
  The id survives copying the frame to another board, so one project can continue from a SHIFT
  board onto the SHIFT High board. Two frames with the same id on one board (a copy-paste) are
  separate projects. Staff can pre-place one frame per student before a session.
- **Versions** on Problem, Target, Idea and Ship: select the card, click its chip, and
  **เก็บเป็น vN** saves the card's text (up to 5,000 characters), time, author and an optional
  reason (**เปลี่ยนเพราะ**) into `customData.versions` (newest 20 kept, numbers never reused).
  The history shows each version's answer without the question, with lines new since the
  version before marked. The panel is a `.wb-window` dialog on the board's `--wb-*` tokens. It
  syncs, undoes, and travels with the card like any edit, with no extra table. Cards with
  versions show a `v2` chip, plus "แก้อยู่" when the text changed since the last version.
  Every save is also in `whiteboard_changes`, but that is cut to 200 characters and records
  half-typed text, so it is an audit trail rather than versions.
- **Example cards** (the ones a project frame starts with) count only once someone writes on
  them, like the room template's cards.
- **Reading:** `pnpm whiteboard:read <id>` marks project frames as `[SHIFT project]` and
  prints each card as `[🎯 ปัญหา v2] ...` followed by its versions and reasons.

Next: a per-project log and a mentor progress page (`/admin/shift/progress`) that joins these
cards with SeedStack events by user id, then a student "my log" export for the TCAS case study.
No AI appears in the student UI; analysis runs on the Markdown and JSON reads.

## Excalidraw gotchas (0.18)

- `onUserFollow` and `onScrollChange` are API subscriptions
  (`excalidrawAPI.onUserFollow(cb)`), not props. Passing them as props silently does nothing.
- Thai on the canvas comes from Thai-only `@font-face` rules registered under Excalidraw's
  family names (`components/whiteboard/whiteboard.css`). Their weights must match
  Excalidraw's own faces (Nunito is 500), or Latin text falls back to a system font.
- Font files live in `components/whiteboard/fonts/`, not `public/`: the proxy matcher only
  lets images through, so `.woff2` under `public/` redirects to login.
- Thumbnails are WebP. Satori can't decode WebP, so link previews re-encode with `sharp`.

## Reading boards (for people and AI agents)

Read-only, straight from the database with the service role (local only, never exposed by a
route):

```bash
pnpm whiteboard:read                 # list boards, newest first
pnpm whiteboard:read --search retro  # filter by title
pnpm whiteboard:read <board-id>      # one board as Markdown
```

The Markdown lists each area (frame or template zone) with its stickies and text, who wrote
each one (`(by Mint, edited by Beam)`), arrows, and comment threads. Code:
`lib/whiteboard/summary.ts`, `lib/supabase/whiteboard-reader.ts`, `scripts/whiteboard-read.ts`.

Boards hold students' words. Don't paste board content into public places (the company brain
is public): summarise without names.

## Safeguarding

Boards are group spaces. Every member sees the full member list, comments are visible to
everyone on the board, and admins can open any board read-only. There is no private chat.
