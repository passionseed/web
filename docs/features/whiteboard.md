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
| API | `app/api/whiteboards/` (`[id]/elements` returns saved copies of elements, for SHIFT canvas live edits) |
| Database access | `lib/supabase/whiteboards.ts` (role check, then service role) |
| Pure logic and schemas | `lib/whiteboard/core.ts`, `lib/whiteboard/templates.ts` |
| Editor and sync | `components/whiteboard/` (`useWhiteboardSync.ts` is the core) |
| Schema | `supabase/migrations/*whiteboard*.sql` (`20261023120000_whiteboards.sql` first) |
| SQL checks | `pnpm test:whiteboard-sql` (`scripts/whiteboard-sql-check.ts`): every whiteboard migration in a throwaway Docker Postgres, run against the cases in `lib/whiteboard/canvas-trust.cases.ts`; also a CI job |
| Link previews | `lib/og/whiteboard.tsx`, `app/whiteboard/**/opengraph-image.tsx` |

- **Tables** (`whiteboards`, `whiteboard_members`, `whiteboard_files`, `whiteboard_versions`,
  `whiteboard_comments`) are admin-only under RLS. Routes check the caller's role with
  `guardBoard`, then use the service role, like the alumni board.
- **Saving:** clients send only changed elements. `whiteboard_merge_elements` merges them
  atomically (highest element version wins) and takes the automatic snapshots. One save may
  raise an element's version by at most 1,000,000 (`MAX_VERSION_JUMP`), so no one can push an
  element out of reach of later edits. The merge answers with `{ corrected, dropped }`: elements
  it kept differently from how they were sent (owners, authors, note versions) and ids it left
  out. The saver's browser puts its copy right from that answer, where nothing changed since.
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
- **SHIFT canvases stay smooth** (measured on a 2,200-element board with 16 canvases: 120 fps
  dragging, typing and panning, including zoomed right out). The SHIFT overlays recompute only
  when the scene changes (`useSceneMemo`, keyed by scene version, not on pan frames) and step
  aside while something is dragged, resized or drawn (`isBusy`). The browser guard keeps its
  lookup tables up to date one element at a time, so checking an edit costs the size of the
  edit. Each zone's title and question are one label, half the elements per canvas.
- **Authorship:** every element carries `customData.createdBy` and `customData.updatedBy`
  (user ids), recorded from 2026-10-24. The server sets `updatedBy` on save, and Postgres keeps
  `createdBy` from the saved copy (from 2026-11-10; before that a client could rewrite it).
  Something new is created by whoever saves it; if it claims another author (a paste, or a sticky
  someone nudged before its maker's save arrived) that name is kept as `customData.originalBy`,
  shown as "copied from" and never checked, and that person's own next save takes the element
  back. Elements from before 2026-10-24 have no author until someone edits them.
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

- **Apps menu (แอป, in the bottom toolbar next to comments):** board windows like FigJam plugins, in `components/whiteboard/plugins/`.
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
  Close ✅), which are in the board kit (and its Library) and are tagged in `customData.card`.
  A card counts for whoever placed it (`createdBy`); the template's example cards count only
  once someone writes on them. `lib/calendar/attendance.ts` turns that into counts (booked vs
  arrived, walk-ins, help asked and given, closed with a next step), shown on the block once
  it starts and at `/admin/calendar` for the last 90 days. Nothing per person is stored, and it
  shows who used the board, not who spoke in voice.

## SHIFT project canvas and note versions

SHIFT and SHIFT High students log their project on a canvas laid out like a Business Model
Canvas, so mentors (and an AI reading the board) can follow each student without forms. Code:
`lib/whiteboard/shift-cards.ts`, `components/whiteboard/shift/`.

- **Adding a canvas:** the board kit's **SHIFT** tab has one button, **+ แคนวาสโปรเจกต์**, with a
  small map of the layout; the **แคนวาสโปรเจกต์ SHIFT** template does the same. A new canvas
  goes to the right of everything already on the board, so it never covers someone's work.
