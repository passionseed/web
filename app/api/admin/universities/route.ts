import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

export async function GET(_request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase } = admin.value;
    const { data: universities, error } = await supabase
      .from("universities")
      .select("*")
      .order("name");

    if (error) {
      return NextResponse.json({ error: "Failed to fetch universities" }, { status: 500 });
    }

    return NextResponse.json({ universities });
  } catch (error) {
    return safeServerError("Internal server error", error);
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
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
      .insert({
        name: name.trim(),
        short_name: short_name?.trim() || null,
        website_url: website_url?.trim() || null,
        logo_url: logo_url?.trim() || null,
        description: description?.trim() || null,
        admission_requirements: admission_requirements?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create university" }, { status: 500 });
    }

    return NextResponse.json({ university });
  } catch (error) {
    return safeServerError("Internal server error", error);
  }
}
