import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

/** POST — check Expo push receipts for given ticket IDs */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { ticketIds } = (await req.json()) as { ticketIds: string[] };
  if (!ticketIds?.length) return NextResponse.json({ error: "No ticket IDs" }, { status: 400 });

  const res = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: ticketIds }),
  });

  const result = await res.json();
  const receipts: Record<string, { status: string; message?: string; details?: any }> = result.data ?? {};

  const summary = ticketIds.map((id) => {
    const r = receipts[id];
    if (!r) return { ticketId: id, status: "pending" as const };
    if (r.status === "ok") return { ticketId: id, status: "delivered" as const };
    return {
      ticketId: id,
      status: "error" as const,
      error: r.details?.error ?? r.message ?? "Unknown error",
    };
  });

  return NextResponse.json({ receipts: summary });
}
