import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

const input = z.object({
  action: z.enum([
    "create_cohort",
    "enroll",
    "create_group",
    "assign_group",
    "checkpoint",
    "resolve_request",
    "moderate",
    "moderate_comment",
    "moderate_message",
    "message",
  ]),
  cohort_id: z.string().uuid().nullable(),
  payload: z.record(z.unknown()).default({}),
});
export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const id = request.nextUrl.searchParams.get("cohort");
  if (id && !z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: "Invalid cohort ID" }, { status: 400 });
  const { data, error } = await guard.value.supabase.rpc("shift_camp_action", {
    p_action: id ? "snapshot" : "list",
    p_cohort_id: id,
    p_payload: {},
  });
  if (error)
    return safeServerError(
      "Could not load SHIFT camp. Check that its migration is installed.",
      error,
    );
  return NextResponse.json(data);
}
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 40000)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = input.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid camp action" }, { status: 400 });
  const { action, cohort_id, payload } = parsed.data;
  const { data, error } = await guard.value.supabase.rpc("shift_camp_action", {
    p_action: action,
    p_cohort_id: cohort_id,
    p_payload: payload,
  });
  if (error)
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "42501" ? 403 : 400 },
    );
  return NextResponse.json(data);
}
