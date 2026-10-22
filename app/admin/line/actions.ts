"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { sendLineInboxReply } from "@/lib/line-oa/inbox";

export async function replyOnLine(contactId: string, text: string) {
  const admin = await requireAdmin();

  try {
    const { method } = await sendLineInboxReply({ contactId, text, adminUserId: admin.id });
    revalidatePath("/admin/line");
    return { ok: true as const, method, error: null };
  } catch (error) {
    console.error("replyOnLine failed:", error);
    revalidatePath("/admin/line");
    return {
      ok: false as const,
      method: null,
      error: error instanceof Error ? error.message : "Failed to send on LINE",
    };
  }
}
