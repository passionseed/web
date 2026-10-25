import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { enrollLinkedStudents } from "@/lib/shift/join";
import { recordBrainEvent } from "@/lib/brain/events";

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
  // Students who linked Discord before this camp existed join it now.
  if (action === "create_cohort") {
    after(() => enrollLinkedStudents().then(() => undefined));
    after(() => recordCohortCreated(payload));
  }
  return NextResponse.json(data);
}

/** Company brain: the cohort name and start date only. */
function recordCohortCreated(payload: Record<string, unknown>) {
  const startsOn = typeof payload.starts_on === "string" ? payload.starts_on.slice(0, 10) : "";
  return recordBrainEvent(
    {
      type: "shift_camp_cohort_created",
      payload: {
        name: typeof payload.name === "string" ? payload.name.trim() : "",
        ...(/^\d{4}-\d{2}-\d{2}$/.test(startsOn) ? { starts_on: startsOn } : {}),
      },
    },
    "admin/shift/camp",
  );
}
