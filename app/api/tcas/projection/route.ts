import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Format for visualization
  const nodes = data.map((p: any) => ({
    id: p.program_id,
    name: p.program_name,
    faculty: p.faculty_name,
    university: p.tcas_universities?.university_name,
    x: p.projection_2d[0] * 100, // Scale for better visualization
    y: p.projection_2d[1] * 100,
  }));

  return NextResponse.json({ nodes });
}
