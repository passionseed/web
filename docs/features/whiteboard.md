# Whiteboard

Our own FigJam-style board at [`/whiteboard`](https://www.passionseed.org/whiteboard), built on
Excalidraw. First used for the SHIFT High community session on 2026-10-24.

## What people can do

- Draw together live: cursors, edits, presence, and follow mode (click someone in the
  top-right list, or open "+N" when it is collapsed).
- Stickies, stamps, 8 templates, pinned comment threads, emoji reactions, a shared timer,
  import, duplicate, and export.
- Saving is automatic. Ctrl/Cmd+S saves at once. Edits that could not be saved are kept in
  localStorage and replayed on the next visit.
- Version history: named versions any time, plus an automatic snapshot every 30 minutes of
  editing (the newest 100). Restoring is undoable; any version can be copied to a new board.
- Sharing: a link with access off, view, or edit (rotatable), and member roles. Everyone
  needs a PassionSeed account.

## How it works

| Piece | Where |
|---|---|
| Pages | `app/whiteboard/` (list, board, share link) |
| API | `app/api/whiteboards/` |
| Database access | `lib/supabase/whiteboards.ts` (role check, then service role) |
| Pure logic and schemas | `lib/whiteboard/core.ts`, `lib/whiteboard/templates.ts` |
| Editor and sync | `components/whiteboard/` (`useWhiteboardSync.ts` is the core) |
| Schema | `supabase/migrations/20261023120000_whiteboards.sql` |
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
- **Authorship:** every element carries `customData.createdBy` and `customData.updatedBy`
  (user ids), recorded from 2026-10-24. The server sets `updatedBy` on save. Elements from
  before then have no author.
- **Share links:** `/whiteboard/join/<token>` renders (so chat apps read the preview tags) and
  hands off to `/whiteboard/join/<token>/enter`, which signs in, joins, and redirects with a
  real 307. Don't call `redirect()` from a whiteboard page: every page streams because of
  `app/loading.tsx`, and a mid-stream redirect can crash Next's client router ("This page
  couldn't load"). Signed-out visits redirect in `utils/supabase/proxy.ts`, keeping `?next=`.
  `/login` shows the board being joined when `next` is a whiteboard path.

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
