import { NextRequest, NextResponse } from "next/server";

import { b2 } from "@/lib/backblaze";
import { parseOwnerElement, verifyOwnerLink } from "@/lib/hackathon/elemental/owner-link";
import { isOwnerUploadKey, ownerUploadsMessage } from "@/lib/hackathon/elemental/owner-upload";
import { safeServerError } from "@/lib/security/route-guards";

const MAX_KEYS = 50;

/**
 * POST /api/hackathon/elemental/owner-upload/done
 * Body: { o, el, s, keys, minors? }
 *
 * The owner kit calls this once a batch of uploads finishes. It checks each
 * key is this org's and is really in the bucket, then pings the team's
 * Discord channel (ELEMENTAL_OWNER_UPLOADS_WEBHOOK_URL) with links to the
 * files. Without the webhook it does nothing, and the owner never sees an
 * error from it either way.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 400 });
  }

  const element = parseOwnerElement(body.el);
  if (!verifyOwnerLink(body.o, element, body.s)) {
    return NextResponse.json({ error: "ลิงก์นี้ใช้ไม่ได้" }, { status: 403 });
  }
  const org = body.o as string;

  const keys = Array.isArray(body.keys) ? [...new Set(body.keys)] : [];
  if (keys.length === 0 || keys.length > MAX_KEYS || !keys.every((k) => isOwnerUploadKey(org, k))) {
    return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 400 });
  }

  const webhook = process.env.ELEMENTAL_OWNER_UPLOADS_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ notified: false });

  try {
    const heads = await Promise.all((keys as string[]).map(async (key) => ({ key, head: await b2.headObject(key) })));
    const files = heads.flatMap(({ key, head }) => (head ? [{ key, size: head.size, url: b2.publicUrl(key) }] : []));
    if (files.length === 0) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 404 });

    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: ownerUploadsMessage({ org, element, files, minorsWithPermission: body.minors === true }), allowed_mentions: { parse: [] } }),
    });
    if (!res.ok) throw new Error(`Discord webhook returned ${res.status}`);
    return NextResponse.json({ notified: true });
  } catch (error) {
    return safeServerError("Couldn't notify the team", error);
  }
}
