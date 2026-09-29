import { after, NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import { normalizeShiftSource } from "@/lib/shift/attribution";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ source: string }> }) {
  const source = normalizeShiftSource((await params).source);
  const target = request.nextUrl.searchParams.get("to") ?? "shift";
  if (!source || !["shift", "line"].includes(target)) {
    return NextResponse.json({ error: "Invalid campaign link" }, { status: 400 });
  }
  // Fixed destinations only: this endpoint cannot redirect to arbitrary URLs.
  const destination = target === "line"
    ? new URL(SHIFT_PAYMENT.lineUrl)
    : new URL(`/shift?utm_source=${source}`, request.url);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const fingerprint = createHash("sha256").update(`${ip}-${userAgent}`).digest("hex");

  after(async () => {
    try {
      const supabase = await createClient();
      const { error } = await supabase.from("hackathon_events").insert({
        visitor_fingerprint: fingerprint,
        event_type: "shift_link_click",
        event_data: { source, target },
        page_path: `/go/${source}`,
      });
      if (error) console.error("[shift] link tracking failed", error.code);
    } catch {
      console.error("[shift] link tracking unavailable");
    }
  });
  const response = NextResponse.redirect(destination, 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
