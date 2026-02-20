import { NextRequest, NextResponse } from "next/server";
import { runPhase1Workflow } from "@/lib/ps-b2b/orchestrator";
import { phase1WorkflowInputSchema } from "@/lib/ps-b2b/schema";
import { createClient } from "@/utils/supabase/server";

async function requirePSRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, status: 401, error: "Unauthorized" };
  }

  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) {
    return { authorized: false, status: 500, error: error.message };
  }

  const isAuthorized = (roles || []).some((entry) => entry.role === "passion-seed-team");
  if (!isAuthorized) {
    return { authorized: false, status: 403, error: "Forbidden" };
  }

  return { authorized: true, status: 200, error: null };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePSRole();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const payload = await request.json();
    const parsed = phase1WorkflowInputSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await runPhase1Workflow(parsed.data);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to run Phase 1 workflow";
    console.error("[ps-b2b.phase1] failed", error);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
