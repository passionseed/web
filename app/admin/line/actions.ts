"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/admin/queue-tools/url";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { sendLineInboxReply } from "@/lib/line-oa/inbox";
import { markLineContactSeen } from "@/lib/supabase/line-oa";

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

/**
 * Clears a chat's unread count. Called from the browser when someone opens the
 * chat or interacts with the page, never from the page render: the inbox
 * re-renders every 15 seconds and that alone must not count as reading.
 */
export async function markLineSeen(contactId: string) {
  await requireAdmin();
  if (!isUuid(contactId)) return { ok: false as const };

  try {
    await markLineContactSeen(contactId);
    return { ok: true as const };
  } catch (error) {
    console.error("markLineSeen failed:", error);
    return { ok: false as const };
  }
}
