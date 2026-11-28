import { bangkokDate } from "./bangkok-date";
import { seatPace } from "./seats";
import { ELEMENTAL_TARGETS } from "./targets";

/**
 * Pings the team's Discord channel when someone signs up for Elemental and
 * when a sign-up pays, so the team sees every seat land.
 *
 * Many sign-ups are minors, so a message carries first names, schools, team
 * name, amount and the tracked link only. Full names, contacts and parent
 * details stay on the admin page.
 *
 * Best effort: never throws, never waits longer than the timeout.
 * Posts to DISCORD_HACKATHON_WEBHOOK_URL, or the SHIFT channel's webhook
 * (DISCORD_SHIFT_WEBHOOK_URL) when that is not set.
 */

const TIMEOUT_MS = 3000;
const SIGNUP_COLOR = 0xf97316;
const PAID_COLOR = 0x22c55e;
const BAR_CELLS = 20;

export type SignupNotice = {
  /** Sign-ups so far that aren't cancelled, this one included. */
  signupNumber: number;
  members: { name: string; school: string }[];
  teamMode: "solo" | "create" | "join" | "buddy";
  teamName: string | null;
  amountBaht: number;
  source: string | null;
  paidSeats: number;
};

export type PaidNotice = {
  names: string[];
  memberCount: number;
  amountBaht: number;
  teamName: string | null;
  /** Paid seats now, this payment included. */
  paidSeats: number;
  /** "slip" when the slip checker confirmed it, "admin" when a person did. */
  via: "slip" | "admin";
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function baht(n: number): string {
  return `฿${n.toLocaleString("en-US")}`;
}

function adminUrl(): string {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://passionseed.org"
  ).replace(/\/+$/, "");
  return `${base}/admin/hackathon/elemental`;
}

/** "▓▓▓░░░ 52/350 (15%)" */
export function seatBar(paid: number, target: number = ELEMENTAL_TARGETS.seats.target): string {
  const ratio = target > 0 ? Math.min(1, paid / target) : 0;
  const filled = Math.round(ratio * BAR_CELLS);
  return `${"▓".repeat(filled)}${"░".repeat(BAR_CELLS - filled)} ${paid}/${target} (${Math.round(ratio * 100)}%)`;
}

/** "เป้าถัดไป 150 ภายใน 30 พ.ย. · ขาดอีก 98" or null after the last checkpoint. */
export function nextCheckpointLine(paid: number, now: Date = new Date()): string | null {
  const pace = seatPace(paid, bangkokDate(now));
  if (!pace.next) return null;
  const date = new Date(`${pace.next.by}T12:00:00+07:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });
  const gap = pace.neededForNext > 0 ? ` · ขาดอีก ${pace.neededForNext}` : " · ถึงแล้ว ✅";
  return `เป้าถัดไป ${pace.next.seats} ภายใน ${date}${gap}`;
}

/** A checkpoint this payment just crossed, e.g. 50 when paid went 48 → 51. */
export function crossedCheckpoint(before: number, after: number): number | null {
  const hit = [...ELEMENTAL_TARGETS.seats.checkpoints]
    .map((cp) => cp.seats)
    .filter((s) => before < s && after >= s);
  return hit.length ? Math.max(...hit) : null;
}

function teamLine(mode: SignupNotice["teamMode"], teamName: string | null): string {
  if (mode === "create") return `ตั้งทีมใหม่ “${truncate(teamName ?? "", 80)}”`;
  if (mode === "join") return `เข้าทีม “${truncate(teamName ?? "", 80)}”`;
  if (mode === "buddy") return "บัตรเพื่อน";
  return "เดี่ยว";
}

export function buildSignupPayload(n: SignupNotice, now: Date = new Date()) {
  const people = n.members
    .map((m) => `**${truncate(m.name, 60)}** · ${truncate(m.school, 80)}`)
    .join("\n");
  const progress = [seatBar(n.paidSeats), nextCheckpointLine(n.paidSeats, now)].filter(Boolean).join("\n");
  return {
    // User-supplied text must never be able to ping @everyone or a role.
    allowed_mentions: { parse: [] as string[] },
    embeds: [
      {
        title: `🔥 Elemental สมัครใหม่ #${n.signupNumber}`,
        url: adminUrl(),
        color: SIGNUP_COLOR,
        description: truncate(people, 1500),
        fields: [
          { name: "แบบ", value: teamLine(n.teamMode, n.teamName), inline: true },
          { name: "ยอด", value: `${n.members.length} คน · ${baht(n.amountBaht)}`, inline: true },
          { name: "มาจาก", value: truncate(n.source || "direct", 60), inline: true },
          { name: "ที่นั่งที่จ่ายแล้ว", value: progress },
        ],
        footer: { text: "รอจ่าย · ยังไม่นับที่นั่งจนกว่าสลิปผ่าน" },
        timestamp: now.toISOString(),
      },
    ],
  };
}

export function buildPaidPayload(n: PaidNotice, now: Date = new Date()) {
  const before = n.paidSeats - n.memberCount;
  const milestone = crossedCheckpoint(before, n.paidSeats);
  const who = n.names.length ? n.names.map((x) => truncate(x, 60)).join(", ") : "-";
  const progress = [seatBar(n.paidSeats), nextCheckpointLine(n.paidSeats, now)].filter(Boolean).join("\n");
  return {
    allowed_mentions: { parse: [] as string[] },
    embeds: [
      {
        title: milestone
          ? `🎉 Elemental ทะลุ ${milestone} ที่นั่งแล้ว!`
          : `💸 จ่ายแล้ว! +${n.memberCount} ที่นั่ง`,
        url: adminUrl(),
        color: PAID_COLOR,
        description: `**${who}**${n.teamName ? ` · ทีม “${truncate(n.teamName, 80)}”` : ""} · ${baht(n.amountBaht)}`,
        fields: [{ name: "ที่นั่งที่จ่ายแล้ว", value: progress }],
        footer: { text: n.via === "admin" ? "แอดมินยืนยันสลิป" : "สลิปผ่านอัตโนมัติ" },
        timestamp: now.toISOString(),
      },
    ],
  };
}

let warnedMissingWebhook = false;

/** Posts one payload to the hackathon channel. Best effort, never throws. */
export async function postHackathonWebhook(payload: unknown): Promise<void> {
  const webhookUrl = process.env.DISCORD_HACKATHON_WEBHOOK_URL || process.env.DISCORD_SHIFT_WEBHOOK_URL;
  if (!webhookUrl) {
    if (!warnedMissingWebhook) {
      console.warn("[elemental] no Discord webhook set, skipping notification");
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
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) console.error(`[elemental] Discord webhook responded ${res.status}`);
  } catch (error) {
    console.error("[elemental] Discord notification failed", error);
  } finally {
    clearTimeout(timer);
  }
}
