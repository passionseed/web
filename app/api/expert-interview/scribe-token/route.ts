import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export async function GET() {
  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
  }

  try {
    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const token = await elevenlabs.tokens.singleUse.create("realtime_scribe");
    return NextResponse.json(token);
  } catch (error) {
    console.error("[scribe-token] failed", error);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }
}
