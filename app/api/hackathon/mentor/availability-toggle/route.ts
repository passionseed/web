import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMentorBySessionToken, MENTOR_SESSION_COOKIE } from "@/lib/hackathon/mentor-db";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// PATCH /api/hackathon/mentor/availability-toggle
// Body: { is_accepting_bookings: boolean }
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const isAccepting = Boolean(body.is_accepting_bookings);

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("mentor_profiles")
    .update({ is_accepting_bookings: isAccepting })
    .eq("id", mentor.id);

  if (error) {
    console.error("availability-toggle error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ is_accepting_bookings: isAccepting });
}
