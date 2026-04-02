# Team Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-service "find team" flow to the hackathon team page where participants opt in, see who else is looking, pick ranked preferences, and admins preview + confirm team groupings using the existing `matchTeams` algorithm.

**Architecture:** New `hackathon_team_finder` DB table stores opt-ins and preferences. Participant flow lives as a new `"find-team"` view inside the existing `TeamDashboard` component. Admin page at `/admin/hackathon/team-finder` shows all opt-ins, previews groupings client-side, and confirms by creating real teams in the DB.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (service role for writes), TailwindCSS, existing `matchTeams` algo from `components/admin/team-matching/matchTeams.ts`, existing `PreferenceCombobox` + `TeamResultsPanel` components.

---

## File Map

| File | Action |
|------|--------|
| `supabase/migrations/20260403000002_hackathon_team_finder.sql` | Create — DB table + RLS |
| `lib/hackathon/team-finder.ts` | Create — DB operations |
| `app/api/hackathon/team-finder/status/route.ts` | Create — GET status |
| `app/api/hackathon/team-finder/join/route.ts` | Create — POST opt-in |
| `app/api/hackathon/team-finder/preferences/route.ts` | Create — PUT preferences |
| `app/api/admin/hackathon/team-finder/participants/route.ts` | Create — GET all opt-ins (admin) |
| `app/api/admin/hackathon/team-finder/create-teams/route.ts` | Create — POST create teams (admin) |
| `components/hackathon/TeamFinderView.tsx` | Create — participant UI component |
| `components/hackathon/TeamDashboard.tsx` | Modify — add `"find-team"` view + wire |
| `app/admin/hackathon/team-finder/page.tsx` | Create — admin page |
| `components/admin/hackathon/TeamFinderAdminPage.tsx` | Create — admin UI component |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260403000002_hackathon_team_finder.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260403000002_hackathon_team_finder.sql

CREATE TABLE hackathon_team_finder (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  preferences    text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id)
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_hackathon_team_finder_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hackathon_team_finder_updated_at
  BEFORE UPDATE ON hackathon_team_finder
  FOR EACH ROW EXECUTE FUNCTION set_hackathon_team_finder_updated_at();

-- RLS: participants use custom session auth (not Supabase auth), so anon role reads
ALTER TABLE hackathon_team_finder ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.hackathon_team_finder TO anon;
CREATE POLICY "anon_read_hackathon_team_finder"
  ON public.hackathon_team_finder FOR SELECT TO anon USING (true);
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push --local
```

Expected output: migration applied without errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260403000002_hackathon_team_finder.sql
git commit -m "feat: add hackathon_team_finder migration"
```

---

## Task 2: DB Operations Library

**Files:**
- Create: `lib/hackathon/team-finder.ts`

- [ ] **Step 1: Write the library**

```typescript
// lib/hackathon/team-finder.ts
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type TeamFinderEntry = {
  id: string;
  participant_id: string;
  preferences: string[];
  created_at: string;
  updated_at: string;
};

export type TeamFinderParticipant = {
  id: string;
  name: string;
  preferences: string[];
};

export async function getTeamFinderEntry(
  participantId: string
): Promise<TeamFinderEntry | null> {
  const { data } = await getClient()
    .from("hackathon_team_finder")
    .select("*")
    .eq("participant_id", participantId)
    .single();
  return data ?? null;
}

export async function upsertTeamFinderEntry(
  participantId: string,
  preferences: string[]
): Promise<TeamFinderEntry> {
  const { data, error } = await getClient()
    .from("hackathon_team_finder")
    .upsert(
      { participant_id: participantId, preferences },
      { onConflict: "participant_id" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as TeamFinderEntry;
}

export async function listTeamFinderParticipants(): Promise<TeamFinderParticipant[]> {
  const { data, error } = await getClient()
    .from("hackathon_team_finder")
    .select("preferences, hackathon_participants(id, name)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  type Row = { preferences: string[]; hackathon_participants: { id: string; name: string } | null };
  return (data as Row[] ?? []).map((row) => ({
    id: row.hackathon_participants?.id ?? "",
    name: row.hackathon_participants?.name ?? "",
    preferences: row.preferences,
  }));
}

export async function listTeamFinderParticipantsExcluding(
  excludeParticipantId: string
): Promise<TeamFinderParticipant[]> {
  const all = await listTeamFinderParticipants();
  return all.filter((p) => p.id !== excludeParticipantId);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hackathon/team-finder.ts
git commit -m "feat: add team-finder DB operations"
```

