import { createHash } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { checkRateLimit } from "@/lib/expert-interview/rate-limiter";
import { clientIp } from "@/lib/hackathon/elemental/link-views";
import { shareOpen } from "@/lib/hackathon/elemental/share";
import { checkStoryProofFile, STORY_PROOF_LIMITS, storyProofUploadBlock } from "@/lib/hackathon/elemental/story-proof";
import { safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import { getShareContext } from "@/lib/supabase/hackathon-share-links";
import { saveStoryProof } from "@/lib/supabase/hackathon-story-proofs";

const noStore = { "Cache-Control": "no-store" };
const limitKey = (kind: string, value: string) => createHash("sha256").update(`elemental-story-proof:${kind}:${value}`).digest("hex");

/**
 * Upload an Instagram Story screenshot (multipart field "proof": JPEG, PNG or
 * WEBP up to the slip limit). It unlocks every team-name style for the
 * team straight away, with no staff check (cosmetic only); staff can revoke
 * it later. Only while sharing is open (shareOpen()) and the sign-up isn't
 * cancelled. One proof per sign-up: a new upload replaces the old one.
 * The answer never carries the image or where it is stored.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    if (!isTrustedAdminRequest(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { token } = await params;
    const reg = await getShareContext(token);
    if (!reg) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const block = storyProofUploadBlock({ shareOpen: shareOpen(), registrationStatus: reg.status });
    if (block) return NextResponse.json({ error: block }, { status: 409 });

    // The limiter fails closed: if it can't count, nothing is stored.
    const [regLimit, ipLimit] = await Promise.all([
      checkRateLimit(limitKey("registration", reg.id), STORY_PROOF_LIMITS.registration),
      checkRateLimit(limitKey("ip", clientIp(request.headers)), STORY_PROOF_LIMITS.ip),
    ]);
    if (!regLimit.allowed || !ipLimit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const form = await request.formData().catch(() => null);
    const file = form?.get("proof");
    const checked = checkStoryProofFile(file instanceof File ? file : null);
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

    await saveStoryProof(ELEMENTAL.slug, reg.id, file as File, checked.ext);
    return NextResponse.json({ storyProof: "unlocked" }, { headers: noStore });
  } catch (error) {
    return safeServerError("Could not save the story proof", error);
  }
}
