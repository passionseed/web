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
- **Opening a board** (`openBoard` in `lib/supabase/whiteboards.ts`) takes two rounds of queries:
  the sign-in check with the board's rows, then everyone's profiles and admin flags. Deleted
  elements stay in the database but are not sent to the editor (on the SHIFT High board they were
  60% of the data). The board list fetches the editor's code in idle time, so opening a board
  from it starts warm.
- **Board size:** every save rewrites the whole board row, so its size is what makes saves slow.
  The save route slims strokes and lines first (`lib/whiteboard/compact.ts`): coordinates and
  pressures keep 2 decimals, and lines and stylus strokes drop points within half a pixel of the
  line through their neighbours. Mouse and finger strokes keep every point (their thickness comes
  from point spacing), and arrows are untouched. The stored copy changes, not the version. A
  trigger (`whiteboard_drop_old_tombstones`) drops deleted elements older than 24 hours on every
  write, as Excalidraw's own app does. `pnpm tsx scripts/whiteboard-slim.ts` reports what slimming
  would save on stored boards and, with `--board <id> --apply`, writes it (only if nobody saved
  since it read). On 2026-11-10 it showed Shift[3] going from 5.5 MB to 2.3 MB.
- **Images** are still stored as data URLs in `whiteboard_files`, but each one is served on its own
  as plain bytes from `GET /api/whiteboards/<id>/files/<fileId>`, cached by the browser for a year
  (a file id's bytes never change; saving ignores duplicates). The editor fetches five at a time,
  nearest the middle of the view first, and shows each as it arrives. Big PNG and JPEG images go out
  as WebP (`sharp`, same pixel size), and new uploads over 200 KB are re-encoded as WebP in the
  browser first (`compressImage.ts`). Helpers and tests: `lib/whiteboard/images.ts`.
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
  Close ✅), which are in the board kit and the Library and are tagged in `customData.card`.
  A card counts for whoever placed it (`createdBy`); the template's example cards count only
  once someone writes on them. `lib/calendar/attendance.ts` turns that into counts (booked vs
  arrived, walk-ins, help asked and given, closed with a next step), shown on the block once
  it starts and at `/admin/calendar` for the last 90 days. Nothing per person is stored, and it
  shows who used the board, not who spoke in voice.

## Quests

Mentors draw quests on the board by hand, as on SHIFT[3] Day 2: a text that says **Quest** (any
case, optionally with a star) and the task written under it. Students start a quest, and everything
they make until they end it counts as their work for that quest. Code: `lib/whiteboard/quests.ts`,
`components/whiteboard/quest/`.

- **Finding quests** (`findQuests`): every live text whose whole text is "Quest" is a quest, and so
  is any text a mentor made one (`customData.questLabel`, unless its `off` is set). Its task is the
  nearest text up to 400 units below that is not someone's quest work; once seen, the task's id and
  a copy of its text are kept on the label (`taskId`, `backup`), so a deleted task falls back to the
  copy instead of the next text down. Numbered in reading order (rows, then left to right).
- **Start and end:** editors see **เริ่ม Quest** beside each label, drawn in the label's ink and
  sized with the board (hidden below 12% zoom); it moves in the same frame as the canvas
  (Excalidraw's scroll callback, not a React render). Mentors drag it to move it (`dx`, `dy` on the
  label). While
  one runs, a pill at the top says which quest and how many pieces went in, with **จบ Quest**.
  Starting another quest ends the first. The session is kept in localStorage per board, so a
  reload keeps it running.
