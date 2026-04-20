import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { clearDraft } from "@/lib/hackathon/ai-grader";

function getHackathonServiceClient() {
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

  return roles?.length ? user : null;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ scope: string; id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { scope: rawScope, id } = await params;
  if (rawScope !== "individual" && rawScope !== "team") {
    return NextResponse.json({ error: "Invalid submission scope" }, { status: 400 });
  }

  try {
    await clearDraft(getHackathonServiceClient(), rawScope as "individual" | "team", id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin/hackathon/ai-draft/discard] error:", err);
    return NextResponse.json({ error: "Failed to discard draft", detail: err?.message }, { status: 500 });
  }
}
