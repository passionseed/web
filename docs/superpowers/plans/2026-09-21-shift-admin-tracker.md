# SHIFT Admin Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin page at `/admin/shift` to track SHIFT kids (name, IG, Discord) with a freeform dated log of weekly notes per kid.

**Architecture:** Two new Supabase tables (`shift_students`, `shift_student_notes`) with admin-only RLS, four Next.js API routes guarded by `requireAdmin`, and a client-component admin UI following the `AdminBetaRegistrations` pattern. Spec: `docs/superpowers/specs/2026-09-21-shift-admin-tracker-design.md`.

**Tech Stack:** Next.js 15.4.5 App Router, Supabase (SSR client via `@supabase/ssr`), shadcn/ui, TailwindCSS, sonner, date-fns, Jest.

## Global Constraints

- Migrations apply **directly to production** (no local Supabase). Keep them additive and idempotent: `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `DROP TRIGGER IF EXISTS`, `CREATE INDEX IF NOT EXISTS`.
- Supabase SSR only via `@supabase/ssr` with `getAll()`/`setAll()` cookie methods. Never `@supabase/auth-helpers-nextjs`.
- Admin API routes use `requireAdmin` from `lib/security/route-guards.ts`; DB work uses `admin.value.supabase` (the SSR client). Do NOT use `createAdminClient()` here.
- Next.js 15 route handlers: `params` is a `Promise` and must be awaited.
- No em dashes (—) in user-facing copy.
- Test command: `pnpm test -- <path>` (Jest, alias `@/` mapped to repo root).
- Lint: `pnpm lint`. Build: `pnpm build`.

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260921000000_create_shift_tracker.sql`

**Interfaces:**
- Produces: tables `public.shift_students(id, full_name, ig_handle, discord_handle, created_at, updated_at)` and `public.shift_student_notes(id, student_id, week_label, body, created_by, created_at, updated_at)`. Later tasks query exactly these columns.

- [ ] **Step 1: Write the migration**

Modeled on `supabase/migrations/20260412000000_admin_submission_comments.sql`:

```sql
-- SHIFT cohort tracker: kids and their weekly notes (admin-only)

CREATE TABLE IF NOT EXISTS public.shift_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  ig_handle TEXT,
  discord_handle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shift_students IS 'SHIFT cohort kids tracked by admins (name, IG, Discord)';

CREATE TABLE IF NOT EXISTS public.shift_student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.shift_students(id) ON DELETE CASCADE,
  week_label TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_student_notes_student_created
  ON public.shift_student_notes(student_id, created_at DESC);

COMMENT ON TABLE public.shift_student_notes IS 'Freeform dated weekly notes per SHIFT student, written by admins';

ALTER TABLE public.shift_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_student_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage shift students" ON public.shift_students;
CREATE POLICY "Admins can manage shift students"
  ON public.shift_students
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins can manage shift student notes" ON public.shift_student_notes;
CREATE POLICY "Admins can manage shift student notes"
  ON public.shift_student_notes
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_students TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_student_notes TO service_role;

DROP TRIGGER IF EXISTS shift_students_handle_updated_at ON public.shift_students;
CREATE TRIGGER shift_students_handle_updated_at
  BEFORE UPDATE ON public.shift_students
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS shift_student_notes_handle_updated_at ON public.shift_student_notes;
CREATE TRIGGER shift_student_notes_handle_updated_at
  BEFORE UPDATE ON public.shift_student_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

- [ ] **Step 2: Apply to the production database**

Run: `supabase db push`

CAUTION: this applies pending migrations to production (repo convention: no local DB). It is additive and idempotent, so it is safe, but confirm with the user before running it if they have other pending migrations.

Expected output includes: `Applying migration 20260921000000_create_shift_tracker.sql...`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260921000000_create_shift_tracker.sql
git commit -m "Add SHIFT tracker tables (shift_students, shift_student_notes)"
```

---

### Task 2: Shared types and helpers (TDD)

**Files:**
- Create: `types/shift.ts`
- Create: `lib/shift/week-label.ts`
- Create: `lib/shift/handles.ts`
- Test: `lib/shift/__tests__/week-label.test.ts`
- Test: `lib/shift/__tests__/handles.test.ts`

