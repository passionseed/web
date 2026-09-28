import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import type { ShiftApplicationRow } from "@/types/shift";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    status: z.enum(["new", "accepted", "waitlist", "declined"]).optional(),
    paid: z.boolean().optional(),
    admin_note: z
      .string()
      .max(2000)
      .nullable()
      .optional()
      .transform((v) => (typeof v === "string" ? v.trim() || null : v)),
  })
  .strict();

type ApplicationUpdate = Partial<Pick<ShiftApplicationRow, "status" | "paid_at" | "admin_note">>;

function toUpdate(input: z.output<typeof patchSchema>): ApplicationUpdate {
  const update: ApplicationUpdate = {};
  if (input.status !== undefined) update.status = input.status;
  if (input.paid !== undefined) update.paid_at = input.paid ? new Date().toISOString() : null;
  if (input.admin_note !== undefined) update.admin_note = input.admin_note;
  return update;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }

    const update = toUpdate(parsed.data);
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("shift_applications")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
    }

    return NextResponse.json({ application: data as ShiftApplicationRow });
  } catch (error) {
    return safeServerError("Failed to update SHIFT application", error);
  }
}
