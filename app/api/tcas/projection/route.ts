import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const value = searchParams.get("value");

  const supabase = await createClient();

  let query = supabase
    .from("tcas_programs")
    .select(`
      program_id,
      program_name,
      faculty_name,
      university_id,
      projection_2d,
      tcas_universities (
        university_name
      )
    `)
    .not("projection_2d", "is", null);

  // Apply category filter
  if (category === "faculty" && value) {
    query = query.eq("faculty_name", value);
  } else if (category === "university" && value) {
    query = query.eq("tcas_universities.university_name", value);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let programs = data;

  if (category === "popular") {
    const facultyCounts = programs.reduce<Record<string, number>>((acc, row) => {
      const faculty = row.faculty_name ?? "Unknown";
      acc[faculty] = (acc[faculty] ?? 0) + 1;
      return acc;
    }, {});

    programs = programs
      .slice()
      .sort((a, b) => {
        const aCount = facultyCounts[a.faculty_name ?? "Unknown"] ?? 0;
        const bCount = facultyCounts[b.faculty_name ?? "Unknown"] ?? 0;
        return bCount - aCount;
      })
      .slice(0, 300);
  }

  // Format for visualization
  const nodes = programs.map((p: any) => ({
    id: p.program_id,
    name: p.program_name,
    faculty: p.faculty_name,
    university: p.tcas_universities?.university_name,
    x: p.projection_2d[0] * 100, // Scale for better visualization
    y: p.projection_2d[1] * 100,
  }));

  return NextResponse.json({ nodes });
}
