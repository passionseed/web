import { NextRequest, NextResponse } from "next/server";
import { validateLineSignature, sendLineConnectCode } from "@/lib/hackathon/line";
import { storeLineConnectCode } from "@/lib/hackathon/mentor-db";
import crypto from "crypto";

function generateConnectCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-line-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();

  if (!validateLineSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);

  for (const event of payload.events ?? []) {
    if (event.type === "follow" && event.source?.userId) {
      const lineUserId: string = event.source.userId;
      const code = generateConnectCode();

      try {
        await storeLineConnectCode(lineUserId, code);
        await sendLineConnectCode(lineUserId, code);
      } catch (err) {
        console.error("Line connect code error:", err);
        // Don't fail the webhook response — Line will retry if we return non-200
      }
    }
    // Ignore all other event types (message, unfollow, etc.)
  }

  return NextResponse.json({ ok: true });
}
