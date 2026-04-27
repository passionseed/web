# Admin Mentor-Team Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to assign mentors to hackathon teams from the admin teams page; mentor dashboard shows admin-assigned teams read-only (no self-assign).

**Architecture:** Remove self-assign UI from `MentorTeamSubmissions`. Add mentor assignment UI inside the existing team expanded row in `AdminHackathonTeams`. Three new API routes handle read/assign/unassign of mentor-team links. All data goes through the existing `mentor_team_assignments` table (`mentor_id` + `team_id`).

**Tech Stack:** Next.js App Router API routes, Supabase service-role client (`HACKATHON_SUPABASE_URL` + `HACKATHON_SUPABASE_SERVICE_ROLE_KEY`), React client components, TailwindCSS, Framer Motion, Lucide icons.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `components/hackathon/mentor/MentorTeamSubmissions.tsx` | Remove self-assign button and TeamPickerModal |
| Create | `app/api/admin/hackathon/teams/[teamId]/mentor-assignments/route.ts` | GET assigned mentors, POST assign, DELETE unassign |
| Modify | `components/admin/AdminHackathonTeams.tsx` | Add `MentorAssignmentRow` inside expanded team row |

---

## Task 1: Remove self-assign from MentorTeamSubmissions

**Files:**
- Modify: `components/hackathon/mentor/MentorTeamSubmissions.tsx`

This removes the `TeamPickerModal`, `handlePick`, `showPicker`, `assigning` state, and the "Add Team" `+` card. The team grid becomes read-only — it just shows admin-assigned teams. The empty state message changes to reflect that admin assigns teams.

- [ ] **Step 1: Open the file and locate the pieces to remove**

In `components/hackathon/mentor/MentorTeamSubmissions.tsx`, identify:
- `TeamPickerModal` component (lines ~259–384)
- `showPicker` and `assigning` state variables
- `handlePick` async function
- `{showPicker && <TeamPickerModal ... />}` JSX
- The "Add Team" `+` card button (the last item in `<div className="grid grid-cols-2 gap-3">`)
- The empty state paragraph referencing "Add Team"

- [ ] **Step 2: Remove TeamPickerModal component**

Delete the entire `TeamPickerModal` function (from `function TeamPickerModal(` to its closing `}`). It's no longer needed.

- [ ] **Step 3: Remove self-assign state and handler from MentorTeamSubmissions**

In `export function MentorTeamSubmissions()`, remove these lines:

```tsx
const [assigning, setAssigning] = useState(false);
const [showPicker, setShowPicker] = useState(false);
```

And remove the entire `handlePick` function:

```tsx
async function handlePick(teamId: string) {
  setAssigning(true);
  try {
    ...
  } finally {
    setAssigning(false);
  }
}
```

Also remove the unused `Plus` import from lucide-react at the top.

- [ ] **Step 4: Remove TeamPickerModal usage and Add Team card from JSX**

In the `// ─── Team Grid View ─────────────────────────────────────────────────────────` return block:

Remove:
```tsx
{showPicker && (
  <TeamPickerModal
    allTeams={allTeams}
    onPick={handlePick}
    onClose={() => setShowPicker(false)}
  />
)}
```

Remove the entire "Add Team" card button:
```tsx
{/* "+" add team card */}
<button
  onClick={() => setShowPicker(true)}
  disabled={assigning}
  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all min-h-[100px]"
  ...
>
  ...
</button>
```

- [ ] **Step 5: Update empty state message**

Replace:
```tsx
{assignedTeams.length === 0 && (
  <p
    className="mt-4 text-center text-sm font-[family-name:var(--font-mitr)]"
    style={{ color: "#3d5a6e" }}
  >
    Click &ldquo;Add Team&rdquo; to self-assign a team and view their submissions.
  </p>
)}
```

With:
```tsx
{assignedTeams.length === 0 && (
  <p
    className="mt-4 text-center text-sm font-[family-name:var(--font-mitr)]"
    style={{ color: "#3d5a6e" }}
  >
    No teams assigned yet. An admin will assign teams to you.
  </p>
)}
```

- [ ] **Step 6: Verify the mentor dashboard still loads**

Run `pnpm dev` and navigate to `/hackathon/mentor/dashboard`. Switch to the "Team Submissions" tab. Confirm:
- No "Add Team" card
- No picker modal
- Assigned teams (if any) still appear as clickable cards
- Empty state shows the new message

- [ ] **Step 7: Commit**

```bash
git add components/hackathon/mentor/MentorTeamSubmissions.tsx
git commit -m "feat(mentor): remove self-assign — admin-only team assignment"
```

---

## Task 2: Create admin mentor-assignments API route

**Files:**
- Create: `app/api/admin/hackathon/teams/[teamId]/mentor-assignments/route.ts`

