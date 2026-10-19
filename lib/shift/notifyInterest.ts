import { formatThaiDateRange } from "@/lib/content/shift-cohort";
import { MIN_BUILDERS } from "@/lib/content/shift-next";
import {
  SHIFT_INTEREST_STAGES,
  type DateRange,
  type ShiftInterest,
  type WindowDemand,
} from "@/lib/shift/interest";
import { postShiftWebhook, siteUrl } from "@/lib/shift/notifyDiscord";

/**
 * Pings the SHIFT channel when someone pre-orders the next round. Like the
 * application notice it carries no contact details: those stay in admin.
 */

const EMBED_COLOR = 0x0078bf;
const ADMIN_PATH = "/admin/shift/interest";

export interface ShiftInterestNotice {
  interest: Pick<ShiftInterest, "nickname" | "stage" | "freeRanges" | "source">;
  updated: boolean;
  /** Busiest 7-day window across everyone so far, or null if unknown. */
  topWindow: WindowDemand | null;
}

function rangesLabel(ranges: readonly DateRange[]): string {
  return ranges.map((r) => formatThaiDateRange(r.start, r.end)).join("\n");
}

export function buildShiftInterestPayload({ interest, updated, topWindow }: ShiftInterestNotice) {
  const stage = SHIFT_INTEREST_STAGES.find((s) => s.value === interest.stage)?.label ?? interest.stage;
  const top = topWindow
    ? `${formatThaiDateRange(topWindow.start, topWindow.end)} · ${topWindow.count}/${MIN_BUILDERS} คน`
    : "-";

  return {
    allowed_mentions: { parse: [] as string[] },
    embeds: [
      {
        title: updated ? "🌍 SHIFT รอบหน้า: เพิ่มช่วงที่ว่าง (IG เดิม)" : "🌍 SHIFT รอบหน้า: ลงชื่อใหม่",
        url: `${siteUrl()}${ADMIN_PATH}`,
        color: EMBED_COLOR,
        fields: [
          { name: "ชื่อเล่น", value: interest.nickname.slice(0, 100), inline: true },
          { name: "ตอนนี้", value: stage, inline: true },
          { name: "มาจาก", value: (interest.source || "direct").slice(0, 80), inline: true },
          { name: "ว่างช่วง", value: rangesLabel(interest.freeRanges).slice(0, 1000) },
          { name: "ช่วงที่คนว่างตรงกันมากสุด", value: top },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export async function notifyShiftInterest(notice: ShiftInterestNotice): Promise<void> {
  await postShiftWebhook(buildShiftInterestPayload(notice));
}
