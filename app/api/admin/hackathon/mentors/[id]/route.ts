import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getHackathonServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY!
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id } = await params;
  const client = getHackathonServiceClient();

  // Delete sessions, availability, bookings, then profile
  await client.from("mentor_sessions").delete().eq("mentor_id", id);
  await client.from("mentor_availability").delete().eq("mentor_id", id);
  await client.from("mentor_bookings").delete().eq("mentor_id", id);

  const { error } = await client.from("mentor_profiles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete mentor" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