This route handles all mentor assignment operations for a specific team. Uses the same `requireAdmin` pattern as other admin hackathon routes. Uses the hackathon service client (`HACKATHON_SUPABASE_URL` + `HACKATHON_SUPABASE_SERVICE_ROLE_KEY`).

- [ ] **Step 1: Create the file with boilerplate and helpers**

Create `app/api/admin/hackathon/teams/[teamId]/mentor-assignments/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getHackathonClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  if (!roles || roles.length === 0) return null;
  return user;
}
```

- [ ] **Step 2: Add GET handler — fetch assigned mentors for a team**

Append to the same file:

```ts
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { teamId } = await params;
  const db = getHackathonClient();

  const { data, error } = await db
    .from("mentor_team_assignments")
    .select("id, mentor_id, assigned_at, mentor_profiles(id, full_name, email, session_type, photo_url)")
    .eq("team_id", teamId)
    .order("assigned_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data ?? [] });
}
```

- [ ] **Step 3: Add POST handler — assign a mentor to the team**

Append to the same file:

```ts
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { teamId } = await params;
  const body = await req.json();
  const { mentor_id } = body as { mentor_id?: string };
  if (!mentor_id) return NextResponse.json({ error: "mentor_id required" }, { status: 400 });

  const db = getHackathonClient();

  // Idempotent — skip if already assigned
  const { data: existing } = await db
    .from("mentor_team_assignments")
    .select("id")
    .eq("mentor_id", mentor_id)
    .eq("team_id", teamId)
    .maybeSingle();

  if (existing) return NextResponse.json({ success: true, already_assigned: true });

  const { error } = await db.from("mentor_team_assignments").insert({
    mentor_id,
    team_id: teamId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, already_assigned: false });
}
```

- [ ] **Step 4: Add DELETE handler — unassign a mentor from the team**

Append to the same file:

```ts
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { teamId } = await params;
  const body = await req.json();
  const { mentor_id } = body as { mentor_id?: string };
  if (!mentor_id) return NextResponse.json({ error: "mentor_id required" }, { status: 400 });

  const db = getHackathonClient();

  const { error } = await db
    .from("mentor_team_assignments")
    .delete()
    .eq("mentor_id", mentor_id)
    .eq("team_id", teamId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Smoke test the GET endpoint**

With `pnpm dev` running, log in as admin and visit:
`/api/admin/hackathon/teams/<any-valid-team-id>/mentor-assignments`

Expected: `{ "assignments": [] }` (or existing assignments if any).

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/hackathon/teams/[teamId]/mentor-assignments/route.ts
git commit -m "feat(admin): add mentor-assignment API routes for teams"
```

---

## Task 3: Add MentorAssignmentRow component to AdminHackathonTeams

**Files:**
- Modify: `components/admin/AdminHackathonTeams.tsx`

Add a self-contained `MentorAssignmentRow` component that:
1. Fetches current mentor assignments for a team on mount
2. Shows assigned mentors as removable badges
3. Has an inline mentor picker (dropdown of group mentors) to assign new ones

This component is rendered inside the existing expanded team row in `AdminHackathonTeams`, below `TeamMessageForm`.

- [ ] **Step 1: Add types for mentor assignment data**

At the top of `components/admin/AdminHackathonTeams.tsx`, after the existing type definitions, add:

```tsx
interface AssignedMentor {
  id: string; // assignment id
  mentor_id: string;
  assigned_at: string;
  mentor_profiles: {
    id: string;
    full_name: string;
    email: string;
    session_type: string;
    photo_url: string | null;
  } | null;
}

interface MentorOption {
  id: string;
  full_name: string;
  email: string;
  photo_url: string | null;
}
```

- [ ] **Step 2: Create the MentorAssignmentRow component**

Add this component before the `LeaderboardView` function in `AdminHackathonTeams.tsx`:

```tsx
function MentorAssignmentRow({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [assignments, setAssignments] = useState<AssignedMentor[]>([]);
  const [mentorOptions, setMentorOptions] = useState<MentorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/hackathon/teams/${teamId}/mentor-assignments`).then((r) => r.json()),
      fetch("/api/admin/hackathon/mentors").then((r) => r.json()),
    ]).then(([assignData, mentorData]) => {
      setAssignments(assignData.assignments ?? []);
      // Only show approved group mentors as options
      const groupMentors = (mentorData.mentors ?? []).filter(
        (m: MentorOption & { is_approved: boolean; session_type: string }) =>
          m.session_type === "group" && m.is_approved
      );
      setMentorOptions(groupMentors);
    }).finally(() => setLoading(false));
  }, [teamId]);

  async function handleAssign() {
    if (!selectedMentorId) return;
    setAssigning(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hackathon/teams/${teamId}/mentor-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentor_id: selectedMentorId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to assign"); return; }
      // Reload assignments
      const updated = await fetch(`/api/admin/hackathon/teams/${teamId}/mentor-assignments`).then((r) => r.json());
      setAssignments(updated.assignments ?? []);
      setSelectedMentorId("");
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(mentorId: string) {
    setRemoving(mentorId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hackathon/teams/${teamId}/mentor-assignments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentor_id: mentorId }),
      });
      if (!res.ok) { setError("Failed to remove"); return; }
      setAssignments((prev) => prev.filter((a) => a.mentor_id !== mentorId));
    } finally {
      setRemoving(null);
    }
  }

  // Mentors not yet assigned to this team
  const assignedMentorIds = new Set(assignments.map((a) => a.mentor_id));
  const availableOptions = mentorOptions.filter((m) => !assignedMentorIds.has(m.id));

  if (loading) {
    return (
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading mentor assignments...
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-3" onClick={(e) => e.stopPropagation()}>
      <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
        <Users className="h-3 w-3" />
        Assigned Mentors — {teamName}
      </span>

      {/* Current assignments */}
      {assignments.length === 0 ? (
        <p className="text-xs text-slate-500">No mentors assigned yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs text-indigo-200"
            >
              <span>{a.mentor_profiles?.full_name ?? a.mentor_id}</span>
              <button
                onClick={() => handleRemove(a.mentor_id)}
                disabled={removing === a.mentor_id}
                className="text-indigo-400 hover:text-red-400 transition-colors ml-0.5"
              >
                {removing === a.mentor_id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Assign new mentor */}
      {availableOptions.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedMentorId}
            onChange={(e) => setSelectedMentorId(e.target.value)}
            className="flex-1 h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
          >
            <option value="">Select a group mentor...</option>
            {availableOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} ({m.email})
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={assigning || !selectedMentorId}
            className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
          >
            {assigning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Assign
          </Button>
        </div>
      )}

      {availableOptions.length === 0 && assignments.length > 0 && (
        <p className="text-xs text-slate-500">All available group mentors are assigned.</p>
      )}

      {availableOptions.length === 0 && assignments.length === 0 && (
        <p className="text-xs text-slate-500">No approved group mentors available to assign.</p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Render MentorAssignmentRow inside the expanded team row (browser tab)**

In `AdminHackathonTeams`, find the browser tab expanded row content. It ends with `<TeamMessageForm ... />`. Add `<MentorAssignmentRow />` directly after it:

```tsx
<TeamMessageForm
  teamId={team.id}
  teamName={team.name}
  memberCount={team.hackathon_team_members.length}
/>
<MentorAssignmentRow
  teamId={team.id}
  teamName={team.name}
/>
```

This is inside the `<motion.div>` AnimatePresence block for `expandedTeamId === team.id` in the **browser tab** section (around line 1220 of the original file).

- [ ] **Step 4: Verify admin teams page**

With `pnpm dev` running, navigate to `/admin/hackathon/teams`. Click "Team Browser" tab. Expand any team row. Confirm:
- "Assigned Mentors" section appears below "Message Team"
- Shows "No mentors assigned yet." for unassigned teams
- Dropdown shows only approved `group` mentors
- Selecting a mentor and clicking "Assign" adds a badge
- Clicking X on a badge removes the assignment

- [ ] **Step 5: Verify mentor dashboard reflects admin assignment**

Log in at `/hackathon/mentor/login` as a group mentor. Navigate to dashboard → "Team Submissions" tab. Confirm the team assigned in step 4 now appears as a card. Confirm no "Add Team" button is visible.

- [ ] **Step 6: Commit**

```bash
git add components/admin/AdminHackathonTeams.tsx
git commit -m "feat(admin): assign/unassign mentors to teams from team browser"
```

---

## Self-Review

**Spec coverage:**
- [x] Remove self-assign from mentor dashboard → Task 1
- [x] Admin can assign mentor to team from teams page → Task 3
- [x] Admin can unassign mentor from team → Task 3 (`handleRemove`)
- [x] Mentor dashboard shows admin-assigned teams read-only → Task 1 (existing GET logic unchanged, UI just loses picker)
- [x] API routes for read/assign/unassign → Task 2

**Placeholder scan:** None found — all steps have concrete code.

**Type consistency:**
- `AssignedMentor.mentor_profiles` matches the shape returned by Supabase join in `GET` handler
- `MentorOption` used in `mentorOptions` state matches the filter cast in `useEffect`
- `mentor_id` used in `POST`/`DELETE` body matches what the API routes destructure

**Edge cases covered:**
- Idempotent assign (already_assigned check in POST)
- Only approved `group` mentors shown in dropdown
- Assigned mentors filtered out of dropdown (can't double-assign)
- Loading and error states in `MentorAssignmentRow`