- **Layout** (`canvasZones`): a frame tagged `customData.project` holding one locked, tinted zone
  per kind (`customData.zone`), each with its title and question (`customData.zoneLabel`):

  | Row | Zones |
  |---|---|
  | What we believe (each starts with one note that keeps versions) | 🎯 ปัญหา, 👥 กลุ่มเป้าหมาย, 💡 ไอเดีย, 🚀 ปล่อยงาน |
  | Evidence | 🎤 สัมภาษณ์, 🔍 ตัวอย่าง/คู่แข่ง |
  | What we tried and changed | 🧪 ทดสอบ, 🔀 เปลี่ยนแผน |
  | Daily | 📅 วันที่ 1 to 7 (`customData.day`) |

  Each kind's matching `shift_round_evidence` type is in `SHIFT_CARDS[kind].evidence`, for a
  later export.
- **+ เพิ่ม** (`ZoneAddLayer`, editors only, hidden below 20% zoom) at each zone's top-right
  adds a note of that kind (`customData.card`) in the zone's next free slot, joins it to the
  project frame, and starts typing on it straight away. The zone a note sits in says what it
  is, so plain stickies dragged into a zone count too. A note starts with one space so its
  label keeps the board's note font; `useShiftCardCaret` selects that space (or, on a written
  note, puts the caret at the end, since Excalidraw otherwise selects all text on a laptop).
  Notes have a 10px corner (`roundness.value`): Excalidraw sets text 5px from the edge, so its
  default 32px corner curved over the first letters of a note that reads from the top-left.
- **Pivot arrows:** an arrow from an interview or test to a pivot note is the "why" of the
  pivot log.
- **Rows fit their notes** (`lib/whiteboard/canvas-fit.ts`, `components/whiteboard/shift/useCanvasFit.ts`):
  - A row of zones is as tall as its fullest zone needs: the lowest note's bottom plus 24.
  - It is never shorter than the template made it, so it grows when a note gets taller as someone
    types and shrinks back when notes are removed.
  - The rows below move with everything in them (labels, notes and their text, loose stickies),
    arrows bend to keep meeting their notes, and the frame grows or shrinks to match.
  - **+ เพิ่ม** in a full zone first grows it by a line of notes.
  - Only the browser that made the edit refits, after the drag or resize ends and only on canvases
    that person may change, so two people never move the same rows. The moves sync and save like
    any edit, and running the fit again changes nothing.
  - A note belongs to the zone its top-left corner is in.
