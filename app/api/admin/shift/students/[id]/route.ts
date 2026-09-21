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
