# Team Finder Feature — Design Spec
**Date:** 2026-04-03
**Status:** Approved

---

## Overview

A self-service "find team" flow for hackathon participants who don't yet have a team. Participants opt in, see who else is looking, pick up to 5 ranked preferences (identical to the team-matching-simulator UX), and the admin previews + confirms team groupings using the same `matchTeams` algorithm.

This is a **separate flow** from the existing event-based `/hackathon/matching` page. It lives inside the existing `/hackathon/team` TeamDashboard as a new view.

---

## Database

### New table: `hackathon_team_finder`

```sql
CREATE TABLE hackathon_team_finder (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  uuid NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  preferences     text[] NOT NULL DEFAULT '{}',  -- up to 5 participant_ids in ranked order
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id)
);
```

- One row per opted-in participant (upsert on join/update).
- `preferences` is an ordered array of participant IDs (up to 5), matching the `SimUser.preferences` shape expected by `matchTeams`.
- RLS: anon read allowed (participants use custom session auth, not Supabase auth). Service role for writes via API routes.

### Migration file
`supabase/migrations/20260403000002_hackathon_team_finder.sql`

---

## Participant Flow

### Entry point
The existing "หาทีม" button in `TeamDashboard` currently branches on `hasActiveMatchingEvent`:
- If `hasActiveMatchingEvent` → route to `/hackathon/matching`
- Otherwise → call `handleStartMatching()` (waitlist)

The button is changed to a **third branch**:
- If `hasActiveMatchingEvent` → route to `/hackathon/matching` (unchanged)
- Otherwise → set `view = "find-team"` (new behavior, replaces waitlist call)

### View: `"find-team"` (new)

Added to the `View` type in `TeamDashboard.tsx`:
```ts
type View = "home" | "create" | "join" | "matching" | "find-team";
```

**Sub-states within the view, handled by `TeamFinderView` component:**

1. **Loading** — fetch `GET /api/hackathon/team-finder/status` to check if already opted in.
2. **Not opted in** — show opt-in screen: participant's name pre-filled (read-only), "เข้าร่วมหาทีม" button → calls `POST /api/hackathon/team-finder/join` → transitions to step 3.
3. **Opted in — preferences** — shows:
   - List of all other opted-in participants (names only, no other info).
   - Ranked preference picker: 5 `PreferenceCombobox` slots (reused from `components/admin/team-matching/PreferenceCombobox.tsx`), each slot shows a dropdown of other opted-in participants not already selected.
   - Auto-saves on every change via `PUT /api/hackathon/team-finder/preferences` (debounced 600ms).
   - "ออก" back button returns to `view = "home"`.

**UX notes:**
- Participant sees only names in the dropdown — no extra info, matching the approved design.
- If they navigate away and return, they land directly on step 3 with saved preferences.
- Opted-in count shown ("X คนกำลังหาทีม") for social proof.

---

## New Component: `TeamFinderView`

**File:** `components/hackathon/TeamFinderView.tsx`

Props:
```ts
type Props = {
  participant: { id: string; name: string };
  onBack: () => void;
};
```

Responsibilities:
- Fetch status on mount.
- Handle opt-in → preference editing state machine.
- Reuse `PreferenceCombobox` for ranked picking.
- Debounced auto-save of preferences.

---

## New API Routes (Participant)

### `GET /api/hackathon/team-finder/status`
- Auth: session cookie required.
- Returns:
```ts
{
  isOptedIn: boolean;
  preferences: string[];            // participant IDs in ranked order
  participants: { id: string; name: string }[];  // all opted-in (excluding self)
}
```

### `POST /api/hackathon/team-finder/join`
- Auth: session cookie required.
- Upserts a row in `hackathon_team_finder` for the current participant with empty preferences.
- Returns: `{ success: true }`.

### `PUT /api/hackathon/team-finder/preferences`
- Auth: session cookie required.
- Body: `{ preferences: string[] }` (up to 5 participant IDs).
- Validates: participant must be opted in, IDs must exist in `hackathon_team_finder`.
- Upserts preferences.
- Returns: `{ success: true }`.

---

## Admin Page

**Route:** `/admin/hackathon/team-finder`
**Auth:** Supabase admin role (same pattern as `/admin/team-matching-simulator`).

### Component: `TeamFinderAdminPage`

**File:** `components/admin/hackathon/TeamFinderAdminPage.tsx`

Layout mirrors the team-matching-simulator style (dark theme, same CSS classes).

**Two panels:**

#### Left — Participants
- Fetches `GET /api/admin/hackathon/team-finder/participants` on mount.
- Shows each opted-in participant as a read-only card (name + their ranked preferences displayed as an ordered list of names).
- Refresh button to re-fetch.
- Total opted-in count shown.

#### Right — Match Preview
- "จำลองการจับทีม" button → calls `matchTeams()` **client-side** with opted-in data mapped to `SimUser[]`:
  ```ts
  const simUsers: SimUser[] = participants.map(p => ({
    id: p.id,
    name: p.name,
    preferences: p.preferences,  // already participant IDs
  }));
  const teams = matchTeams(simUsers);
  ```
- Renders `TeamResultsPanel` with the preview result.
- Once preview is shown: **"ยืนยันและสร้างทีม"** button → calls `POST /api/admin/hackathon/team-finder/create-teams`.
- After confirmation: success state shows number of teams created, disables the confirm button.

---

## New API Routes (Admin)

### `GET /api/admin/hackathon/team-finder/participants`
- Auth: Supabase admin role.
- Returns all `hackathon_team_finder` rows joined with `hackathon_participants` (id, name, preferences).

### `POST /api/admin/hackathon/team-finder/create-teams`
- Auth: Supabase admin role.
- Runs `matchTeams()` server-side with all opted-in participants.
- For each resulting team: inserts into `hackathon_teams` (auto-generated name e.g. "Team 1") and `hackathon_team_members`.
- Returns: `{ teamsCreated: number, teams: { id, name, memberIds }[] }`.

---

## New Library: `lib/hackathon/team-finder.ts`

DB operations:
- `getTeamFinderEntry(participantId)` — fetch single row
- `upsertTeamFinderEntry(participantId, preferences)` — join or update
- `listTeamFinderParticipants()` — all opted-in with names (for admin)
- `listTeamFinderParticipantsExcluding(participantId)` — for participant view

---

## File Summary

| File | Action |
|------|--------|
| `supabase/migrations/20260403000002_hackathon_team_finder.sql` | New migration |
| `lib/hackathon/team-finder.ts` | New DB operations |
| `components/hackathon/TeamFinderView.tsx` | New participant component |
| `components/admin/hackathon/TeamFinderAdminPage.tsx` | New admin component |
| `app/hackathon/team/page.tsx` | No change (server component unchanged) |
| `components/hackathon/TeamDashboard.tsx` | Add `"find-team"` view + wire up `TeamFinderView` |
| `app/api/hackathon/team-finder/status/route.ts` | New API route |
| `app/api/hackathon/team-finder/join/route.ts` | New API route |
| `app/api/hackathon/team-finder/preferences/route.ts` | New API route |
| `app/api/admin/hackathon/team-finder/participants/route.ts` | New admin API route |
| `app/api/admin/hackathon/team-finder/create-teams/route.ts` | New admin API route |
| `app/admin/hackathon/team-finder/page.tsx` | New admin page |

---

## Out of Scope

- No opt-out / delete flow (can add later).
- No real-time updates on participant view (polling not needed for this use case).
- No notification to participants after teams are created by admin.
- No deduplication check against existing team members (admin responsibility).
