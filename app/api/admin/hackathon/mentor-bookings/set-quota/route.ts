import { NextRequest, NextResponse } from "next/server";
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

// GET - return current quota
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceClient();
  const { data } = await supabase
    .from("hackathon_booking_config")
    .select("max_bookings_per_team")
    .eq("id", 1)
    .maybeSingle();

  return NextResponse.json({ max_bookings_per_team: data?.max_bookings_per_team ?? 1 });
}

// POST - set quota { max_bookings_per_team: number }
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const value = Number(body.max_bookings_per_team);
  if (!Number.isInteger(value) || value < 1) {
    return NextResponse.json({ error: "max_bookings_per_team must be a positive integer" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("hackathon_booking_config")
    .upsert({ id: 1, max_bookings_per_team: value, updated_at: new Date().toISOString() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ max_bookings_per_team: value });
}