- **Tagging:** while a session runs, every element this browser creates (strokes, notes, text,
  words typed into someone else's box, pastes) gets `customData.quest = { id, session, by, at }`
  (`id` is the label's element id). `useWhiteboardSync` sets it on the element before its first
  send, so it syncs and saves like the element itself with no extra version. Edits to things that
  already existed are not tagged.
- **แก้ Quest ที่ส่ง:** right-click work and a card beside Excalidraw's menu says which quest it
  counts for; pick another quest or **ไม่นับเป็นงาน Quest**. A note and its words move together.
  Students can retag their own work (tagged by them, or untagged and made by them); moderators can
  retag anything. Excalidraw 0.18 cannot add items to its own menu, so this is our own card.
- **Quest settings:** mentors right-click a quest's label for its settings, beside Excalidraw's menu:
  edit the task (written back on the board) or put it back if it was deleted, remove or re-create
  the start button, move it back, or **เลิกเป็น Quest**. Right-clicking any other text offers
  **ทำข้อความนี้เป็น Quest**. Clicking a label shows a card of who handed in what.
- **Quest dashboard** (`QuestSidebar.tsx`, its own side panel, opened from the board menu or a
  quest's card): each quest with what each person made for it (their words, how many drawings),
  who has not handed in yet (members who can edit), and **ดูบนบอร์ด** to select their work and zoom
  to it; **ตามคน** lists each person with their quests.
- **Who sees the dashboard:** the board's owner, site admins, and quest reviewers: members the owner
  marks with the **Quest** toggle in Share (`whiteboard_members.quest_reviewer`, migration
  `20261111120000_whiteboard_quest_reviewers.sql`). A reviewer sees it after reopening the board.
  Everyone's work is on the board for all members anyway; the role only opens the summary. Until the
  migration is applied, `openBoard` reads members without the column, so boards keep opening.
- **Names:** the board shows people by their Discord name (display name, else username) and
  picture: in the people corner, cursors, comments, who-made-what and the Quest dashboard.
  `useBoardPeople` loads them from `GET /api/whiteboards/[id]/people` a moment after the board
  opens (one sign-in record read per person, so not on the open path); profile names until then and
  for anyone without Discord. Only people on the board (owner, members, anyone with work on it, the
  viewer) are looked up.
- **Reading the work:** `pnpm whiteboard:read <id>` ends with **Quest work**: per quest, per person,
  the words they wrote and how many drawings. A tag whose label was deleted is still listed.

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
- **Pivot arrows:** an arrow from an interview or test to a pivot note is the "why" of the
  pivot log.
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
  to one of them (**ให้เป็นเจ้าของ**, two clicks; the old owner stays on the team). Moderators
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

## Chrome look: Grain

The board chrome (`components/whiteboard/chrome/`, `whiteboard.css`) is quiet paper: off-white
cards, 1px periwinkle hairlines, dashed dividers, ink text, IBM Plex Sans Thai with IBM Plex
Mono numerals (`components/whiteboard/fonts.ts`, loaded on whiteboard routes only). Dark mode is
the same on near-neutral ink paper (the cards lean neutral to sit on Excalidraw's dark canvas,
#121212 unless a colour is chosen in Board settings). Everything reads the `--wb-*` tokens;
things portalled out of the board (Share dialog, timer popover) take the `wb-theme` class to get
them. The speaker script window has none of the page's CSS: `SCRIPT_CSS` repeats the look and
copies the two typefaces over.

- **The only colour is the grain bloom** (`chrome/Grain.tsx`): indigo and ultramarine with a navy
  core into vermilion and cream, breaking into dots at its edges. It is for focal things only:
  the active tool, Share, progress strips, app tiles, a screen's one primary button
  (`.wb-btn--primary`) and Spyfall's card back. One bloom on the bottom bar at a time: a button
  that only has a menu open gets an ink outline (`.wb-tool--menu`), and so does the option in
  use in the options bar. Selected rows get a thin
  vermilion marker, not a fill. Small solid actions (send, save) are ink (`.wb-btn--solid`),
  never a flat indigo. No glass, glows, big shadows or extra accent colours: categories are
  told apart by a word, not a colour (the calendar's `tone="grain"`, the activity chips).
- **Two things float, and only they have a shadow:** the bottom bar and its options bar
  (`--wb-shadow-float`, 16px corners, a solid `--wb-rule` edge), so they stand clear of whatever
  is drawn under them. A sticky being dragged out has one too, because it is in the air.
- **It never runs a filter while you work.** Each bloom is drawn once off screen (SVG
  feTurbulence, thresholded into a mask), saved as a PNG, and used as an image from then on:
  `<GrainDefs />` publishes the small ones as CSS variables (`--wb-grain-chip`,
  `--wb-grain-tile-a`...) and `<GrainBloom variant />` fills its parent with one. Keep blooms
  static and off anything that moves with the canvas.
- **A bloom is cropped, never scaled.** Resampling turns the dots into blur. Bitmaps are made at
  whole device pixels (1x, 2x or 3x) and shown at their own size: fixed `background-size`, or
  `<GrainBloom fixed />`. A new size needs its own recipe. Before drawing, `Grain.tsx` checks
  once that the browser keeps SVG filters on a canvas; if not, the SVG itself is the image.
- A progress strip (`.wb-strip`) is a solid body, navy to ultramarine, with a short bloom cap
  on its leading end, so a nearly empty strip is still a solid mark.
- Icons on tiles need 3:1: a cream or ultramarine corner that would fail against the icon
  stays outside the middle 18px (`TILE_BR_OUT`, `TILE_TL_OUT`).
- **The bottom bar** (`chrome/BottomBar.tsx`) is FigJam's layout in three groups split by solid
  hairlines: Select and Hand; the pen, the sticky pad and the shapes, drawn as objects
  (`chrome/ObjectTools.tsx`); then Text, Frame, Comment, Reactions and the round "+" Apps
  button. It is 78px tall (64px at 900px and under, 56px on phones). Icon tools are 24px icons
  with 1.75px strokes in full ink inside 48px buttons, and keep the bloom chip. The objects are
  about 1.5x that: the pen and the pad stand on the bar's bottom edge and are cut off by it. An
  object shows it is active by rising, with a short bloom on the ground under it (stickies get
  an ink line: Select is still the tool and has the bloom). Every object size is multiplied by
  `--wb-obj-scale`. Viewers get Hand, Comment, Reactions and Apps.
- **The shapes are three buttons, not one:** a square on the left, a circle bottom right and a
  curved arrow top right (`ShapeCluster`, `ShapeObject`). The one you press is the one you get:
  a click makes it the tool (rectangle, ellipse, arrow) and opens the shapes options with it
  selected; a drag drops that shape. The circle's hit area is round. Diamond and line are in
  the options bar, where every shape drags out too.
- **Tool options live in one place: the options bar** (`chrome/OptionsBar.tsx`), a second card
  above the bar for the active tool, 56px tall. Pen: marker, highlighter or eraser, thin or
  thick, colour. Sticky: the colour of the next sticky. Shapes: the shape, stroke colour, fill,
  then image, laser, web embed and text to diagram. Text: size and colour. Colour dots are 28px
  at full strength; the one in use has a 2px ink ring with a gap. The option in use has a tinted
  ground and an accent line. `chrome/toolOptions.ts` keeps each tool's values and writes them to
  Excalidraw (`currentItem...`) when the tool becomes active, from the bar or a shortcut. While
  a drawing tool is active and nothing is selected, the room carries `data-tool-options="1"`
  and Excalidraw's own panel is hidden (the left island, and on phones the sheet and its palette
  button); with a selection it is back, to edit the selected elements. Escape closes the options
  and returns to Select.
- **Stickies and shapes drag out of the bar** (`chrome/useDragOut.ts`): press, drag past 6px,
  and a preview at the size it will have follows the pointer; letting go over the canvas
  places it centred there and selects it, letting go over the bar or pressing Escape cancels.
  A press that does not move is a click: a sticky lands mid-screen, a shape becomes the tool.
- **A sticky peels off the pad.** The pad is three sheets in the next sticky's colour, the top
  one (`.wb-pad__top`) with a curled corner; it lifts a little on hover. On a drag the top sheet
  leaves the bar (the button gets `data-peeled`, the next sheet shows) and becomes the preview:
  the real colour, a soft shadow, tilted 4 degrees, growing from its size on the pad to its size
  on the canvas in 120ms. Dropped, it straightens (100ms) and the real sticky takes its place;
  cancelled, it shrinks back onto the pad. Under `prefers-reduced-motion` it only follows the
  pointer.
- **Board settings** (`settings/BoardSettingsDialog.tsx`, opened from the main menu and from
  Apps, under Board) is a list of rows from `SETTING_ROWS` in `settings/rows.tsx`: a new
  setting is one field in `lib/whiteboard/settings.ts` (type, default, parser) and one row.
  Today: the background colour and the dot grid (on by default). Settings are per board and
  per browser, in localStorage under `whiteboard-settings:<boardId>`; only `loadBoardSettings`
  and `saveBoardSettings` know that, so moving them to the database is those two functions.
  Excalidraw's own "Canvas background" menu item is left out: this is the one place.
- **The paper is our layer, not Excalidraw's** (`settings/BoardBackdrop.tsx`): the canvas is
  kept see-through (`viewBackgroundColor: "transparent"`) and the colour and the dots are a
  `div` under it, so the dots sit behind everything drawn. The dots are one CSS
  radial-gradient, 24 scene units apart; an `api.onScrollChange` subscription writes the
  tile's size and position straight to the element once a frame (`dotLattice`), so they pan and
  zoom with the canvas without a render. Zoomed out, every 2nd, 4th, 8th dot is kept so they
  never sit closer than 14px. The dot colour comes from the paper (`dotColorFor`).
- **A background colour is a light-theme colour**, like every colour on the board. The dark
  theme shows its dark counterpart (`darkCounterpart`, the same sum as Excalidraw's
  `invert(93%) hue-rotate(180deg)` filter), so paper and drawing turn dark together; the custom
  picker in the dark theme converts back (`lightCounterpart`). No colour chosen means the
  theme's own paper: #f5f5f3, or #121212 in the dark theme.
- **Exports get the real colour** (`settings/useCanvasBackground.ts`): it is handed to
  Excalidraw while the "Export image" or "Save to" dialog is open and while "Copy as PNG/SVG"
  runs, and taken back after. The image dialog copies the app state as it opens, so it is
  closed and reopened once with the colour in place. Thumbnails pass it in themselves
  (`boardThumbnail`). The same hook puts the canvas back after "Reset the canvas".
- A person's avatar ring (indigo, vermilion or ultramarine) comes from their id
  (`chrome/ring.ts`), so it is the same in the people card and in games.
- Hover styles sit inside `@media (hover: hover)`; touch gets `:active`. Controls are 44px
  under `@media (pointer: coarse)`, or keep their size and grow an invisible hit area.
- A new app picks its tile with `tile: "a"` to `"g"` in `plugins/registry.tsx`.

## Excalidraw gotchas (0.18)

- The canvas is see-through on purpose (see "The paper is our layer" above). Do not read
  `appState.viewBackgroundColor` for the board's colour: use `backgroundFor` or
  `exportBackgroundFor` from `lib/whiteboard/settings.ts`. Outline arrowheads (circle,
  triangle and diamond outlines) are filled with that colour, so on the board they show the
  line through them; exports are right.
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

### SHIFT canvases for staff, with Claude

How to use all of this, for students, mentors and admins, in Thai: `/shift/canvas-guide`
(public; `components/shift/canvas-guide/`). It names buttons exactly as they appear, so update it
when a label changes. The board kit's SHIFT tab, the staff and admin canvases pages, and the
no-access page link to it.

Every SHIFT project canvas across boards, in two places with the same content:

- `/shift/canvases`, for **SHIFT staff and mentors**: anyone with a `shift_round_roles` grant (staff,
  or a round's mentor, given in Admin > SHIFT > Rounds > Settings), plus site admins
  (`canViewShiftCanvases` in `lib/supabase/shift-canvas-access.ts`). Removing the grant removes the
  access. It uses the staff workspace look of the SHIFT Companion.
- `/admin/shift/canvases` (**Canvases** in the SHIFT admin tabs), for site admins in the admin console.

Each row shows the student and teammates with their PassionSeed name, their nickname (ชื่อเล่น,
from their SHIFT application), and the Discord account they verified when they joined: picture,
`@username` linking to their Discord profile, and Discord display name
(`lib/shift/canvas-people.ts`, `lib/supabase/shift-people.ts`). Then:

- which beliefs are written (Problem, Target, Idea, Ship);
- counts of interviews, examples, tests and pivots;
- days logged, saved versions, and the last edit.

Each canvas opens at `<base>/<board>/<frame>` with its contents read the same way as
`pnpm whiteboard:read`: only that canvas, its own arrows, and the comments pinned on it. It also
links to the board.

Both pages have **Ask Claude**: a summary button and a chat about one canvas or all of them.

- **Request:** `POST /api/shift/canvases/chat`, guarded by the same access check. The browser
  sends only the scope and the conversation (`lib/shift/canvas-chat.ts`). The server reads the
  canvases from the database (`lib/supabase/shift-canvases.ts`, service role), so a request
  cannot add text of its own.
- **Model:** `lib/shift/canvas-claude.ts` calls `claude-opus-5-5` with the official SDK
  (`@anthropic-ai/sdk`, `ANTHROPIC_API_KEY`, stored as Sensitive in Vercel for Production and
  Preview) and streams plain text, at medium effort with answers capped at 8,000 tokens. The
  project is on Vercel Hobby, and `"fluid": true` in `vercel.json` turns on fluid compute, which
  allows the route its 300 seconds (without it, Hobby stops functions at 60).
- **Refusals:** the server-side fallback (`fallbacks: "default"`) retries a refusal on the model
  Anthropic recommends.
- **Caching:** the canvases sit in a cached system block, so follow-up questions cost a fraction
  of the first.
- **What Claude reads:** students' text is marked as material to read, not instructions. Claude
  sees names and nicknames but not Discord accounts.
- **Saving:** a conversation lasts until the page reloads. Under each answer about one canvas,
  **Save to Tracker** (`POST /api/shift/canvases/tracker-note`) saves it as a SHIFT Tracker note
  (`shift_student_notes`, current week) for everyone on the canvas who is a Tracker student.
  - The people come from the canvas, not the request.
  - The note says it is a Claude summary and records who saved it.
  - Mentors can save notes but cannot read the Tracker, which stays admin-only.
- **Size:** more than 400,000 characters of canvases is refused with a request to open one
  canvas, never cut short.

**Progress by day** (`shift_canvas_snapshots`, migration
`20261110150000_shift_canvas_snapshots.sql`, admin-only RLS):

- **What is saved:** every night around 23:45 Bangkok time (Vercel cron
  `/api/cron/shift-canvas-snapshots`), one row per canvas per Bangkok day with its progress
  numbers, the canvas as Markdown, and a short note on what changed since its last snapshot.
- **The note:** **Claude Haiku 5.5** (`claude-haiku-5-5`, low effort) writes it (`describeCanvasChange` in
  `lib/shift/canvas-claude.ts`). A canvas whose Markdown has not changed gets "No change." without
  a model call, and a failed note leaves the numbers saved.
- **Where it shows:** each canvas page has a table by day with what grew, and the list shows each
  canvas's latest note.
- **Snapshot now:** admins can take today's snapshot from the admin list (`POST
  /api/shift/canvases/snapshot`), which replaces the day's row.
- **Code:** `lib/shift/canvas-snapshots.ts` (pure) and `lib/supabase/shift-canvas-snapshots.ts`.

Opus 5.5 answers staff in the chat; Haiku 5.5 writes the nightly notes, a short task run for every
canvas.

Sending canvases to Claude sends students' words to Anthropic. Commercial API data is not used
for training and is deleted within 30 days (longer only when flagged for a policy violation);
see Anthropic's privacy center. Keep these pages to SHIFT staff, mentors and admins.

## Safeguarding

Boards are group spaces. Every member sees the full member list, comments are visible to
everyone on the board, and admins can open any board read-only. There is no private chat.