- **Versions** on Problem, Target, Idea and Ship notes: select the note, click its chip, and
  **เก็บเป็น vN** saves the note's text (up to 5,000 characters), time, author and an optional
  reason (**เปลี่ยนเพราะ**) into `customData.versions` (newest 20 kept, numbers never reused). It
  syncs and travels with the note like any edit, with no extra table. Versions only grow, so
  they can serve as evidence: Postgres (`whiteboard_card_versions`) keeps saved entries exactly
  as they were, and stamps each new one with the person saving and a checked time (theirs if
  within 10 minutes of the server's, else the server's). Undo cannot remove a version. A pasted
  note keeps its versions, marked `copied` (**คัดลอกมา**, "(copied)" in reads) unless the paster
  just wrote them. The history panel (a `.wb-window` dialog on the board's `--wb-*` tokens)
  marks lines new since the version before. Every save is also in `whiteboard_changes`, but that
  is cut to 200 characters and records half-typed text, so it is an audit trail rather than
  versions.
- **Who may change a canvas** (`lib/whiteboard/canvas-access.ts`): a canvas belongs to whoever
  made it (`customData.owner`). They pick teammates from the board's editors with the
  **ทีม** tag above the canvas (`customData.editors`, `CanvasTeamLayer`), and can hand the canvas
  to one of them (**ให้เป็นเจ้าของ**, two clicks; the old owner stays on the team). Board members
  who can only view are listed but cannot be picked. The board's owner gets **ชวนเพื่อนเข้าบอร์ด**
  in the panel, which opens the share dialog; other canvas owners are told to ask them. Moderators
  (the board's owner and site admins who are on the board, `managerIds` from `loadBoard`) may
  change any canvas and hand it over. Owners and teammates must be people on the board.
  Everyone else sees **ดูอย่างเดียว · ของ <name>** (view only) and no **+ เพิ่ม** buttons. The rule
  runs in three places:
  - **Postgres** (`whiteboard_merge_elements`, migrations `20261109120000_whiteboard_canvas_access.sql`
    and `20261110120000_whiteboard_canvas_trust.sql`): the one that counts. Changes the saver may
    not make (moving, editing, deleting, or adding anything in the canvas, including stripping a
    note's frame first or moving its text to another note) are left out of the merge. A new canvas
    belongs to whoever saves it. Teammates may rename, move and resize its frame, but only its
    owner or a moderator can change its team or owner, delete it, bring it back, change its type
    or its project tag. A deleted canvas keeps its owner. An existing plain frame becomes a canvas
    only by a moderator, or by its creator when nothing of anyone else's is inside (a canvas locks
    others out of what is in it).
  - **This browser** (`lib/whiteboard/canvas-guard.ts` in `useWhiteboardSync`): an edit you may not
    make is undone at once with a short notice, a new canvas gets its owner, and a removed note
    version comes back. What only Postgres knows (who is on the board, who started a project)
    arrives in its answer to the save.
  - **Live edits from others**: a live edit says who sent it, but the sender writes that, so it
    proves nothing. Live edits that touch a canvas are not shown as they arrive: the browser waits
    for the sender's `saved` notice (or 6 seconds) and then shows the copy Postgres saved
    (`POST /api/whiteboards/<id>/elements`). An element that has touched a canvas stays on this
    path for the session, so a fake live edit cannot move it out first. So teammates see each
    other's canvas edits a moment after the writer pauses (the save waits 1.2 seconds for typing to
    stop), not keystroke by keystroke. Cursors and everything outside canvases stay live. The cost:
    two teammates changing the same element within those seconds (one drags the canvas while the
    other types in a note on it) are more likely to overwrite each other, since the element with
    more changes wins.
  Canvases from before owners existed fall back to their creator. Things lying on top of a
  canvas without being in it are not read as part of the project.
- **Projects across boards:** `whiteboard_projects` records who started each project id. The id
  survives copying a canvas to another board when its starter (or a site admin) saves the copy,
  so a project can continue from a SHIFT board onto the SHIFT High board; a site admin's copy
  stays the starter's. Anyone else's copy becomes a new project with a new id, so a project id
  always means one student's work. A board's owner moderates canvases on that board only: anyone
  owns the boards they make or duplicate, so owning a board gives no power over projects. When the
  starter (or a site admin) hands a canvas over, its project goes too. Two frames with the same id
  on one board (a copy-paste) are separate canvases of one project.
- **Reading:** `pnpm whiteboard:read <id>` prints each canvas as `## [SHIFT project] <name>`
  with a `###` section per zone, notes as `[🎤 สัมภาษณ์] ...`, and each version with its
  reason. Zone labels and the canvas hint are left out.

Next: a per-project log and a mentor progress page (`/admin/shift/progress`) that joins the
canvases with SeedStack events by user id, then a student "my log" export for the TCAS case
study. No AI appears in the student UI; analysis runs on the Markdown and JSON reads.

## Excalidraw gotchas (0.18)

- `onUserFollow` and `onScrollChange` are API subscriptions
  (`excalidrawAPI.onUserFollow(cb)`), not props. Passing them as props silently does nothing.
- Thai on the canvas comes from Thai-only `@font-face` rules registered under Excalidraw's
  family names (`components/whiteboard/whiteboard.css`). Their weights must match
  Excalidraw's own faces (Nunito is 500), or Latin text falls back to a system font.
- Font files live in `components/whiteboard/fonts/`, not `public/`: the proxy matcher only
  lets images through, so `.woff2` under `public/` redirects to login.
- Thumbnails are WebP. Satori can't decode WebP, so link previews re-encode with `sharp`.
- Excalidraw zooms only for wheels on its canvas. Over our overlays (outside it) a trackpad
  pinch zoomed the web page, and over its own frame names it did nothing.
  `components/whiteboard/wheelBridge.ts` passes wheels over anything marked `WHEEL_THROUGH`
  (and frame names) to the canvas, and stops a pinch over our panels from zooming the page.
  Mark new chips with it; leave it off anything that scrolls.
- Excalidraw's Library button is hidden (`.default-sidebar-trigger` in `whiteboard.css`): it
  opened a second right-hand panel next to the board kit. The kit's **สร้าง** tab opens the
  Library instead (`toggleSidebar({ name: "default", tab: "library" })`).

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
