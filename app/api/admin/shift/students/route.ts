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
