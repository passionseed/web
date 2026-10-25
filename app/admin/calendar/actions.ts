"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/requireAdmin";
import type { NotifySettingsInput } from "@/lib/calendar/notify";
import { saveNotifySettings, testDiscord } from "@/lib/supabase/calendar-notify";

export async function saveCalendarNotify(input: NotifySettingsInput) {
  const admin = await requireAdmin();
  try {
    const result = await saveNotifySettings(input, admin.id);
    revalidatePath("/admin/calendar");
    return result;
  } catch (error) {
    console.error("saveCalendarNotify failed:", error);
    return { ok: false as const, error: "Could not save" };
  }
}

export async function sendDiscordTest() {
  await requireAdmin();
  return { ok: await testDiscord() };
}