---

## Task 3: Participant API Routes

**Files:**
- Create: `app/api/hackathon/team-finder/status/route.ts`
- Create: `app/api/hackathon/team-finder/join/route.ts`
- Create: `app/api/hackathon/team-finder/preferences/route.ts`

- [ ] **Step 1: Write status route**

```typescript
// app/api/hackathon/team-finder/status/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import {
  getTeamFinderEntry,
  listTeamFinderParticipantsExcluding,
} from "@/lib/hackathon/team-finder";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const participant = await getSessionParticipant(token);
    if (!participant) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const [entry, others] = await Promise.all([
      getTeamFinderEntry(participant.id),
      listTeamFinderParticipantsExcluding(participant.id),
    ]);

    return NextResponse.json({
      isOptedIn: entry !== null,
      preferences: entry?.preferences ?? [],
      participants: others,
    });
  } catch (error) {
    console.error("team-finder status error:", error);
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write join route**

```typescript
// app/api/hackathon/team-finder/join/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { upsertTeamFinderEntry } from "@/lib/hackathon/team-finder";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const participant = await getSessionParticipant(token);
    if (!participant) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    await upsertTeamFinderEntry(participant.id, []);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("team-finder join error:", error);
    return NextResponse.json({ error: "Failed to join" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Write preferences route**

```typescript
// app/api/hackathon/team-finder/preferences/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import {
  getTeamFinderEntry,
  upsertTeamFinderEntry,
} from "@/lib/hackathon/team-finder";

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const participant = await getSessionParticipant(token);
    if (!participant) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const entry = await getTeamFinderEntry(participant.id);
    if (!entry) return NextResponse.json({ error: "Not opted in" }, { status: 400 });

    const body = await req.json();
    const preferences: string[] = Array.isArray(body.preferences)
      ? body.preferences
          .filter((id): id is string => typeof id === "string")
          .slice(0, 5)
      : [];

    await upsertTeamFinderEntry(participant.id, preferences);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("team-finder preferences error:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/hackathon/team-finder/
git commit -m "feat: add team-finder participant API routes"
```

---

## Task 4: Admin API Routes

**Files:**
- Create: `app/api/admin/hackathon/team-finder/participants/route.ts`
- Create: `app/api/admin/hackathon/team-finder/create-teams/route.ts`

- [ ] **Step 1: Write admin requireAdmin helper pattern**

The existing admin auth pattern (from `app/api/admin/hackathon/team-matching/run/route.ts`) uses Supabase auth + `user_roles` table check. Both routes use the same pattern.

- [ ] **Step 2: Write participants route**

```typescript
// app/api/admin/hackathon/team-finder/participants/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { listTeamFinderParticipants } from "@/lib/hackathon/team-finder";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  if (!roles?.length) throw new Error("Not authorized");
}

export async function GET() {
  try {
    await requireAdmin();
    const participants = await listTeamFinderParticipants();
    return NextResponse.json({ participants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load";
    const status = message === "Not authenticated" ? 401 : message === "Not authorized" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 3: Write create-teams route**

```typescript
// app/api/admin/hackathon/team-finder/create-teams/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { listTeamFinderParticipants } from "@/lib/hackathon/team-finder";
import { matchTeams } from "@/components/admin/team-matching/matchTeams";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  if (!roles?.length) throw new Error("Not authorized");
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function generateLobbyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST() {
  try {
    await requireAdmin();

    const participants = await listTeamFinderParticipants();
    if (participants.length === 0) {
      return NextResponse.json({ error: "No participants opted in" }, { status: 400 });
    }

    const simUsers = participants.map((p) => ({
      id: p.id,
      name: p.name,
      preferences: p.preferences,
    }));
    const teams = matchTeams(simUsers);

    const supabase = getServiceClient();
    const created: { id: string; name: string; memberIds: string[] }[] = [];

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      const teamName = `Team Finder ${i + 1}`;

      // Try up to 5 times for unique lobby code
      let teamRow: { id: string } | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const lobby_code = generateLobbyCode();
        const { data, error } = await supabase
          .from("hackathon_teams")
          .insert({ name: teamName, lobby_code, owner_id: team.members[0].id })
          .select("id")
          .single();
        if (!error && data) { teamRow = data; break; }
        if (error?.code !== "23505") throw error;
      }
      if (!teamRow) throw new Error("Failed to generate unique lobby code");

      await supabase.from("hackathon_team_members").insert(
        team.members.map((m) => ({ team_id: teamRow!.id, participant_id: m.id }))
      );

      created.push({ id: teamRow.id, name: teamName, memberIds: team.members.map((m) => m.id) });
    }

    return NextResponse.json({ teamsCreated: created.length, teams: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create teams";
    const status = message === "Not authenticated" ? 401 : message === "Not authorized" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/hackathon/team-finder/
git commit -m "feat: add team-finder admin API routes"
```

---

## Task 5: TeamFinderView Component

**Files:**
- Create: `components/hackathon/TeamFinderView.tsx`

This component is used inside `TeamDashboard` for the `"find-team"` view. It reuses `PreferenceCombobox` from `components/admin/team-matching/PreferenceCombobox.tsx`. Note: `PreferenceCombobox` expects `options: SimUser[]` where `SimUser = { id: string; name: string; preferences: string[] }`. We'll pass participants shaped as `SimUser` (with `preferences: []`).

- [ ] **Step 1: Write the component**

```typescript
// components/hackathon/TeamFinderView.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PreferenceCombobox } from "@/components/admin/team-matching/PreferenceCombobox";
import type { SimUser } from "@/components/admin/team-matching/types";

const MAX_PREFS = 5;
const DEBOUNCE_MS = 600;

type Participant = { id: string; name: string };

type Props = {
  participant: Participant;
  onBack: () => void;
};

type Status = "loading" | "not-opted-in" | "opted-in";

export default function TeamFinderView({ participant, onBack }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [others, setOthers] = useState<Participant[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [joining, setJoining] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/hackathon/team-finder/status");
    if (!res.ok) return;
    const data = await res.json();
    setOthers(data.participants);
    setPreferences(data.preferences);
    setStatus(data.isOptedIn ? "opted-in" : "not-opted-in");
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleJoin = async () => {
    setJoining(true);
    const res = await fetch("/api/hackathon/team-finder/join", { method: "POST" });
    setJoining(false);
    if (res.ok) {
      await fetchStatus();
    }
  };

  const savePreferences = useCallback(async (prefs: string[]) => {
    setSaveMsg("กำลังบันทึก...");
    const res = await fetch("/api/hackathon/team-finder/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: prefs }),
    });
    setSaveMsg(res.ok ? "บันทึกแล้ว" : "บันทึกไม่สำเร็จ");
    setTimeout(() => setSaveMsg(""), 2000);
  }, []);

  const setPreference = (index: number, userId: string | null) => {
    const next = [...preferences];
    if (userId === null) {
      next.splice(index, 1);
    } else {
      next[index] = userId;
    }
    setPreferences(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => savePreferences(next), DEBOUNCE_MS);
  };

  const optionsFor = (index: number): SimUser[] => {
    const otherSelected = preferences.filter((_, j) => j !== index);
    return others
      .filter((p) => !otherSelected.includes(p.id))
      .map((p) => ({ id: p.id, name: p.name, preferences: [] }));
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-[family-name:var(--font-mitr)]">
        <p className="text-gray-400">กำลังโหลด...</p>
      </div>
    );
  }

  if (status === "not-opted-in") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 font-[family-name:var(--font-mitr)]">
        <div className="bg-[#1a1a2e]/80 border border-[#6a9ac4]/30 rounded-3xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-medium text-white mb-2">หาทีม</h2>
          <p className="text-gray-400 text-sm mb-6">
            เข้าร่วมเพื่อดูคนอื่นที่กำลังหาทีมและเลือกคนที่คุณอยากร่วมทีมด้วย
          </p>
          <p className="text-[#8abade] font-medium mb-6">{participant.name}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onBack}
              className="px-6 py-2 rounded-xl border border-[#444] text-gray-400 hover:text-white transition-colors text-sm"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="px-6 py-2 rounded-xl bg-[#6a9ac4] hover:bg-[#8abade] text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {joining ? "กำลังเข้าร่วม..." : "เข้าร่วมหาทีม"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // opted-in
  return (
    <div className="min-h-screen px-4 py-8 font-[family-name:var(--font-mitr)] text-white max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-medium">หาทีม</h2>
          <p className="text-gray-400 text-sm mt-1">
            {others.length + 1} คนกำลังหาทีม
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          ออก
        </button>
      </div>

      <div className="bg-[#1a1a2e]/80 border border-[#6a9ac4]/30 rounded-2xl p-6">
        <p className="text-sm text-gray-400 mb-4">
          เลือกคนที่คุณอยากร่วมทีมด้วย (สูงสุด {MAX_PREFS} คน, เรียงตามลำดับความต้องการ)
        </p>
        <div className="flex flex-col gap-2">
          {Array.from({ length: MAX_PREFS }).map((_, i) => (
            <PreferenceCombobox
              key={i}
              value={preferences[i] ?? null}
              onChange={(val) => setPreference(i, val)}
              options={optionsFor(i)}
              placeholder={`อันดับ ${i + 1}...`}
            />
          ))}
        </div>
        {saveMsg && (
          <p className="text-xs text-gray-400 mt-3 text-right">{saveMsg}</p>
        )}
      </div>

      <div className="mt-6">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">
          ทุกคนที่หาทีม ({others.length} คน)
        </p>
        <div className="flex flex-wrap gap-2">
          {others.map((p) => (
            <span
              key={p.id}
              className="text-sm px-3 py-1 rounded-full bg-[#1a1a2e] border border-[#333] text-gray-300"
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/hackathon/TeamFinderView.tsx
git commit -m "feat: add TeamFinderView component"
```

---

## Task 6: Wire TeamFinderView into TeamDashboard

**Files:**
- Modify: `components/hackathon/TeamDashboard.tsx`

There are two changes:
1. Add `"find-team"` to the `View` type.
2. Change the "หาทีม" button handler to set `view = "find-team"` instead of calling `handleStartMatching()` when there's no active matching event.
3. Add a `if (view === "find-team")` render branch that returns `<TeamFinderView>`.

- [ ] **Step 1: Add import at top of TeamDashboard**

Find the existing imports block (line ~1-8) and add:

```typescript
import TeamFinderView from "@/components/hackathon/TeamFinderView";
```

- [ ] **Step 2: Update the View type**

Find:
```typescript
type View = "home" | "create" | "join" | "matching";
```
Replace with:
```typescript
type View = "home" | "create" | "join" | "matching" | "find-team";
```

- [ ] **Step 3: Add find-team render branch**

Find the `// ─── Matching View ─────────────────────────────────────────────────────` block (around line 499) and **before** it, add:

```typescript
// ─── Find Team View ────────────────────────────────────────────────────────
if (view === "find-team") {
    return (
        <div className="min-h-screen relative text-white font-[family-name:var(--font-mitr)] overflow-hidden">
            <FractalGlassBackground />
            <div className="relative z-10">
                <TeamFinderView
                    participant={participant}
                    onBack={() => setView("home")}
                />
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Update "หาทีม" button handler**

Find the button handler (around line 647-653):
```typescript
onClick={() => {
    if (hasActiveMatchingEvent) {
        router.push("/hackathon/matching");
        return;
    }
    handleStartMatching();
}}
```
Replace with:
```typescript
onClick={() => {
    if (hasActiveMatchingEvent) {
        router.push("/hackathon/matching");
        return;
    }
    setView("find-team");
}}
```

- [ ] **Step 5: Verify the page loads**

Start dev server (`pnpm dev`), navigate to `/hackathon/team` (while logged in), click "หาทีม". Should show the TeamFinderView opt-in screen.

- [ ] **Step 6: Commit**

```bash
git add components/hackathon/TeamDashboard.tsx
git commit -m "feat: wire TeamFinderView into TeamDashboard"
```

---

## Task 7: Admin Page Component

**Files:**
- Create: `components/admin/hackathon/TeamFinderAdminPage.tsx`

- [ ] **Step 1: Write the component**

```typescript
// components/admin/hackathon/TeamFinderAdminPage.tsx
"use client";

import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamResultsPanel } from "@/components/admin/team-matching/TeamResultsPanel";
import { matchTeams } from "@/components/admin/team-matching/matchTeams";
import type { Team } from "@/components/admin/team-matching/types";

type Participant = {
  id: string;
  name: string;
  preferences: string[];
};

export default function TeamFinderAdminPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{ teamsCreated: number } | null>(null);
  const [error, setError] = useState("");

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError("");
    setTeams(null);
    setConfirmed(false);
    setConfirmResult(null);
    const res = await fetch("/api/admin/hackathon/team-finder/participants");
    setLoading(false);
    if (!res.ok) { setError("โหลดข้อมูลไม่สำเร็จ"); return; }
    const data = await res.json();
    setParticipants(data.participants ?? []);
  }, []);

  const runMatching = () => {
    const simUsers = participants.map((p) => ({
      id: p.id,
      name: p.name,
      preferences: p.preferences,
    }));
    setTeams(matchTeams(simUsers));
    setConfirmed(false);
    setConfirmResult(null);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError("");
    const res = await fetch("/api/admin/hackathon/team-finder/create-teams", { method: "POST" });
    setConfirming(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "สร้างทีมไม่สำเร็จ");
      return;
    }
    const data = await res.json();
    setConfirmed(true);
    setConfirmResult({ teamsCreated: data.teamsCreated });
  };

  // Name lookup map for displaying preferences
  const nameById = Object.fromEntries(participants.map((p) => [p.id, p.name]));

  return (
    <div>
      {/* Header actions */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          onClick={fetchParticipants}
          disabled={loading}
          variant="outline"
          className="border-[#333] bg-[#1a1a1a] text-white hover:bg-[#222] gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {participants.length === 0 ? "โหลดข้อมูล" : "รีเฟรช"}
        </Button>
        {participants.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {participants.length} คนกำลังหาทีม
          </span>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Participants grid */}
      {participants.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {participants.map((p) => (
            <div
              key={p.id}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4"
            >
              <p className="text-sm font-semibold text-white mb-2">{p.name}</p>
              {p.preferences.length > 0 ? (
                <ol className="list-decimal list-inside space-y-0.5">
                  {p.preferences.map((prefId, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      {nameById[prefId] ?? prefId}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-muted-foreground italic">ยังไม่ได้เลือก</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Run matching */}
      {participants.length >= 2 && (
        <div className="flex justify-center mb-2">
          <Button
            onClick={runMatching}
            className="bg-purple-700 hover:bg-purple-600 text-white px-10 py-2 text-base font-semibold"
          >
            จำลองการจับทีม
          </Button>
        </div>
      )}

      {/* Preview results */}
      {teams && (
        <>
          <TeamResultsPanel teams={teams} />

          {!confirmed && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="bg-green-700 hover:bg-green-600 text-white px-10 py-2 text-base font-semibold"
              >
                {confirming ? "กำลังสร้างทีม..." : "ยืนยันและสร้างทีม"}
              </Button>
            </div>
          )}

          {confirmed && confirmResult && (
            <div className="mt-6 text-center">
              <p className="text-green-400 font-medium">
                สร้างทีมสำเร็จ {confirmResult.teamsCreated} ทีม
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/hackathon/TeamFinderAdminPage.tsx
git commit -m "feat: add TeamFinderAdminPage component"
```

---

## Task 8: Admin Page Route

**Files:**
- Create: `app/admin/hackathon/team-finder/page.tsx`

- [ ] **Step 1: Write the page**

```typescript
// app/admin/hackathon/team-finder/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import TeamFinderAdminPage from "@/components/admin/hackathon/TeamFinderAdminPage";

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

export default async function HackathonTeamFinderAdminPage() {
  await checkAdminAccess();

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Team Finder — Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">
          ดูว่าใครกำลังหาทีม จำลองการจับกลุ่ม และยืนยันเพื่อสร้างทีมจริง
        </p>
      </div>
      <TeamFinderAdminPage />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/hackathon/team-finder/
git commit -m "feat: add admin team-finder page"
```

---

## Task 9: End-to-End Smoke Test

Manual verification steps — no automated tests since this feature uses custom session auth that bypasses standard Supabase auth.

- [ ] **Step 1: Participant flow**

1. Start dev server: `pnpm dev`
2. Log in as a hackathon participant at `/hackathon/login`
3. Navigate to `/hackathon/team`
4. Click "หาทีม" — should show TeamFinderView opt-in screen with your name shown
5. Click "เข้าร่วมหาทีม" — should transition to preferences screen
6. Verify "X คนกำลังหาทีม" count shown
7. Open a second participant session (different browser/incognito), repeat steps 2-6
8. Go back to first session, verify second participant appears in the dropdown
9. Select the second participant as preference 1 — save message should appear then disappear
10. Navigate away to home view (click "ออก") and click "หาทีม" again — preferences should be restored

- [ ] **Step 2: Admin flow**

1. Log in as admin at `/login` (Supabase auth)
2. Navigate to `/admin/hackathon/team-finder`
3. Click "โหลดข้อมูล" — should show opted-in participants with their preferences
4. Click "จำลองการจับทีม" — TeamResultsPanel should appear with grouped teams
5. Click "ยืนยันและสร้างทีม" — success message "สร้างทีมสำเร็จ X ทีม" should appear, button disappears
6. Verify teams were created: check participant team pages or Supabase dashboard

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: team-finder smoke test fixes"
```
