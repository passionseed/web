import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const participant = await getSessionParticipant(token);
    if (participant) return NextResponse.json({ participant });
  }

  // Fall back: allow Supabase admins through without a hackathon registration
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

      if (roles && roles.length > 0) {
        return NextResponse.json({
          participant: {
            id: user.id,
            name: user.email ?? "Admin",
            email: user.email ?? "",
            phone: "",
            university: "PassionSeed",
            role: "Admin",
            track: "",
            grade_level: "",
            experience_level: 0,
            referral_source: "",
            bio: "",
            team_name: null,
            created_at: new Date().toISOString(),
            is_admin: true,
          },
        });
      }
    }
  } catch {
    // Supabase unavailable — fall through to 401
  }

  return NextResponse.json({ participant: null }, { status: 401 });
}
