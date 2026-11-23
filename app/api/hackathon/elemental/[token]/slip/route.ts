import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { MAX_SLIP_BYTES } from "@/lib/hackathon/elemental/slip-image";
import { safeServerError } from "@/lib/security/route-guards";
import { rdcwConfigured, verifySlipRdcw } from "@/lib/rdcw/client";
import { verifySlip } from "@/lib/slipok/client";
import {
  getRegistrationByToken,
  recordSlip,
  uploadSlip,
} from "@/lib/supabase/hackathon-event-registrations";

// RDCW documents JPEG and PNG; SlipOK also reads WEBP.
const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Upload a payment slip. The slip is stored first (so an admin can always
 * see it), then RDCW checks it (SlipOK when RDCW isn't configured):
 * - paid: the seat is confirmed on the spot
 * - rejected / retry: the person sees why and can upload again
 * - unverified (checker down, quota, not configured): status "review", a person checks it
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const registration = await getRegistrationByToken(token);
    if (!registration) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (registration.status === "paid") return NextResponse.json({ result: "paid" });
    if (registration.status === "cancelled") {
      return NextResponse.json({ error: "cancelled" }, { status: 409 });
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("slip");
    if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
    const ext = EXTENSION[file.type];
    if (!ext) return NextResponse.json({ error: "file_type" }, { status: 400 });
    if (file.size > MAX_SLIP_BYTES) return NextResponse.json({ error: "file_size" }, { status: 400 });

    const slipPath = `${registration.id}/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    await uploadSlip(file, slipPath);

    const provider = rdcwConfigured() ? "rdcw" : "slipok";
    const verify = provider === "rdcw" ? verifySlipRdcw : verifySlip;
    const verdict = await verify(file, `slip.${ext}`, registration.amountBaht);
    const check = {
      provider,
      kind: verdict.kind,
      code: "code" in verdict ? verdict.code : undefined,
      checkedAt: new Date().toISOString(),
      raw: verdict.raw,
    };

    if (verdict.kind === "paid") {
      const saved = await recordSlip(registration.id, {
        status: "paid",
        slipPath,
        slipCheck: check,
        transRef: verdict.transRef,
        paidBy: provider,
      });
      if (saved === "duplicate") return NextResponse.json({ result: "rejected", reason: "duplicate" });
      return NextResponse.json({ result: "paid" });
    }

    if (verdict.kind === "unverified") {
      console.error("[hackathon slip] slip check could not decide", { provider, code: verdict.code, detail: verdict.detail });
      await recordSlip(registration.id, { status: "review", slipPath, slipCheck: check });
      return NextResponse.json({ result: "review" });
    }

    // Keep the slip for the record; the registration stays pending.
    await recordSlip(registration.id, {
      status: registration.status === "review" ? "review" : "pending",
      slipPath,
      slipCheck: check,
    });
    if (verdict.kind === "retry") {
      return NextResponse.json({ result: "retry", delayMinutes: verdict.delayMinutes });
    }
    return NextResponse.json({ result: "rejected", reason: verdict.reason });
  } catch (error) {
    return safeServerError("Failed to check slip", error);
  }
}
