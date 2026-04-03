import { NextResponse } from "next/server";
import { resetAllPreferences } from "@/lib/hackathon/team-finder";

export async function POST() {
  try {
    await resetAllPreferences();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reset preferences error:", err);
    return NextResponse.json({ error: "รีเซ็ตไม่สำเร็จ" }, { status: 500 });
  }
}
