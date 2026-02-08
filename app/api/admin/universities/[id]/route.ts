import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const { supabase } = admin.value;
    const body = await request.json();
    const {
      name,
      short_name,
      website_url,
      logo_url,
      description,
      admission_requirements,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "University name is required" }, { status: 400 });
    }

    const { data: university, error } = await supabase
      .from("universities")
      .update({
        name: name.trim(),
        short_name: short_name?.trim() || null,
        website_url: website_url?.trim() || null,
        logo_url: logo_url?.trim() || null,
        description: description?.trim() || null,
        admission_requirements: admission_requirements?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update university" }, { status: 500 });
    }

    return NextResponse.json({ university });
  } catch (error) {
    return safeServerError("Internal server error", error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const { supabase } = admin.value;

    const { data: targets, error: targetsError } = await supabase
      .from("user_university_targets")
      .select("id")
      .eq("university_id", id)
      .limit(1);

    if (targetsError) {
      return NextResponse.json({ error: "Failed to check university usage" }, { status: 500 });
    }

    if (targets && targets.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete university that is selected by users" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("universities").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: "Failed to delete university" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return safeServerError("Internal server error", error);
  }
}