**Interfaces:**
- Produces:
  - `types/shift.ts`: `ShiftStudent`, `ShiftStudentNote`, `ShiftStudentSummary`, `ShiftStudentsResponse` (exact shapes below; API routes and UI import these)
  - `getShiftWeekLabel(date?: Date): string` — e.g. `"Week 1"`
  - `cleanHandle(value: unknown): string | null` — trims, strips one leading `@`, empty → `null`
- Consumes: `SHIFT_COHORT.startDate` from `lib/content/shift-cohort.ts` (currently `"2026-09-28"`)

- [ ] **Step 1: Write the failing tests**

`lib/shift/__tests__/week-label.test.ts`:

```ts
import { getShiftWeekLabel } from "../week-label";

// SHIFT_COHORT.startDate is "2026-09-28"
describe("getShiftWeekLabel", () => {
  it("returns Week 1 before the cohort starts", () => {
    expect(getShiftWeekLabel(new Date("2026-09-21T12:00:00"))).toBe("Week 1");
  });

  it("returns Week 1 on the cohort start date", () => {
    expect(getShiftWeekLabel(new Date("2026-09-28T09:00:00"))).toBe("Week 1");
  });

  it("returns Week 1 six days in", () => {
    expect(getShiftWeekLabel(new Date("2026-10-04T23:59:59"))).toBe("Week 1");
  });

  it("returns Week 2 on the exact 7-day boundary", () => {
    expect(getShiftWeekLabel(new Date("2026-10-05T00:00:00"))).toBe("Week 2");
  });

  it("counts later weeks", () => {
    expect(getShiftWeekLabel(new Date("2026-10-19T10:00:00"))).toBe("Week 4");
  });
});
```

`lib/shift/__tests__/handles.test.ts`:

```ts
import { cleanHandle } from "../handles";

describe("cleanHandle", () => {
  it("trims whitespace", () => {
    expect(cleanHandle("  somkid  ")).toBe("somkid");
  });

  it("strips a leading @", () => {
    expect(cleanHandle("@somkid")).toBe("somkid");
  });

  it("returns null for empty or blank input", () => {
    expect(cleanHandle("")).toBeNull();
    expect(cleanHandle("   ")).toBeNull();
    expect(cleanHandle("@")).toBeNull();
  });

  it("returns null for non-strings", () => {
    expect(cleanHandle(undefined)).toBeNull();
    expect(cleanHandle(null)).toBeNull();
    expect(cleanHandle(42)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- lib/shift/__tests__ --coverage=false`
Expected: FAIL — `Cannot find module '../week-label'` and `Cannot find module '../handles'`

- [ ] **Step 3: Write the implementations**

`lib/shift/week-label.ts`:

```ts
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "Week N" counted from the cohort start date (Week 1 starts on startDate).
 * Dates before the cohort start clamp to Week 1.
 */
export function getShiftWeekLabel(date: Date = new Date()): string {
  const start = new Date(`${SHIFT_COHORT.startDate}T00:00:00`);
  const days = Math.floor((date.getTime() - start.getTime()) / DAY_MS);
  const week = Math.max(1, Math.floor(days / 7) + 1);
  return `Week ${week}`;
}
```

`lib/shift/handles.ts`:

```ts
/** Normalize a social handle from form input: trim, drop one leading "@",
 *  and treat blank input as absent. */
export function cleanHandle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^@/, "").trim();
  return trimmed === "" ? null : trimmed;
}
```

`types/shift.ts`:

```ts
export interface ShiftStudent {
  id: string;
  full_name: string;
  ig_handle: string | null;
  discord_handle: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftStudentNote {
  id: string;
  student_id: string;
  week_label: string;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftStudentSummary extends ShiftStudent {
  note_count: number;
  latest_note: Pick<ShiftStudentNote, "body" | "week_label" | "created_at"> | null;
  has_note_this_week: boolean;
}

export interface ShiftStudentsResponse {
  students: ShiftStudentSummary[];
  stats: {
    totalKids: number;
    notesThisWeek: number;
    kidsMissingNoteThisWeek: number;
    currentWeekLabel: string;
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- lib/shift/__tests__ --coverage=false`
Expected: PASS — 9 tests, 2 suites

- [ ] **Step 5: Commit**

```bash
git add types/shift.ts lib/shift/
git commit -m "Add SHIFT tracker types and week-label/handle helpers"
```

---

### Task 3: Students API routes

