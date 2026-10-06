import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/security/route-guards";
import type { CompanionToday } from "@/lib/shift/companion-contract";

export const dynamic = "force-dynamic";
const uuid = z.string().uuid();
const input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_cohort"),
    name: z.string().trim().min(1).max(120),
    starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) => {
      const parsed = new Date(`${date}T00:00:00Z`);
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
    }),
  }).strict(),
  z.object({ action: z.literal("issue_code"), cohort_id: uuid }).strict(),
  z.object({ action: z.literal("reissue_code"), roster_id: uuid }).strict(),
]);

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" },
  });
}

function rpcFailure(error: { code?: string } | null, data: { ok?: boolean; error?: string } | null) {
  if (error) return reply({ error: "Could not complete this request. Please try again." }, error.code === "42501" ? 403 : 500);
  if (!data || data.ok === false) {
    return reply({ error: data?.error === "forbidden"
      ? "Only admins and this cohort’s mentors can do this. Claimed codes cannot be reissued."
      : "Could not complete this request." }, data?.error === "forbidden" ? 403 : 400);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { supabase } = guard.value;
  const cohort = request.nextUrl.searchParams.get("cohort");
  const view = request.nextUrl.searchParams.get("view") ?? "roster";
  if ((cohort && !uuid.safeParse(cohort).success) || !["roster", "updates"].includes(view)) {
    return reply({ error: "Invalid cohort or view" }, 400);
  }
  const action = !cohort ? "staff_cohorts" : view === "updates" ? "staff_today" : "staff_roster";
  const { data, error } = await supabase.rpc("shift_companion_action", {
    p_action: action,
    p_payload: cohort ? { cohort_id: cohort } : {},
  });
  const failure = rpcFailure(error, data);
  if (failure) return failure;
  if (action === "staff_today") {
    const today = data as CompanionToday;
    const paths = today.updates.map((u) => u.image_path).filter((p): p is string => !!p);
    // The signed-in client enforces storage permissions. URLs last five minutes.
    const signed = paths.length
      ? await supabase.storage.from("shift-camp").createSignedUrls(paths, 300)
      : { data: [] };
    const urls = new Map(signed.data?.map((s) => [s.path, s.signedUrl]) ?? []);
    return reply({ ...today, updates: today.updates.map((u) => ({
      ...u, image_url: u.image_path ? urls.get(u.image_path) ?? null : null,
    })) });
  }
  return reply(data);
}

export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 2000) return reply({ error: "Request too large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return reply({ error: "Invalid JSON" }, 400);
  }
  const parsed = input.safeParse(body);
  if (!parsed.success) return reply({ error: "Invalid companion action" }, 400);
  const { action, ...payload } = parsed.data;
  if (action === "create_cohort") {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;
    const { data, error } = await admin.value.supabase.rpc("shift_camp_action", {
      p_action: action, p_cohort_id: null, p_payload: payload,
    });
    if (error) return rpcFailure(error, null)!;
    // Avoid returning the unrelated camp snapshot and its private check-ins.
    return reply({ ok: true, cohort: { id: data.cohort.id, name: data.cohort.name, starts_on: data.cohort.starts_on } });
  }
  const { data, error } = await guard.value.supabase.rpc("shift_companion_action", {
    p_action: action, p_payload: payload,
  });
  const failure = rpcFailure(error, data);
  if (failure) return failure;
  // Raw invite is returned only here, never cached or logged.
  return reply(data);
}
