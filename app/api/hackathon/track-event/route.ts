import { getSessionParticipant } from "@/lib/hackathon/db";
import { extractHackathonToken } from "@/lib/hackathon/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createHash } from "crypto";
import { cleanFunnelEvent, FUNNEL_EVENT_TYPE } from "@/lib/hackathon/elemental/funnel";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";

/**
 * Track hackathon user events for analytics
 * POST /api/hackathon/track-event
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { event_type, page_path = "/hackathon" } = body;
    let { event_data = {} } = body;

    if (!event_type) {
      return NextResponse.json(
        { success: false, error: "event_type is required" },
        { status: 400 }
      );
    }

    // Elemental funnel events feed the admin funnel: only well-formed events
    // from our own pages, with the host taken from the request.
    if (event_type === FUNNEL_EVENT_TYPE) {
      const clean = isTrustedAdminRequest(request) ? cleanFunnelEvent(event_data, request.headers.get("host")) : null;
      if (!clean) {
        return NextResponse.json({ success: false, error: "invalid event" }, { status: 400 });
      }
      event_data = clean;
    }

    const token = extractHackathonToken(request);
    const participant = token ? await getSessionParticipant(token) : null;

    // Get client information from headers
    const userAgent = request.headers.get("user-agent") || "unknown";
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] :
               request.headers.get("x-real-ip") ||
               "unknown";

    // Create a privacy-preserving visitor fingerprint
    const visitorFingerprint = createHash("sha256")
      .update(`${ip}-${userAgent}`)
      .digest("hex");

    // Insert event record
    const { error } = await supabase
      .from("hackathon_events")
      .insert({
        visitor_fingerprint: visitorFingerprint,
        participant_id: participant?.id ?? null,
        event_type,
        event_data,
        page_path,
        user_agent: userAgent,
      });

    if (error) {
      console.error("Error tracking event:", error);
      return NextResponse.json(
        { success: false, error: "Failed to track event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in track-event API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
