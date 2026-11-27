import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import { setLinkRejected, setTeacherMark } from "@/lib/supabase/hackathon-share-links";

const bodySchema = z.object({ mark: z.enum(["verified", "invited", "rejected"]), on: z.boolean() });

/**
 * Staff marks on a share link:
 * - teachers: "verified" (checked with the school), then "invited" (Demo Day
 *   invite sent), which needs "verified" first;
 * - any link: "rejected" shuts it (fraud): no more seats, open seats turned down.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedAdminRequest(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    const { mark, on } = parsed.data;
    const result = mark === "rejected" ? await setLinkRejected(id, on, admin.value.userId) : await setTeacherMark(id, mark, on, admin.value.userId);
    if (result === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (result === "not_verified") return NextResponse.json({ error: "not_verified" }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to save the teacher mark", error);
  }
}
