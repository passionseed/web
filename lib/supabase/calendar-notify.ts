import {
  DEFAULT_SHARE_TEMPLATE,
  SITE_ORIGIN,
  blockLink,
  discordCreatedBody,
  type NotifySettingsView,
  type ShareSettings,
  notifySettingsSchema,
} from "@/lib/calendar/notify";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Calendar notification settings (one row) and the Discord post for new
 * blocks. The webhook URL never leaves the server.
 */

const db = () => createAdminClient();

type SettingsRow = {
  ig_group_url: string | null;
  share_template: string;
  discord_webhook_url: string | null;
  discord_on_create: boolean;
  discord_remind_minutes: number[];
  updated_at: string | null;
};

async function row(): Promise<SettingsRow | null> {
  const { data, error } = await db()
    .from("calendar_notify_settings")
    .select("ig_group_url, share_template, discord_webhook_url, discord_on_create, discord_remind_minutes, updated_at")
    .eq("id", "main")
    .maybeSingle();
  if (error) throw error;
  return data as SettingsRow | null;
}

/** For everyone signed in: where to share and what to say. Never throws. */
export async function shareSettings(): Promise<ShareSettings> {
  try {
    const r = await row();
    return { igGroupUrl: r?.ig_group_url ?? null, template: r?.share_template ?? DEFAULT_SHARE_TEMPLATE };
  } catch {
    return { igGroupUrl: null, template: DEFAULT_SHARE_TEMPLATE };
  }
}

/** For the admin settings page. */
export async function notifySettingsView(): Promise<NotifySettingsView> {
  const r = await row();
  return {
    igGroupUrl: r?.ig_group_url ?? null,
    template: r?.share_template ?? DEFAULT_SHARE_TEMPLATE,
    discordConfigured: Boolean(r?.discord_webhook_url),
    discordHint: r?.discord_webhook_url ? r.discord_webhook_url.slice(-4) : null,
    discordOnCreate: r?.discord_on_create ?? true,
    remindMinutes: r?.discord_remind_minutes ?? [60, 0],
    updatedAt: r?.updated_at ?? null,
  };
}

export async function saveNotifySettings(input: unknown, adminId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = notifySettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the settings" };
  const s = parsed.data;
  const { error } = await db()
    .from("calendar_notify_settings")
    .upsert({
      id: "main",
      ig_group_url: s.igGroupUrl,
      share_template: s.template,
      ...(s.discordWebhookUrl !== undefined ? { discord_webhook_url: s.discordWebhookUrl || null } : {}),
      discord_on_create: s.discordOnCreate,
      discord_remind_minutes: [...new Set(s.remindMinutes)].sort((a, b) => b - a),
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
  return { ok: true };
}

async function postDiscord(url: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Posts a new block to Discord when that is switched on. Never throws: the block is already saved. */
export async function announceBlock(
  block: { id: string; title: string; startsAt: string; endsAt: string; place: string | null },
  creatorName: string,
): Promise<void> {
  try {
    const r = await row();
    if (!r?.discord_webhook_url || !r.discord_on_create) return;
    const { error } = await db().from("calendar_block_notices").insert({ block_id: block.id, kind: "created" });
    if (error) return; // Already announced.
    await postDiscord(r.discord_webhook_url, discordCreatedBody(block, creatorName, blockLink(SITE_ORIGIN, block.id)));
  } catch (error) {
    console.warn("Calendar: could not announce block", error);
  }
}

/** Sends a test message so admins can check the webhook. */
export async function testDiscord(): Promise<boolean> {
  const r = await row();
  if (!r?.discord_webhook_url) return false;
  return postDiscord(r.discord_webhook_url, {
    content: "✅ PassionSeed calendar is connected. New blocks and reminders will show up here.",
    allowed_mentions: { parse: [] },
  });
}
