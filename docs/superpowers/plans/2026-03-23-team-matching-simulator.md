# Team Matching Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single admin page at `/admin/team-matching-simulator` that lets admins create simulated users with teammate preferences and run a mutual-pick-first team matching algorithm — entirely in-memory, no database.

**Architecture:** One server page (auth check) renders a single `"use client"` root component (`TeamMatchingSimulator`) that owns all state. The matching algorithm lives in a pure utility function. Three focused sub-components handle individual user cards, the preference combobox, and the results panel.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, TailwindCSS, Shadcn/ui (`Command`, `Popover`)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/admin/team-matching-simulator/page.tsx` | Create | Server page — admin auth check, renders `TeamMatchingSimulator` |
| `components/admin/team-matching/types.ts` | Create | `SimUser` and `Team` type definitions |
| `components/admin/team-matching/matchTeams.ts` | Create | Pure matching algorithm |
| `components/admin/team-matching/matchTeams.test.ts` | Create | Unit tests for the algorithm |
| `components/admin/team-matching/PreferenceCombobox.tsx` | Create | Searchable dropdown for one preference slot |
| `components/admin/team-matching/UserCard.tsx` | Create | Single user card with rename + 5 comboboxes + delete |
| `components/admin/team-matching/TeamResultsPanel.tsx` | Create | Results grid shown after matching |
| `components/admin/team-matching/TeamMatchingSimulator.tsx` | Create | Root client component — owns all state |

---

## Task 0: Install uuid

**Files:** none

- [ ] **Step 1: Install uuid and its types**

```bash
pnpm add uuid
pnpm add -D @types/uuid
```

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add uuid dependency"
```

---

## Task 1: Types

**Files:**
- Create: `components/admin/team-matching/types.ts`

- [ ] **Step 1: Create the types file**

```ts
// components/admin/team-matching/types.ts

export type SimUser = {
  id: string;        // uuid
  name: string;
  preferences: string[]; // up to 5 user ids, in priority order
};

export type Team = {
  id: string;
  members: SimUser[];
};
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/team-matching/types.ts
git commit -m "feat: add team matching simulator types"
```

---

## Task 2: Matching Algorithm + Tests

**Files:**
- Create: `components/admin/team-matching/matchTeams.ts`
- Create: `components/admin/team-matching/matchTeams.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// components/admin/team-matching/matchTeams.test.ts
import { matchTeams } from "./matchTeams";
import type { SimUser } from "./types";

const u = (id: string, name: string, preferences: string[] = []): SimUser => ({
  id,
  name,
  preferences,
});

describe("matchTeams", () => {
  it("places mutual picks in the same team", () => {
    const users = [
      u("a", "Alice", ["b"]),
      u("b", "Bob", ["a"]),
      u("c", "Carol", []),
      u("d", "Dave", []),
      u("e", "Eve", []),
    ];
    const teams = matchTeams(users);
    const aliceTeam = teams.find((t) => t.members.some((m) => m.id === "a"));
    const bobTeam = teams.find((t) => t.members.some((m) => m.id === "b"));
    expect(aliceTeam?.id).toBe(bobTeam?.id);
  });

  it("assigns all users to a team", () => {
    const users = [
      u("a", "Alice", ["b"]),
      u("b", "Bob", ["c"]),
      u("c", "Carol", ["a"]),
      u("d", "Dave", []),
      u("e", "Eve", []),
    ];
    const teams = matchTeams(users);
    const allMembers = teams.flatMap((t) => t.members.map((m) => m.id));
    expect(allMembers.sort()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("no team exceeds 5 members", () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    // everyone picks the first person — stress test
    const users = ids.map((id) =>
      u(id, id, ids.filter((x) => x !== id).slice(0, 5))
    );
    const teams = matchTeams(users);
    teams.forEach((t) => expect(t.members.length).toBeLessThanOrEqual(5));
  });

  it("merges 1-2 leftover solo users into an existing team", () => {
    // 6 users: one mutual pair (a,b) + 4 solos with no picks.
    // After mutual clustering: group [a,b], solos [c,d,e,f].
    // Solos c,d,e,f score 0 against [a,b] (no picks). They form their own group [c,d,e,f].
    // remaining = [] — no merge needed. All 6 placed.
    // To force a 1-leftover: use 3 users — mutual pair + 1 solo.
    // Solo can't form a group of 3 alone, so it must merge into [a,b].
    const users = [
      u("a", "A", ["b"]),
      u("b", "B", ["a"]),
      u("c", "C", []),
    ];
    const teams = matchTeams(users);
    // All 3 must be placed
    const allMembers = teams.flatMap((t) => t.members.map((m) => m.id));
    expect(allMembers.sort()).toEqual(["a", "b", "c"]);
    // All in one team (c merged into [a,b])
    expect(teams).toHaveLength(1);
    expect(teams[0].members).toHaveLength(3);
  });

  it("returns empty array for empty input", () => {
    expect(matchTeams([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test components/admin/team-matching/matchTeams.test.ts
```
Expected: FAIL — `matchTeams` not found

