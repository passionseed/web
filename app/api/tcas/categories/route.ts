import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // Fetch all program faculties for counting
  const { data: programs, error: programsError } = await supabase
    .from("tcas_programs")
    .select("faculty_name")
    .not("faculty_name", "is", null)
    .not("faculty_name", "eq", "");

  if (programsError) {
    return NextResponse.json({ error: programsError.message }, { status: 500 });
  }

  // Fetch unique universities with their names
  const { data: universities, error: universityError } = await supabase
    .from("tcas_universities")
    .select("university_name")
    .order("university_name");

  if (universityError) {
    return NextResponse.json({ error: universityError.message }, { status: 500 });
  }

  const facultyCounts = programs.reduce<Record<string, number>>((acc, program) => {
    const name = program.faculty_name?.trim();
    if (!name) return acc;
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});

  const sortedFaculties = Object.entries(facultyCounts)
    .sort(([aName, aCount], [bName, bCount]) => {
      const byCount = bCount - aCount;
      return byCount !== 0 ? byCount : aName.localeCompare(bName);
    })
    .map(([name]) => name);

  return NextResponse.json({
    faculties: sortedFaculties,
    universities: universities.map((u) => u.university_name).filter(Boolean),
  });
}
