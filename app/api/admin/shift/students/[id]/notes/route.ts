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