- [ ] **Step 3: Implement the algorithm**

```ts
// components/admin/team-matching/matchTeams.ts
import { v4 as uuidv4 } from "uuid";
import type { SimUser, Team } from "./types";

// Union-Find
function makeUnionFind(ids: string[]) {
  const parent: Record<string, string> = {};
  ids.forEach((id) => (parent[id] = id));

  function find(x: string): string {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(x: string, y: string) {
    parent[find(x)] = find(y);
  }

  return { find, union };
}

export function matchTeams(users: SimUser[]): Team[] {
  if (users.length === 0) return [];

  const prefSet = new Set(
    users.flatMap((u) => u.preferences.map((p) => `${u.id}:${p}`))
  );
  const isMutual = (a: string, b: string) =>
    prefSet.has(`${a}:${b}`) && prefSet.has(`${b}:${a}`);

  // Step 1+2: Build mutual pairs and cluster with Union-Find
  const uf = makeUnionFind(users.map((u) => u.id));
  const mutualPairs: [string, string][] = [];

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      if (isMutual(users[i].id, users[j].id)) {
        uf.union(users[i].id, users[j].id);
        mutualPairs.push([users[i].id, users[j].id]);
      }
    }
  }

  // Group users by cluster root
  const clusters: Record<string, string[]> = {};
  users.forEach((u) => {
    const root = uf.find(u.id);
    if (!clusters[root]) clusters[root] = [];
    clusters[root].push(u.id);
  });

  const userById = Object.fromEntries(users.map((u) => [u.id, u]));

  // Step 3: Split oversized clusters (>5)
  const groups: string[][] = [];
  Object.values(clusters).forEach((cluster) => {
    if (cluster.length <= 5) {
      groups.push(cluster);
      return;
    }
    // Sort mutual pairs by how many mutual connections they share (degree)
    const degree: Record<string, number> = {};
    cluster.forEach((id) => {
      degree[id] = cluster.filter((other) => isMutual(id, other)).length;
    });
    // Greedy split: fill chunks up to 5, prioritizing high-degree nodes
    const sorted = [...cluster].sort((a, b) => degree[b] - degree[a]);
    let current: string[] = [];
    sorted.forEach((id) => {
      if (current.length === 5) {
        groups.push(current);
        current = [];
      }
      current.push(id);
    });
    if (current.length > 0) groups.push(current);
  });

  // Steps 4+5: Score and assign unmatched users
  // At this point every user is in exactly one group (Union-Find put them all somewhere)
  // But we need to handle groups that are too small or large — all users are already placed.
  // Re-interpret: "unmatched" = users in groups of size 1 (solo clusters, no mutual picks)
  const placed: string[] = [];
  const soloGroups: string[][] = [];
  const teamGroups: string[][] = [];

  groups.forEach((g) => {
    if (g.length === 1) soloGroups.push(g);
    else teamGroups.push(g);
  });

  // Score each solo user against each team group
  soloGroups.forEach(([userId]) => {
    const user = userById[userId];
    let bestGroup = -1;
    let bestScore = -1;

    teamGroups.forEach((group, idx) => {
      if (group.length >= 5) return;
      const score =
        group.filter((mid) => user.preferences.includes(mid)).length +
        group.filter((mid) =>
          userById[mid].preferences.includes(userId)
        ).length;
      if (score > bestScore || (score === bestScore && (bestGroup === -1 || group.length < teamGroups[bestGroup].length))) {
        bestScore = score;
        bestGroup = idx;
      }
    });

    if (bestGroup >= 0) {
      teamGroups[bestGroup].push(userId);
      placed.push(userId);
    }
  });

  // Step 6: Handle remaining solos (couldn't join any team group)
  const remaining = soloGroups
    .map(([id]) => id)
    .filter((id) => !placed.includes(id));

  if (remaining.length >= 3) {
    // Form their own group(s), capped at 5 per group
    for (let i = 0; i < remaining.length; i += 5) {
      teamGroups.push(remaining.slice(i, i + 5));
    }
  } else if (remaining.length > 0) {
    // Merge into group with most capacity
    const target = [...teamGroups].sort(
      (a, b) => a.length - b.length
    )[0];
    if (target) {
      remaining.forEach((id) => target.push(id));
    } else {
      teamGroups.push(remaining);
    }
  }

  // Build final Team objects
  return teamGroups.map((group) => ({
    id: uuidv4(),
    members: group.map((id) => userById[id]),
  }));
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test components/admin/team-matching/matchTeams.test.ts
```
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add components/admin/team-matching/matchTeams.ts components/admin/team-matching/matchTeams.test.ts
git commit -m "feat: add team matching algorithm with tests"
```

---

## Task 3: PreferenceCombobox

**Files:**
- Create: `components/admin/team-matching/PreferenceCombobox.tsx`

- [ ] **Step 1: Implement the component**

```tsx
// components/admin/team-matching/PreferenceCombobox.tsx
"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { SimUser } from "./types";

