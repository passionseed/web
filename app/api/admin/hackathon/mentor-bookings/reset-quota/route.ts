import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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

// POST /api/admin/hackathon/mentor-bookings/reset-quota
// Cancels all active (non-cancelled) bookings so every team gets their 1 chance back.
// Teams with no bookings are unaffected (they already have 1 chance).
export async function POST() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceClient();

  // Find all active bookings (pending or confirmed)
  const { data: activeBookings, error: fetchError } = await supabase
    .from("mentor_bookings")
    .select("id")
    .neq("status", "cancelled");

  if (fetchError) {
    console.error("reset-quota fetch error:", fetchError);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }

  if (!activeBookings || activeBookings.length === 0) {
    return NextResponse.json({ reset: 0, message: "No active bookings to reset" });
  }

  const ids = activeBookings.map((b) => b.id);

  const { error: updateError } = await supabase
    .from("mentor_bookings")
    .update({
      status: "cancelled",
      cancellation_reason: "รีเซ็ตสิทธิ์โดย Admin",
    })
    .in("id", ids);

  if (updateError) {
    console.error("reset-quota update error:", updateError);
    return NextResponse.json({ error: "Failed to reset bookings" }, { status: 500 });
  }

  return NextResponse.json({ reset: ids.length });
}
