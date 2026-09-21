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
