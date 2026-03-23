# Team Matching Simulator — Design Spec

**Date:** 2026-03-23
**Status:** Approved

---

## Overview

A single admin page that lets admins simulate the team-matching algorithm. The admin creates a set of simulated users, each entering up to 5 teammate preferences. Clicking "Run Team Matching" groups users into teams of 3–5 using a mutual-pick-first algorithm. No database — all state is in-memory.

---

## Route

`app/admin/team-matching-simulator/page.tsx`

Follows the existing admin auth pattern: checks `user_roles` for `role = 'admin'`, redirects to `/me` if not authorized.

---

## Components

### `TeamMatchingSimulator` (root client component)
- Holds all state: `users: SimUser[]`, `teams: Team[] | null`
- Default state: 5 users named "User 1" through "User 5", no preferences set
- Renders the user grid, "Add User" card, "Run Team Matching" button, and `TeamResultsPanel`

### `UserCard`
- Props: `user: SimUser`, `allUsers: SimUser[]`, `onChange`, `onRename`
- Displays user name with inline click-to-edit rename
- Shows 5 `PreferenceCombobox` dropdowns

### `PreferenceCombobox`
- Searchable dropdown (combobox pattern)
- Options filtered to current user list, excluding self and already-selected preferences in the same card
- Typing filters by name; selecting sets that preference slot

### `TeamResultsPanel`
- Props: `teams: Team[]`
- Renders team cards in a grid below the user grid
- Each card shows team number and member names
- Appears after "Run Team Matching" is clicked; re-running replaces previous results

### `matchTeams(users: SimUser[]): Team[]`
- Pure function, no side effects
- Implements the matching algorithm (see below)

---

## Data Model (in-memory only)

```ts
type SimUser = {
  id: string;        // uuid, generated on creation
  name: string;      // display name, editable
  preferences: string[]; // up to 5 user ids, in priority order
}

type Team = {
  id: string;
  members: SimUser[];
}
```

---

## Matching Algorithm

Priority: mutual picks first, then one-sided picks to fill remaining slots.

### Steps

1. **Build mutual-pick set** — find all pairs (A, B) where A→B and B→A both exist.
2. **Cluster with Union-Find** — merge mutual pairs into connected components (groups).
3. **Split oversized groups** — if a cluster exceeds 5, split greedily while keeping mutual pairs together as much as possible.
4. **Score unmatched users** — for each user not yet placed, compute a compatibility score against each existing group: +1 for each group member who picked this user (one-sided), +1 for each group member this user picked.
5. **Assign to best-fit group** — place unmatched user into the group with the highest score that still has room (≤5 members). Ties broken by smallest group first.
6. **Handle leftovers** — users who couldn't join any existing group form their own new group.
7. **Size constraints** — teams can be 3–5. If total users don't divide evenly, the last team may be 3 or 4.

---

## UI Flow

1. Page loads with 5 default users and empty preferences.
2. Admin clicks a user name to rename it inline.
3. Admin fills preference comboboxes — type to search, click to select.
4. Admin can click "+ Add User" to append additional users (no hard cap).
5. Admin clicks "Run Team Matching" — `matchTeams` runs, `TeamResultsPanel` appears below the grid.
6. Admin can adjust preferences and re-run; results replace previous output.

---

## Styling

- Follows Dusk theme (admin area is dark)
- User cards: `bg-[#1a1a1a]` with `border border-[#333]`
- Results panel appears below the grid, same dark styling
- "Run Team Matching" button: prominent, centered, purple accent
- No loading state needed (pure synchronous computation)

---

## Out of Scope

- Persistence (no Supabase reads/writes)
- Exporting results
- More than one simulation session at a time
- Configurable team size (hardcoded 3–5)
