import { z } from "zod";

import { bangkokParts, shortThaiDay, timeRange, type CalendarBlock } from "./core";

/**
 * Telling the community about calendar blocks. Instagram has no API for group
 * chats, so for the IG group the site fills in a message for people to paste;
 * Discord gets posts and reminders automatically (reminders run in Postgres,
 * see supabase/migrations/20261025160000_calendar_notify.sql).
 */

export const SITE_ORIGIN = "https://www.passionseed.org";

export const DEFAULT_SHARE_TEMPLATE = "📅 {title}\n🕖 {when}\n📍 {place}\nใครไปด้วยกดตรงนี้ 👉 {link}";

/** Reminder choices offered in settings, in minutes before the start. */
export const REMIND_CHOICES = [
  { minutes: 1440, label: "1 วันก่อน" },
  { minutes: 60, label: "1 ชั่วโมงก่อน" },
  { minutes: 15, label: "15 นาทีก่อน" },
  { minutes: 0, label: "ตอนเริ่ม" },
] as const;

export const IG_THREAD = /^https:\/\/(www\.)?instagram\.com\/direct\/t\/\d+\/?$/;
export const DISCORD_WEBHOOK = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;

/** What the browser may know: no webhook URL, only whether one is set. */
export type ShareSettings = { igGroupUrl: string | null; template: string };

export type NotifySettingsView = ShareSettings & {
  discordConfigured: boolean;
  /** Last 4 characters, so admins can tell which webhook is set. */
  discordHint: string | null;
  discordOnCreate: boolean;
  remindMinutes: number[];
  updatedAt: string | null;
};

export const notifySettingsSchema = z.object({
  igGroupUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || IG_THREAD.test(v), "Use the group's instagram.com/direct/t/… link")
    .transform((v) => v || null),
  template: z
    .string()
    .trim()
    .min(1, "Write a message")
    .max(1000)
    .refine((v) => v.includes("{link}"), "Keep {link} so people can tap through"),
  /** Leave undefined to keep the saved webhook; "" removes it. */
  discordWebhookUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || DISCORD_WEBHOOK.test(v), "That isn't a Discord webhook URL")
    .optional(),
  discordOnCreate: z.boolean(),
  remindMinutes: z.array(z.number().int().min(0).max(10080)).max(5),
});

export type NotifySettingsInput = z.input<typeof notifySettingsSchema>;

export const blockLink = (origin: string, blockId: string) => `${origin.replace(/\/$/, "")}/calendar?block=${blockId}`;

/** "อา. 25 ต.ค. 19:00–20:00" */
export function blockWhen(block: Pick<CalendarBlock, "startsAt" | "endsAt">): string {
  return `${shortThaiDay(bangkokParts(block.startsAt).date)} ${timeRange(block)}`;
}

/** The share message for one block. Lines whose only content was an empty placeholder are dropped. */
export function fillTemplate(
  template: string,
  block: Pick<CalendarBlock, "title" | "startsAt" | "endsAt" | "place">,
  link: string,
): string {
  const values: Record<string, string> = {
    title: block.title,
    when: blockWhen(block),
    place: block.place ?? "",
    link,
  };
  return template
    .split("\n")
    .flatMap((line) => {
      const keys = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      if (keys.length > 0 && keys.every((k) => k in values && !values[k])) return [];
      return [line.replace(/\{(\w+)\}/g, (all, k: string) => (k in values ? values[k] : all))];
    })
    .join("\n")
    .trim();
}

/** The Discord post when someone adds a block. Mentions are switched off. */
export function discordCreatedBody(
  block: Pick<CalendarBlock, "title" | "startsAt" | "endsAt" | "place">,
  creatorName: string,
  link: string,
) {
  const lines = [
    `📅 นัดใหม่: **${block.title}**`,
    `${blockWhen(block)}${block.place ? ` · ${block.place}` : ""}`,
    `เพิ่มโดย ${creatorName} · ไปด้วยกด 👉 ${link}`,
  ];
  return { content: lines.join("\n"), allowed_mentions: { parse: [] as string[] } };
}
