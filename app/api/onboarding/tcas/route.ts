import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

const UNIVERSITY_LIMIT = 8;
const PROGRAM_LIMIT = 10;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const rawQuery = searchParams.get("q")?.trim() ?? "";
  const universityId = searchParams.get("universityId")?.trim() ?? "";

  if (kind !== "universities" && kind !== "programs") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (kind === "universities") {
    let query = supabase
      .from("tcas_universities")
      .select("university_id, university_name, university_name_en")
      .order("university_name", { ascending: true })
      .limit(UNIVERSITY_LIMIT);

    if (rawQuery) {
      const escaped = escapeLike(rawQuery);
      query = query.or(
        `university_name.ilike.%${escaped}%,university_name_en.ilike.%${escaped}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("[onboarding/tcas] university search failed", error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    return NextResponse.json({
      items: (data ?? []).map((row) => ({
        universityId: row.university_id,
        universityName: row.university_name,
        universityNameEn: row.university_name_en,
      })),
    });
  }

  if (!universityId) {
    return NextResponse.json({ items: [] });
  }

  let query = supabase
    .from("tcas_programs")
    .select(
      "program_id, program_name, program_name_en, faculty_name, university_id"
    )
    .eq("university_id", universityId)
    .order("faculty_name", { ascending: true })
    .order("program_name", { ascending: true })
    .limit(PROGRAM_LIMIT);

  if (rawQuery) {
    const escaped = escapeLike(rawQuery);
    query = query.or(
      `program_name.ilike.%${escaped}%,program_name_en.ilike.%${escaped}%,faculty_name.ilike.%${escaped}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("[onboarding/tcas] program search failed", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  return NextResponse.json({
    items: (data ?? []).map((row) => ({
      programId: row.program_id,
      programName: row.program_name,
      programNameEn: row.program_name_en,
      facultyName: row.faculty_name,
      universityId: row.university_id,
    })),
  });
}

function escapeLike(value: string) {
  return value.replace(/[%_,]/g, (match) => `\\${match}`);
}
