# SHIFT High Island invite: design

Date: 2026-11-11
Status: draft, awaiting review

## Goal

An interactive invite page, styled as a message in a bottle, that tells the
story of SHIFT High Island and invites people to the Season 1 kickoff
festival (14 to 28 Nov 2026, `ISLAND_SEASON` in `lib/content/shift-island.ts`).

Anyone can open it and experience the whole story. Only PassionSeed SHIFT
alumni can RSVP. After an RSVP, the page shows their "ticket" and the way into
the island's Discord channel.

## Decisions (from the user)

- The festival is the Island Season 1 kickoff.
- Alumni gate: sign in and have an alumni record (same rule as the alumni
  board, `getBoardAccess` in `lib/supabase/shift-alumni-board/core.ts`).
- Non-alumni see everything; only the RSVP is gated.
- Join = save the RSVP, then show the Discord link.

## Route

`app/shift/island/page.tsx` at `/shift/island`. Server component, `force-dynamic`
(it reads the session), `robots: noindex`. Not linked from the public site;
it is shared in alumni groups. Metadata and OG image use the island sample.

## Experience

Four scenes in one page. Pixel style that matches the island sprites
(`public/shift/island/`), Dawn theme.

0. **Prologue: the island's story.** The page opens on the story, not the
   bottle. Over a slow pan across the island sample (`island-sample.png`,
   drawn by the island's own renderer), four or five short lines appear one
   at a time as the visitor scrolls or taps "ต่อ":
   - Seven days of SHIFT end, and a real project is in your hands.
   - Most projects stop there, not because they were bad, but because
     nobody kept building with you.
   - So there is an island where every project is a tree, and the trees
     keep growing after day 7.
   - Every plot is someone's project; the tree grows when a mentor sees the
     real work.
   - This season the island opens with a festival, and a bottle has washed
     up for you.
   The last line hands over to the shore. Every claim is one the island
   already makes (`SHIFT_ISLAND`, `ISLAND_QUESTS`); nothing is invented
   (no lore that contradicts how the island works, no numbers not in
   `lib/content/shift-island.ts`). A "ข้าม" (skip) control jumps to the
   bottle; reduced motion shows all lines as static text.
1. **Shore.** Pixel sea at dusk, a bottle drifts in and lands on the sand.
   Hint: tap the bottle. Tap (or drag the cork) uncorks it.
2. **Letter.** A paper scroll unrolls. Four short chapters reveal on scroll
   (`IntersectionObserver`):
   - The island: one project is one tree; it grows only when a mentor
     confirms real work.
   - The tree: the eight stage sprites, interactive (reuse `IslandTree`).
   - The festival: Season 1 dates and a live line from `islandSeasonPhase`
     ("starts in N days" / "open now" / "ended, trees stay").
   - House rules: breaks are fine, trees never wilt; all work happens in
     shared rooms (safeguarding).
3. **Wax seal.** Pressing the seal is the RSVP. What happens depends on the
   viewer (below). On success it stamps and the letter turns into a ticket:
   nickname, SHIFT round, season dates, and a button into Discord.

Motion: CSS and a small canvas for the sea, no new dependencies.
`prefers-reduced-motion` opens straight onto the unrolled letter. Every hover
effect has a touch equivalent (`@media (hover: none)` + `IntersectionObserver`).
Phone-first layout.

## Viewer states

Computed on the server and passed to the client component as a prop.

| State | Seal shows | Action |
|---|---|---|
| `signedOut` | "เข้าสู่ระบบเพื่อตอบรับ" | Sign in, return to `/shift/island` |
| `notAlumni` (no record, or declined) | A short line: this RSVP is for SHIFT alumni | Link to the SHIFT apply page |
| `canRsvp` | The seal | POST RSVP |
| `going` | Ticket already shown | Discord button |

`notMember` with a paid SHIFT application linked to the account is treated
as alumni: the RSVP creates a confirmed member via `createAlumniMember`, as
the alumni RSVP does today. Pending members can RSVP (same as the board).
Admins can RSVP as mentors.

## Data

Migration `supabase/migrations/20261111120000_shift_island_rsvps.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.shift_island_rsvps (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  season text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_island_rsvps ENABLE ROW LEVEL SECURITY;
-- No client policies: admin-only like the other alumni tables (minors).
```

Primary key is `(user_id)` for Season 1. A later season adds rows by moving
to `(user_id, season)` in its own migration.

Access layer `lib/supabase/shift-island-rsvps.ts`: `getIslandRsvp(userId)`,
`addIslandRsvp(userId, season)` (upsert, ignore duplicates). Service role,
after the caller's own checks.

## API

`POST /api/shift/island/rsvp`, no body needed.

1. `supabase.auth.getUser()`; none or anonymous: 401.
2. Resolve access (shared helper with the page, `lib/shift/islandInvite.ts`):
   not alumni: 403 with the Thai message.
3. If no alumni record but a paid application is linked: `createAlumniMember`.
4. `addIslandRsvp`, return `{ ok, ticket: { nickname, cohort }, discordUrl }`.

Errors through `safeServerError`.

Discord URL: `DISCORD_SHIFT_ISLAND_CHANNEL_URL` if set, else
`shiftDiscordUrls().server`, else `shiftDiscordUrls().invite`. If none is
set, the ticket says the link comes in their round's group.

## Files

- `app/shift/island/page.tsx`: server page, resolves viewer state.
- `components/shift/island/IslandInvite.tsx`: client root, scene state.
- `components/shift/island/IslandPrologue.tsx`: the opening story.
- `components/shift/island/BottleShore.tsx`: sea canvas, bottle, uncork.
- `components/shift/island/InviteLetter.tsx`: scroll and chapters.
- `components/shift/island/WaxSeal.tsx`: seal and states.
- `components/shift/island/IslandTicket.tsx`: the ticket after RSVP.
- `components/shift/island/islandInvite.module.css`.
- `lib/content/shift-island-invite.ts`: all copy, Thai first.
- `lib/shift/islandInvite.ts`: viewer state and Discord URL helpers.
- `lib/supabase/shift-island-rsvps.ts`.
- `app/api/shift/island/rsvp/route.ts`.
- Migration above.

## Copy

Thai first, no em dashes, no ed-tech jargon, no "น้องๆ". Season dates and
stage names come from `lib/content/shift-island.ts`, never retyped. Before
shipping, the Thai copy gets the three-reviewer pass in `AGENTS.md`.

## Testing

- `lib/content/__tests__/shift-island-invite.test.ts`: no em dashes in any string; prologue has 4 to 5 lines;
  festival line per phase.
- `lib/shift/__tests__/islandInvite.test.ts`: viewer state for each board
  access kind and the paid-application case; Discord URL fallbacks.
- `app/api/shift/island/rsvp/route.test.ts`: 401 signed out, 403 not alumni,
  200 and upsert for alumni, idempotent second call.
- `pnpm lint && pnpm test && pnpm build` before the PR; check the Vercel
  preview on a phone width.

## Out of scope

- Picking a plot or naming a project (the island bot owns that).
- Emails or LINE notifications.
- An admin list of RSVPs (query the table for now).
