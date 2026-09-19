import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createHash } from "crypto";

/**
 * Track hackathon user events for analytics
 * POST /api/hackathon/track-event
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      event_type,
      event_data = {},
      page_path = "/hackathon",
      participant_id,
    } = body;

    if (!event_type) {
      return NextResponse.json(
        { success: false, error: "event_type is required" },
        { status: 400 }
      );
    }

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
        participant_id: participant_id || null,
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
