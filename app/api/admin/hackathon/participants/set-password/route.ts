import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { hashPassword } from "@/lib/hackathon/auth";

function getHackathonServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
  if (!roles?.length) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { participantId, password, rawHash } = await req.json();
  if (!participantId || (!password && !rawHash)) return NextResponse.json({ error: "Missing participantId or password" }, { status: 400 });

  // rawHash = restore original hash directly; password = set new plaintext password
  const password_hash = rawHash ?? hashPassword(password);
  const serviceClient = getHackathonServiceClient();

  const { error } = await serviceClient
    .from("hackathon_participants")
    .update({ password_hash })
    .eq("id", participantId);

  if (error) {
    console.error("[admin] set-password error:", error);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
