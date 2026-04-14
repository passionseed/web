import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// University brand colors for visualization
const UNIVERSITY_COLORS: Record<string, string> = {
  "จุฬาลงกรณ์มหาวิทยาลัย": "#E5007D", // Pink
  "มหาวิทยาลัยมหิดล": "#0066CC", // Blue
  "มหาวิทยาลัยธรรมศาสตร์": "#FFD700", // Gold
  "มหาวิทยาลัยเกษตรศาสตร์": "#228B22", // Green
  "มหาวิทยาลัยเชียงใหม่": "#800080", // Purple
  "มหาวิทยาลัยขอนแก่น": "#FF6600", // Orange
  "มหาวิทยาลัยสงขลานครินทร์": "#008B8B", // Teal
  "สถาบันเทคโนโลยีพระจอมเกล้าคุณทหารลาดกระบัง": "#C41E3A", // Cardinal
  "มหาวิทยาลัยศรีนครินทรวิโรฒ": "#4169E1", // Royal Blue
  "มหาวิทยาลัยบูรพา": "#DC143C", // Crimson
};

// Faculty category colors
const FACULTY_COLORS: Record<string, string> = {
  "วิศวกรรม": "#ff6b4a",
  "วิทยาศาสตร์": "#38bdf8",
  "แพทย์": "#fb7185",
  "พยาบาล": "#f472b6",
  "ทันตแพทย์": "#fbbf24",
  "เภสัช": "#a78bfa",
  "บริหารธุรกิจ": "#facc15",
  "เศรษฐศาสตร์": "#22d3ee",
  "นิติศาสตร์": "#f97316",
  "อักษรศาสตร์": "#c084fc",
  "ศิลปกรรม": "#ec4899",
  "ครุศาสตร์": "#10b981",
  "จิตวิทยา": "#8b5cf6",
  "สถาปัตยกรรม": "#06b6d4",
  "การสื่อสาร": "#f43f5e",
  "การท่องเที่ยว": "#14b8a6",
  "วิทยาการสารสนเทศ": "#6366f1",
  "คอมพิวเตอร์": "#0ea5e9",
  "เทคโนโลยี": "#8b5cf6",
};

function getFacultyColor(facultyName: string | null): string {
  if (!facultyName) return "#94a3b8";

  for (const [key, color] of Object.entries(FACULTY_COLORS)) {
    if (facultyName.includes(key)) return color;
  }
  return "#94a3b8"; // Default gray
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch programs with projection data
    const { data: programs, error: programsError } = await supabase
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
      .not("projection_2d", "is", null)
      .limit(200);

    if (programsError) {
      console.error("Error fetching programs:", programsError);
      return NextResponse.json({ error: programsError.message }, { status: 500 });
    }

    // Get stats
    const { count: totalPrograms } = await supabase
      .from("tcas_programs")
      .select("*", { count: "exact", head: true });

    const { data: universitiesData } = await supabase
      .from("tcas_universities")
      .select("university_id, university_name");

    // Normalize projection coordinates to 0-1 range
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    const rawNodes = (programs || []).map((p: any) => {
      const [x, y] = p.projection_2d || [0, 0];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      return {
        id: p.program_id,
        name: p.program_name,
        faculty: p.faculty_name,
        universityId: p.university_id,
        universityName: p.tcas_universities?.university_name,
        rawX: x,
        rawY: y,
      };
    });

    // Normalize and transform nodes
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 0.1; // 10% padding from edges

    const nodes = rawNodes.map((node) => ({
      id: node.id,
      name: node.name,
      faculty: node.faculty,
      universityId: node.universityId,
      universityName: node.universityName,
      x: padding + ((node.rawX - minX) / rangeX) * (1 - 2 * padding),
      y: padding + ((node.rawY - minY) / rangeY) * (1 - 2 * padding),
      color: getFacultyColor(node.faculty),
    }));

    // Create university hubs with aggregated data
    const universityMap = new Map<string, {
      id: string;
      name: string;
      programs: typeof nodes;
      color: string;
    }>();

    nodes.forEach((node) => {
      if (!node.universityId || !node.universityName) return;

      if (!universityMap.has(node.universityId)) {
        universityMap.set(node.universityId, {
          id: node.universityId,
          name: node.universityName,
          programs: [],
          color: UNIVERSITY_COLORS[node.universityName] || "#ff6b4a",
        });
      }
      universityMap.get(node.universityId)!.programs.push(node);
    });

    // Calculate hub positions (centroid of programs)
    const hubs = Array.from(universityMap.values())
      .filter((hub) => hub.programs.length > 0)
      .map((hub) => ({
        id: hub.id,
        name: hub.name,
        x: hub.programs.reduce((sum, p) => sum + p.x, 0) / hub.programs.length,
        y: hub.programs.reduce((sum, p) => sum + p.y, 0) / hub.programs.length,
        programCount: hub.programs.length,
        color: hub.color,
      }))
      .sort((a, b) => b.programCount - a.programCount)
      .slice(0, 20); // Top 20 universities

    return NextResponse.json({
      nodes,
      hubs,
      stats: {
        totalPrograms: totalPrograms || 0,
        totalUniversities: universitiesData?.length || 0,
        displayedPrograms: nodes.length,
        displayedUniversities: hubs.length,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    console.error("Error in hero-galaxy API:", error);
    return NextResponse.json(
      { error: "Failed to fetch galaxy data" },
      { status: 500 }
    );
  }
}