type Props = {
  value: string | null; // selected user id
  onChange: (userId: string | null) => void;
  options: SimUser[]; // already filtered: no self, no other selected prefs
  placeholder?: string;
};

export function PreferenceCombobox({ value, onChange, options, placeholder = "Choose user..." }: Props) {
  const [open, setOpen] = useState(false);
  const selectedUser = options.find((u) => u.id === value) ?? null;

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-[#111] border-[#444] text-sm h-8 px-2 font-normal text-left"
          >
            <span className={cn("truncate", !selectedUser && "text-muted-foreground")}>
              {selectedUser ? selectedUser.name : placeholder}
            </span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-0 bg-[#1a1a1a] border-[#333]" align="start">
          <Command className="bg-transparent">
            <CommandInput placeholder="Search..." className="h-8 text-sm" />
            <CommandEmpty className="py-2 text-center text-sm text-muted-foreground">
              No users found.
            </CommandEmpty>
            <CommandGroup>
              {options.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.name}
                  onSelect={() => {
                    onChange(user.id === value ? null : user.id);
                    setOpen(false);
                  }}
                  className="text-sm cursor-pointer"
                >
                  <Check
                    className={cn("mr-2 h-3 w-3", value === user.id ? "opacity-100" : "opacity-0")}
                  />
                  {user.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <button
          onClick={() => onChange(null)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Clear"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/team-matching/PreferenceCombobox.tsx
git commit -m "feat: add PreferenceCombobox for team matching"
```

---

## Task 4: UserCard

**Files:**
- Create: `components/admin/team-matching/UserCard.tsx`

- [ ] **Step 1: Implement the component**

```tsx
// components/admin/team-matching/UserCard.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { PreferenceCombobox } from "./PreferenceCombobox";
import type { SimUser } from "./types";

const MAX_PREFS = 5;

type Props = {
  user: SimUser;
  allUsers: SimUser[];
  totalUsers: number;
  onChange: (updated: SimUser) => void;
  onDelete: (id: string) => void;
};

export function UserCard({ user, allUsers, totalUsers, onChange, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed) onChange({ ...user, name: trimmed });
    else setDraft(user.name);
    setEditing(false);
  };

  const setPreference = (index: number, userId: string | null) => {
    const prefs = [...user.preferences];
    if (userId === null) {
      prefs.splice(index, 1);
    } else {
      prefs[index] = userId;
    }
    onChange({ ...user, preferences: prefs });
  };

  // Options for slot i: all users except self and other already-selected prefs (except slot i itself)
  const optionsFor = (index: number) => {
    const otherSelected = user.preferences.filter((_, j) => j !== index);
    return allUsers.filter((u) => u.id !== user.id && !otherSelected.includes(u.id));
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setDraft(user.name); setEditing(false); }
            }}
            className="bg-transparent border-b border-[#555] text-sm font-semibold text-white outline-none w-32"
          />
        ) : (
          <button
            onClick={() => { setDraft(user.name); setEditing(true); }}
            className="text-sm font-semibold text-white hover:text-purple-400 transition-colors text-left"
            title="Click to rename"
          >
            {user.name}
          </button>
        )}
        <button
          onClick={() => onDelete(user.id)}
          disabled={totalUsers <= 2}
          className="text-muted-foreground hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label={`Delete ${user.name}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Preferences */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground">Preferences (up to {MAX_PREFS})</p>
        {Array.from({ length: MAX_PREFS }).map((_, i) => (
          <PreferenceCombobox
            key={i}
            value={user.preferences[i] ?? null}
            onChange={(val) => setPreference(i, val)}
            options={optionsFor(i)}
            placeholder={`Choice ${i + 1}...`}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/team-matching/UserCard.tsx
git commit -m "feat: add UserCard for team matching"
```

---

## Task 5: TeamResultsPanel

**Files:**
- Create: `components/admin/team-matching/TeamResultsPanel.tsx`

- [ ] **Step 1: Implement the component**

```tsx
// components/admin/team-matching/TeamResultsPanel.tsx

import type { Team } from "./types";

type Props = {
  teams: Team[];
};

export function TeamResultsPanel({ teams }: Props) {
  return (
    <div className="mt-8 border border-[#2a2a2a] rounded-lg p-6 bg-[#0f0f0f]">
      <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
        Simulation Results — {teams.length} team{teams.length !== 1 ? "s" : ""}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {teams.map((team, i) => (
          <div
            key={team.id}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4"
          >
            <p className="text-xs font-semibold text-purple-400 mb-2 uppercase tracking-wider">
              Team {i + 1}
              <span className="text-muted-foreground font-normal ml-2">
                ({team.members.length} member{team.members.length !== 1 ? "s" : ""})
              </span>
            </p>
            <ul className="space-y-1">
              {team.members.map((member) => (
                <li key={member.id} className="text-sm text-white">
                  {member.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/team-matching/TeamResultsPanel.tsx
git commit -m "feat: add TeamResultsPanel for team matching"
```

---

## Task 6: TeamMatchingSimulator (root client component)

**Files:**
- Create: `components/admin/team-matching/TeamMatchingSimulator.tsx`

- [ ] **Step 1: Implement the root component**

```tsx
// components/admin/team-matching/TeamMatchingSimulator.tsx
"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserCard } from "./UserCard";
import { TeamResultsPanel } from "./TeamResultsPanel";
import { matchTeams } from "./matchTeams";
import type { SimUser, Team } from "./types";

const DEFAULT_USERS: SimUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: uuidv4(),
  name: `User ${i + 1}`,
  preferences: [],
}));

export function TeamMatchingSimulator() {
  const [users, setUsers] = useState<SimUser[]>(DEFAULT_USERS);
  const [teams, setTeams] = useState<Team[] | null>(null);

  const updateUser = (updated: SimUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setTeams(null);
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => {
      const next = prev.filter((u) => u.id !== id);
      // Clear any preferences pointing to the deleted user
      return next.map((u) => ({
        ...u,
        preferences: u.preferences.filter((p) => p !== id),
      }));
    });
    setTeams(null);
  };

  const addUser = () => {
    setUsers((prev) => [
      ...prev,
      { id: uuidv4(), name: `User ${prev.length + 1}`, preferences: [] },
    ]);
    setTeams(null);
  };

  const runMatching = () => {
    setTeams(matchTeams(users));
  };

  return (
    <div>
      {/* User grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            allUsers={users}
            totalUsers={users.length}
            onChange={updateUser}
            onDelete={deleteUser}
          />
        ))}

        {/* Add User card */}
        <button
          onClick={addUser}
          className="border-2 border-dashed border-[#333] rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-purple-600 hover:text-purple-400 transition-colors min-h-[200px]"
        >
          <Plus className="h-6 w-6" />
          <span className="text-sm">Add User</span>
        </button>
      </div>

      {/* Run button */}
      <div className="flex justify-center mb-2">
        <Button
          onClick={runMatching}
          disabled={users.length < 2}
          className="bg-purple-700 hover:bg-purple-600 text-white px-10 py-2 text-base font-semibold"
        >
          Run Team Matching
        </Button>
      </div>

      {/* Results */}
      {teams && <TeamResultsPanel teams={teams} />}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/team-matching/TeamMatchingSimulator.tsx
git commit -m "feat: add TeamMatchingSimulator root component"
```

---

## Task 7: Admin Page

**Files:**
- Create: `app/admin/team-matching-simulator/page.tsx`

- [ ] **Step 1: Create the server page**

```tsx
// app/admin/team-matching-simulator/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TeamMatchingSimulator } from "@/components/admin/team-matching/TeamMatchingSimulator";

async function checkAdminAccess() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  if (!roles?.length) redirect("/me");
  return user;
}

export const dynamic = "force-dynamic";

export default async function TeamMatchingSimulatorPage() {
  await checkAdminAccess();

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Team Matching Simulator</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Simulate how students get grouped based on their teammate preferences.
          Mutual picks are guaranteed to be on the same team.
        </p>
      </div>
      <TeamMatchingSimulator />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/team-matching-simulator/page.tsx
git commit -m "feat: add team matching simulator admin page"
```

---

## Task 8: Smoke Test

- [ ] **Step 1: Run the dev server and navigate to the page**

```bash
pnpm dev
```

Open: `http://localhost:3000/admin/team-matching-simulator`

- [ ] **Step 2: Verify these behaviors manually**

  1. Page loads with 5 user cards
  2. Clicking a user name makes it editable inline; pressing Enter or clicking away commits the rename
  3. Preference dropdowns filter by name, exclude self and already-selected users in the same card
  4. Clicking × on a preference clears that slot
  5. Delete button (×) on a user card removes the user and clears any preferences pointing to them
  6. Delete button is disabled when only 2 users remain
  7. "+ Add User" appends a new card
  8. "Run Team Matching" produces a results panel below — mutual picks land in the same team
  9. Re-running after changing preferences replaces the results

- [ ] **Step 3: Run algorithm unit tests one more time**

```bash
pnpm test components/admin/team-matching/matchTeams.test.ts
```
Expected: All tests PASS

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete team matching simulator"
```