**Files:**
- Create: `app/api/admin/shift/students/route.ts`
- Create: `app/api/admin/shift/students/[id]/route.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `safeServerError` from `@/lib/security/route-guards`; `getShiftWeekLabel` from `@/lib/shift/week-label`; `cleanHandle` from `@/lib/shift/handles`; types from `@/types/shift`.
- Produces:
  - `GET /api/admin/shift/students` → `200 ShiftStudentsResponse` | `401/403 { error }`
  - `POST /api/admin/shift/students` body `{ full_name, ig_handle?, discord_handle? }` → `201 { student: ShiftStudent }` | `400 { error }`
  - `PATCH /api/admin/shift/students/[id]` body: any subset of the three fields → `200 { student: ShiftStudent }` | `400`
  - `DELETE /api/admin/shift/students/[id]` → `200 { success: true }`

- [ ] **Step 1: Create `app/api/admin/shift/students/route.ts`**

```ts
import { NextResponse } from "next/server";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { cleanHandle } from "@/lib/shift/handles";
import { getShiftWeekLabel } from "@/lib/shift/week-label";
import type { ShiftStudentSummary, ShiftStudentsResponse } from "@/types/shift";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase } = admin.value;

    const { data: students, error } = await supabase
      .from("shift_students")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      return NextResponse.json({ error: "Failed to load students" }, { status: 500 });
    }

    const { data: notes, error: notesError } = await supabase
      .from("shift_student_notes")
      .select("student_id, week_label, body, created_at")
      .order("created_at", { ascending: false });
    if (notesError) {
      return NextResponse.json({ error: "Failed to load notes" }, { status: 500 });
    }

    const currentWeekLabel = getShiftWeekLabel();
    const allNotes = notes ?? [];

    const summaries: ShiftStudentSummary[] = (students ?? []).map((student) => {
      const studentNotes = allNotes.filter((n) => n.student_id === student.id);
      const latest = studentNotes[0] ?? null;
      return {
        ...student,
        note_count: studentNotes.length,
        latest_note: latest
          ? { body: latest.body, week_label: latest.week_label, created_at: latest.created_at }
          : null,
        has_note_this_week: studentNotes.some((n) => n.week_label === currentWeekLabel),
      };
    });

    const response: ShiftStudentsResponse = {
      students: summaries,
      stats: {
        totalKids: summaries.length,
        notesThisWeek: allNotes.filter((n) => n.week_label === currentWeekLabel).length,
        kidsMissingNoteThisWeek: summaries.filter((s) => !s.has_note_this_week).length,
        currentWeekLabel,
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    return safeServerError("Failed to load SHIFT students", error);
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase } = admin.value;
    const body = await request.json();

    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    if (!fullName) {
      return NextResponse.json({ error: "full_name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("shift_students")
      .insert({
        full_name: fullName,
        ig_handle: cleanHandle(body.ig_handle),
        discord_handle: cleanHandle(body.discord_handle),
      })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: "Failed to add student" }, { status: 500 });
    }

    return NextResponse.json({ student: data }, { status: 201 });
  } catch (error) {
    return safeServerError("Failed to add SHIFT student", error);
  }
}
```

- [ ] **Step 2: Create `app/api/admin/shift/students/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { cleanHandle } from "@/lib/shift/handles";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const { supabase } = admin.value;
    const body = await request.json();

    const updates: Record<string, string | null> = {};

    if ("full_name" in body) {
      const name = typeof body.full_name === "string" ? body.full_name.trim() : "";
      if (!name) {
        return NextResponse.json({ error: "full_name cannot be empty" }, { status: 400 });
      }
      updates.full_name = name;
    }
    if ("ig_handle" in body) updates.ig_handle = cleanHandle(body.ig_handle);
    if ("discord_handle" in body) updates.discord_handle = cleanHandle(body.discord_handle);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("shift_students")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
    }

    return NextResponse.json({ student: data });
  } catch (error) {
    return safeServerError("Failed to update SHIFT student", error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const { supabase } = admin.value;

    const { error } = await supabase.from("shift_students").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: "Failed to remove student" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return safeServerError("Failed to remove SHIFT student", error);
  }
}
```

- [ ] **Step 3: Lint the new routes**

Run: `pnpm lint`
Expected: no errors in `app/api/admin/shift/`

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/shift/students/
git commit -m "Add SHIFT students admin API routes"
```

---

### Task 4: Notes API routes

