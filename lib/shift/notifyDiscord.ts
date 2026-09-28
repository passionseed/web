import type { ShiftApplication } from "@/lib/shift/application";
import { SHIFT_AVAILABILITY, SHIFT_GRADES } from "@/lib/shift/application";

/**
 * Pings the team's Discord channel when a SHIFT application lands.
 *
 * Applicants are minors, so the message carries only what the team needs to
 * triage (nickname, grade, track, problem, availability, source). Full name,
 * parent contact and social handles stay in the admin page.
 *
 * Best effort: never throws, never blocks longer than the timeout.
 */

const TIMEOUT_MS = 3000;
const PROBLEM_MAX_CHARS = 200;
const EMBED_COLOR = 0x22c55e;

export interface ShiftApplicationNotice {
  cohortName: string;
  seats: number;
  /** Applications for this cohort so far, including this one. Null if unknown. */
  applicationNumber: number | null;
  application: Pick<
    ShiftApplication,
    "nickname" | "grade" | "targetTrack" | "problem" | "availability" | "source"
  >;
}

let warnedMissingWebhook = false;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function labelFor<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://passionseed.org"
  ).replace(/\/+$/, "");
}

export function buildShiftApplicationPayload(notice: ShiftApplicationNotice) {
  const { application: app, cohortName, seats, applicationNumber } = notice;
  const counter = applicationNumber === null ? "" : ` #${applicationNumber}/${seats}`;

  return {
    // User-supplied text must never be able to ping @everyone or a role.
    allowed_mentions: { parse: [] as string[] },
    embeds: [
      {
        title: `🌱 ${cohortName} ใบสมัครใหม่${counter}`,
        url: `${siteUrl()}/admin/shift/applications`,
        color: EMBED_COLOR,
        fields: [
          { name: "ชื่อเล่น", value: truncate(app.nickname, 100), inline: true },
          { name: "ชั้น", value: labelFor(SHIFT_GRADES, app.grade), inline: true },
          {
            name: "สายที่สนใจ",
            value: truncate(app.targetTrack || "-", 120),
            inline: true,
          },
          { name: "ปัญหา", value: truncate(app.problem, PROBLEM_MAX_CHARS) },
          {
            name: "เวลาว่าง",
            value: labelFor(SHIFT_AVAILABILITY, app.availability),
            inline: true,
          },
          { name: "มาจาก", value: truncate(app.source || "direct", 80), inline: true },
          {
            name: "Admin",
            value: `${siteUrl()}/admin/shift/applications`,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export async function notifyShiftApplication(notice: ShiftApplicationNotice): Promise<void> {
  const webhookUrl = process.env.DISCORD_SHIFT_WEBHOOK_URL;
  if (!webhookUrl) {
    if (!warnedMissingWebhook) {
      console.warn("[shift] DISCORD_SHIFT_WEBHOOK_URL not set, skipping Discord notification");
      warnedMissingWebhook = true;
    }
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildShiftApplicationPayload(notice)),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[shift] Discord webhook responded ${res.status}`);
    }
  } catch (error) {
    console.error("[shift] Discord notification failed", error);
  } finally {
    clearTimeout(timer);
  }
}
