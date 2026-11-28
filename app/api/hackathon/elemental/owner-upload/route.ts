import { NextRequest, NextResponse } from "next/server";

import { b2 } from "@/lib/backblaze";
import { parseOwnerElement, verifyOwnerLink } from "@/lib/hackathon/elemental/owner-link";
import { checkOwnerUpload, ownerUploadKey } from "@/lib/hackathon/elemental/owner-upload";
import { safeServerError } from "@/lib/security/route-guards";

/**
 * POST /api/hackathon/elemental/owner-upload
 * Body: { o, el, s, fileName, fileType, fileSize }
 *
 * For a problem owner's signed link (lib/hackathon/elemental/owner-link.ts),
 * returns a presigned PUT so the browser sends the file straight to B2. The
 * file never passes through Vercel, so phone videos of any size up to 2 GB work.
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
    return NextResponse.json({ error: "ลิงก์นี้อัปโหลดไม่ได้ ขอลิงก์ใหม่จากทีมงาน" }, { status: 403 });
  }
  const org = body.o as string;

  const check = checkOwnerUpload({ fileName: body.fileName, fileType: body.fileType, fileSize: body.fileSize });
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  try {
    const key = ownerUploadKey(org, body.fileName as string, check.extension);
    const uploadUrl = await b2.getPresignedPutUrl(key, check.contentType, 2 * 60 * 60);
    return NextResponse.json({ uploadUrl, key, contentType: check.contentType });
  } catch (error) {
    return safeServerError("ระบบอัปโหลดขัดข้อง ลองอีกครั้งในอีกสักครู่", error);
  }
}