**Files:**
- Create: `app/api/admin/shift/students/[id]/notes/route.ts`
- Create: `app/api/admin/shift/notes/[id]/route.ts`

**Interfaces:**
- Consumes: same guards/helpers as Task 3; `ShiftStudentNote` from `@/types/shift`.
- Produces:
  - `GET /api/admin/shift/students/[id]/notes` → `200 { notes: ShiftStudentNote[] }` (newest first)
  - `POST /api/admin/shift/students/[id]/notes` body `{ week_label, body }` → `201 { note: ShiftStudentNote }` | `400`
  - `PATCH /api/admin/shift/notes/[id]` body: any subset of `{ week_label, body }` → `200 { note: ShiftStudentNote }` | `400`
  - `DELETE /api/admin/shift/notes/[id]` → `200 { success: true }`

- [ ] **Step 1: Create `app/api/admin/shift/students/[id]/notes/route.ts`**

```ts
import { NextResponse } from "next/server";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const { supabase } = admin.value;

    const { data, error } = await supabase
      .from("shift_student_notes")
      .select("*")
      .eq("student_id", id)
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: "Failed to load notes" }, { status: 500 });
    }

    return NextResponse.json({ notes: data ?? [] });
  } catch (error) {
    return safeServerError("Failed to load SHIFT notes", error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const { supabase, userId } = admin.value;
    const body = await request.json();

    const weekLabel = typeof body.week_label === "string" ? body.week_label.trim() : "";
    const noteBody = typeof body.body === "string" ? body.body.trim() : "";
    if (!weekLabel || !noteBody) {
      return NextResponse.json(
        { error: "week_label and body are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("shift_student_notes")
      .insert({
        student_id: id,
        week_label: weekLabel,
        body: noteBody,
        created_by: userId,
      })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
    }

    return NextResponse.json({ note: data }, { status: 201 });
  } catch (error) {
    return safeServerError("Failed to add SHIFT note", error);
  }
}
```

- [ ] **Step 2: Create `app/api/admin/shift/notes/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

type RouteContext = { params: Promise<{ id: string }> };

function cleanRequiredText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const { supabase } = admin.value;
    const body = await request.json();

    const updates: Record<string, string> = {};

    if ("week_label" in body) {
      const weekLabel = cleanRequiredText(body.week_label);
      if (!weekLabel) {
        return NextResponse.json({ error: "week_label cannot be empty" }, { status: 400 });
      }
      updates.week_label = weekLabel;
    }
    if ("body" in body) {
      const noteBody = cleanRequiredText(body.body);
      if (!noteBody) {
        return NextResponse.json({ error: "body cannot be empty" }, { status: 400 });
      }
      updates.body = noteBody;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("shift_student_notes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
    }

    return NextResponse.json({ note: data });
  } catch (error) {
    return safeServerError("Failed to update SHIFT note", error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const { supabase } = admin.value;

    const { error } = await supabase.from("shift_student_notes").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return safeServerError("Failed to delete SHIFT note", error);
  }
}
```

- [ ] **Step 3: Lint the new routes**

Run: `pnpm lint`
Expected: no errors in `app/api/admin/shift/`

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/shift/
git commit -m "Add SHIFT weekly notes admin API routes"
```

---

### Task 5: Admin UI

**Files:**
- Create: `components/admin/ShiftStudentNotesPanel.tsx`
- Create: `components/admin/AdminShiftTracker.tsx`
- Create: `app/admin/shift/page.tsx`
- Modify: `components/admin/AdminNav.tsx:14` (insert SHIFT item after Beta)

**Interfaces:**
- Consumes: all four route groups from Tasks 3-4; `ShiftStudentsResponse`, `ShiftStudentSummary`, `ShiftStudentNote` from `@/types/shift`.
- Produces: `<AdminShiftTracker />` rendered by `app/admin/shift/page.tsx`; `<ShiftStudentNotesPanel studentId currentWeekLabel onChanged />` used inside it.

- [ ] **Step 1: Create `components/admin/ShiftStudentNotesPanel.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ShiftStudentNote } from "@/types/shift";

interface ShiftStudentNotesPanelProps {
  studentId: string;
  currentWeekLabel: string;
  onChanged: () => Promise<void> | void;
}

