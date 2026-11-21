import { escapeMarkdown } from "discord.js";

import { ELEMENT_LABELS, type ElementKey } from "../../../../lib/elemental/core/index";
import { oneLine, slotLabel } from "../legend";

/**
 * The first-person bell (E22): one news post per team when its first tester
 * is counted. Functional placeholders only: every Thai line waits for a
 * native review before the event ([TH-REVIEW]). No marketing copy.
 *
 * The post carries exactly three facts: the plot number, the element and the
 * project name. Never who tried it, what they said, the logger or any member.
 */

/** What the bell post may show. Nothing else reaches its text. */
export interface BellFacts {
  slot: number;
  element: ElementKey;
  projectName: string;
}

export const BELL = {
  // [TH-REVIEW] the bell: a team's first tester was counted; its plot's lantern is lit.
  // Line 1 is the plot sign ("07 · ไฟ · project", as the campfire legend writes it).
  post: (f: BellFacts) =>
    [
      `${slotLabel(f.slot)} · ${ELEMENT_LABELS[f.element].th} · ${escapeMarkdown(oneLine(f.projectName)) || "-"}`,
      "มีคนลองใช้งานโปรเจกต์นี้เป็นคนแรกแล้ว ตะเกียงที่แปลงนี้ติดแล้ว",
    ].join("\n"),
  // [TH-REVIEW] alt text of the island picture with the plot lit.
  islandAlt: (slot: number) => `เกาะ Elemental แปลง ${slotLabel(slot)} ตะเกียงติด`,
} as const;
