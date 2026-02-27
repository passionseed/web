import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createHash } from "crypto";

/**
 * Track hackathon page views for analytics
 * POST /api/hackathon/track-view
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      page_path = "/hackathon",
      referrer,
      participant_id
    } = body;

    // Get client information from headers
    const userAgent = request.headers.get("user-agent") || "unknown";
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] :
               request.headers.get("x-real-ip") ||
               "unknown";

    // Create a privacy-preserving visitor fingerprint
    // Hash IP + user agent to anonymize while still tracking unique visitors
    const visitorFingerprint = createHash("sha256")
      .update(`${ip}-${userAgent}`)
      .digest("hex");

    // Generate a session ID if not provided (browser-based tracking)
    const sessionId = body.session_id || visitorFingerprint;

    // Insert page view record
    const { error } = await supabase
      .from("hackathon_page_views")
      .insert({
        visitor_fingerprint: visitorFingerprint,
        session_id: sessionId,
        participant_id: participant_id || null,
        page_path,
        referrer: referrer || null,
        user_agent: userAgent,
      });

    if (error) {
      console.error("Error tracking page view:", error);
      // Don't fail the request if tracking fails
      return NextResponse.json(
        { success: false, error: "Failed to track view" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in track-view API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
