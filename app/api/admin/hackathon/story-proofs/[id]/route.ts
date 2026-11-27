import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import { revokeStoryProof } from "@/lib/supabase/hackathon-story-proofs";

const bodySchema = z.object({ action: z.literal("revoke") });

/**
 * Staff revoke an Instagram Story proof after a spot-check: the screenshot is
 * deleted from the private bucket straight away (other students' names, an
 * image that shouldn't be there), the row stays as "revoked", and the team's
 * styles go back to what its devices unlock. Revoking again is safe. 409
 * "changed": the student uploaded a new screenshot in the same moment, so
 * staff look at that one first. The student can upload a new screenshot
 * while sharing is open.
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
    const result = await revokeStoryProof(id, admin.value.userId);
    if (result === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (result === "changed") return NextResponse.json({ error: "changed" }, { status: 409 });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return safeServerError("Failed to revoke the story proof", error);
  }
}