export function ShiftStudentNotesPanel({
  studentId,
  currentWeekLabel,
  onChanged,
}: ShiftStudentNotesPanelProps) {
  const [notes, setNotes] = useState<ShiftStudentNote[] | null>(null);
  const [weekLabel, setWeekLabel] = useState(currentWeekLabel);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeek, setEditWeek] = useState("");
  const [editBody, setEditBody] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/shift/students/${studentId}/notes`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setNotes(json.notes);
    } catch {
      toast.error("Failed to load notes");
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!weekLabel.trim() || !body.trim()) {
      toast.error("Week label and note are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shift/students/${studentId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_label: weekLabel.trim(), body: body.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Note added");
      setBody("");
      await load();
      await onChanged();
    } catch {
      toast.error("Failed to add note");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(note: ShiftStudentNote) {
    setEditingId(note.id);
    setEditWeek(note.week_label);
    setEditBody(note.body);
  }

  async function saveEdit(noteId: string) {
    if (!editWeek.trim() || !editBody.trim()) {
      toast.error("Week label and note are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shift/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_label: editWeek.trim(), body: editBody.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Note updated");
      setEditingId(null);
      await load();
      await onChanged();
    } catch {
      toast.error("Failed to update note");
    } finally {
      setSaving(false);
    }
  }

  async function removeNote(noteId: string) {
    if (!window.confirm("Delete this note?")) return;
    try {
      const res = await fetch(`/api/admin/shift/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Note deleted");
      await load();
      await onChanged();
    } catch {
      toast.error("Failed to delete note");
    }
  }

  return (
    <div className="space-y-4 rounded-md bg-muted/40 p-4">
      <form onSubmit={addNote} className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={weekLabel}
            onChange={(e) => setWeekLabel(e.target.value)}
            placeholder="Week 1"
            className="w-28"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened with this kid this week?"
            rows={2}
            className="flex-1"
          />
        </div>
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add note
        </Button>
      </form>

      {notes === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading notes...
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-md border bg-background p-3">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Input
                    value={editWeek}
                    onChange={(e) => setEditWeek(e.target.value)}
                    className="w-28"
                  />
                  <Textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(note.id)} disabled={saving}>
                      <Check className="mr-1 h-4 w-4" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="mr-1 h-4 w-4" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{note.week_label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), "d MMM yyyy, HH:mm")}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(note)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => removeNote(note.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `components/admin/AdminShiftTracker.tsx`**

```tsx
"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShiftStudentNotesPanel } from "@/components/admin/ShiftStudentNotesPanel";
import type { ShiftStudentSummary, ShiftStudentsResponse } from "@/types/shift";

const EMPTY_KID = { full_name: "", ig_handle: "", discord_handle: "" };

export function AdminShiftTracker() {
  const [data, setData] = useState<ShiftStudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_KID);
  const [newKid, setNewKid] = useState(EMPTY_KID);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shift/students");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load SHIFT students");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addKid(e: React.FormEvent) {
    e.preventDefault();
    if (!newKid.full_name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/shift/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newKid),
      });
      if (!res.ok) throw new Error();
      toast.success(`Added ${newKid.full_name.trim()}`);
      setNewKid(EMPTY_KID);
      await load();
    } catch {
      toast.error("Failed to add student");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(student: ShiftStudentSummary) {
    setEditingId(student.id);
    setEditForm({
      full_name: student.full_name,
      ig_handle: student.ig_handle ?? "",
      discord_handle: student.discord_handle ?? "",
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.full_name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shift/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      toast.success("Student updated");
      setEditingId(null);
      await load();
    } catch {
      toast.error("Failed to update student");
    } finally {
      setSaving(false);
    }
  }

  async function removeKid(student: ShiftStudentSummary) {
    if (!window.confirm(`Remove ${student.full_name} and all their notes?`)) return;
    try {
      const res = await fetch(`/api/admin/shift/students/${student.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success(`Removed ${student.full_name}`);
      if (expandedId === student.id) setExpandedId(null);
      await load();
    } catch {
      toast.error("Failed to remove student");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading SHIFT tracker...
      </div>
    );
  }

  const stats = data?.stats ?? {
    totalKids: 0,
    notesThisWeek: 0,
    kidsMissingNoteThisWeek: 0,
    currentWeekLabel: "Week 1",
  };
  const students = data?.students ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kids tracked
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.totalKids}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Notes in {stats.currentWeekLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.notesThisWeek}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Missing a note this week
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {stats.kidsMissingNoteThisWeek}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Add a kid</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addKid} className="flex flex-wrap gap-2">
            <Input
              value={newKid.full_name}
              onChange={(e) => setNewKid({ ...newKid, full_name: e.target.value })}
              placeholder="Full name"
              className="w-48"
            />
            <Input
              value={newKid.ig_handle}
              onChange={(e) => setNewKid({ ...newKid, ig_handle: e.target.value })}
              placeholder="IG handle"
              className="w-40"
            />
            <Input
              value={newKid.discord_handle}
              onChange={(e) => setNewKid({ ...newKid, discord_handle: e.target.value })}
              placeholder="Discord handle"
              className="w-40"
            />
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {students.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No kids added yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>IG</TableHead>
              <TableHead>Discord</TableHead>
              <TableHead>Last note</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <Fragment key={student.id}>
                <TableRow>
                  {editingId === student.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editForm.full_name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, full_name: e.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.ig_handle}
                          onChange={(e) =>
                            setEditForm({ ...editForm, ig_handle: e.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.discord_handle}
                          onChange={(e) =>
                            setEditForm({ ...editForm, discord_handle: e.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell colSpan={2} />
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => saveEdit(student.id)}
                            disabled={saving}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(expandedId === student.id ? null : student.id)
                          }
                          className="flex items-center gap-1 font-medium hover:underline"
                        >
                          {expandedId === student.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {student.full_name}
                        </button>
                      </TableCell>
                      <TableCell>
                        {student.ig_handle ? (
                          <a
                            href={`https://instagram.com/${student.ig_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            @{student.ig_handle}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.discord_handle ?? (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.latest_note ? (
                          <span className="text-sm">
                            <Badge variant="secondary" className="mr-1">
                              {student.latest_note.week_label}
                            </Badge>
                            {formatDistanceToNow(new Date(student.latest_note.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No notes yet</span>
                        )}
                      </TableCell>
                      <TableCell>{student.note_count}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => startEdit(student)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => removeKid(student)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
                {expandedId === student.id && editingId !== student.id && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <ShiftStudentNotesPanel
                        studentId={student.id}
                        currentWeekLabel={stats.currentWeekLabel}
                        onChanged={load}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `app/admin/shift/page.tsx`**

```tsx
import { AdminShiftTracker } from "@/components/admin/AdminShiftTracker";

export const dynamic = "force-dynamic";

export default function AdminShiftPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold">SHIFT Tracker</h2>
      <p className="text-sm text-muted-foreground">
        Track cohort kids and log weekly notes.
      </p>
      <AdminShiftTracker />
    </div>
  );
}
```

- [ ] **Step 4: Add the nav item**

In `components/admin/AdminNav.tsx`, insert after the Beta entry (line 14):

```ts
  { href: "/admin/beta", label: "Beta" },
  { href: "/admin/shift", label: "SHIFT" },
```

- [ ] **Step 5: Lint**

Run: `pnpm lint`
Expected: no errors in the new/modified files

- [ ] **Step 6: Commit**

```bash
git add components/admin/ShiftStudentNotesPanel.tsx components/admin/AdminShiftTracker.tsx components/admin/AdminNav.tsx app/admin/shift/
git commit -m "Add SHIFT tracker admin page"
```

---

### Task 6: Build and end-to-end smoke test

**Files:**
- No new files; verifies Tasks 1-5 together.

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Production build**

Run: `pnpm build`
Expected: build succeeds; `/admin/shift` appears in the route list.

- [ ] **Step 2: Unauthenticated smoke test**

Run: `pnpm dev` (background), wait for ready, then:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/admin/shift/students
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin/shift
```

Expected: API returns `401`; page returns `307` (redirect to `/login`).

- [ ] **Step 3: Authenticated admin walkthrough (manual, in browser)**

Log in as an admin, go to `/admin/shift`, and verify:
1. Add a kid with name, IG (with a leading `@`, confirm it is stripped in the table), Discord.
2. Expand the row, add a note (week label prefilled with the current `Week N`).
3. Edit the note, then edit the kid's IG.
4. Confirm the stats row counts update.
5. Delete the note, then delete the kid (confirm prompt appears).
6. As a non-admin account (or logged out), confirm `/admin/shift` redirects and the API returns 401/403.

- [ ] **Step 4: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "Fix issues found in SHIFT tracker smoke test"
```
