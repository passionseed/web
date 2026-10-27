import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { expireAdminOverviewKpis } from "@/lib/admin/overview/cache";
import { isUuid } from "@/lib/admin/queue-tools/url";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => v?.trim() || undefined);

const paymentSchema = z.object({
  user_id: z
    .string()
    .trim()
    .refine((v) => isUuid(v), "user_id must be a UUID")
    .transform((v) => v.toLowerCase()),
  amount: z.number().finite().positive(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "currency must be a 3-letter code")
    .transform((v) => v.toUpperCase())
    .default("THB"),
  payment_method: optionalText(100),
  product_name: optionalText(200),
  notes: optionalText(2000),
});

/**
 * Records a payment made outside an online checkout as a `payment_convert`
 * funnel event. Admin role only. The overview's revenue KPI reads these.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase, userId } = admin.value;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "user_id (a UUID) and a positive amount are required" },
        { status: 400 },
      );
    }
    const { user_id, amount, currency, payment_method, product_name, notes } = parsed.data;

    const { error: funnelError } = await supabase.from("funnel_events").insert({
      user_id,
      event_name: "payment_convert",
      metadata: {
        amount,
        currency,
        payment_method,
        product_name,
        notes,
        recorded_by: userId,
      },
    });

    if (funnelError) {
      return safeServerError("Failed to track payment", funnelError);
    }

    expireAdminOverviewKpis();

    return NextResponse.json({
      success: true,
      message: "Payment tracked successfully",
      user_id,
      amount,
      currency,
    });
  } catch (error) {
    return safeServerError("Failed to track payment", error);
  }
}
