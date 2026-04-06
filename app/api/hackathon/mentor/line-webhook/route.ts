import { NextRequest, NextResponse } from "next/server";
import { validateLineSignature, sendLineConnectCode } from "@/lib/hackathon/line";
import { storeLineConnectCode } from "@/lib/hackathon/mentor-db";
import crypto from "crypto";

function generateConnectCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-line-signature");
  console.log("[line-webhook] received, signature:", signature ? "present" : "missing");

  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();
  console.log("[line-webhook] body:", body.slice(0, 200));

  let signatureValid = false;
  try {
    signatureValid = validateLineSignature(body, signature);
  } catch (err) {
    console.error("[line-webhook] signature validation threw:", err);
    return NextResponse.json({ error: "Signature validation error" }, { status: 500 });
  }

  if (!signatureValid) {
    console.error("[line-webhook] invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  console.log("[line-webhook] events:", payload.events?.map((e: { type: string }) => e.type));

  for (const event of payload.events ?? []) {
    if (event.type === "follow" && event.source?.userId) {
      const lineUserId: string = event.source.userId;
      const code = generateConnectCode();
      console.log("[line-webhook] follow event, userId:", lineUserId, "code:", code);

      try {
        await storeLineConnectCode(lineUserId, code);
        await sendLineConnectCode(lineUserId, code);
        console.log("[line-webhook] code sent successfully");
      } catch (err) {
        console.error("[line-webhook] connect code error:", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
