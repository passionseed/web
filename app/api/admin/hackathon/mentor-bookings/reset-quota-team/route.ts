import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  if (!roles || roles.length === 0) return null;
  return user;
}

// POST /api/admin/hackathon/mentor-bookings/reset-quota-team
// Body: { team_id: string }
// Deletes all mentor bookings for a specific team so they get their 1 chance back.
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { team_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.team_id) {
    return NextResponse.json({ error: "team_id is required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: bookings, error: fetchError } = await supabase
    .from("mentor_bookings")
    .select("id")
    .eq("team_id", body.team_id);

  if (fetchError) {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ reset: 0, message: "No bookings found for this team" });
  }

  const ids = bookings.map((b) => b.id);

  const { error: deleteError } = await supabase
    .from("mentor_bookings")
    .delete()
    .in("id", ids);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to reset bookings" }, { status: 500 });
  }

  return NextResponse.json({ reset: ids.length });
}
