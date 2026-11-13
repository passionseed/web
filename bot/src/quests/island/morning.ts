/**
 * The first morning on the island: the picture on the /start door card and the
 * card after it. The story's opening scene (docs/designs/shift-high-island-lore.md,
 * section 1 and panel 1): the island at dawn, the sea moving, a boat moored,
 * the land still open. Drawn once per process and kept: it never changes.
 */
import { AttachmentBuilder } from "discord.js";

import { renderIslandGif } from "./gif";

/** The attachment's name, as the cards reference it. */
export const MORNING_GIF = "shift-island-morning.gif";

/** Alt text: what the picture shows, for screen readers. */
export const MORNING_ALT = "เกาะ SHIFT ตอนเช้า ทะเลขยับเบาๆ ที่ดินยังว่าง";

let drawn: Buffer | null | undefined;

/** The GIF's bytes, drawn on first use; null when it cannot be drawn (the cards then go out without it). */
export function morningGif(): Buffer | null {
  if (drawn !== undefined) return drawn;
  try {
    drawn = renderIslandGif([], { scale: 2, phase: "dawn", festival: true }).gif;
  } catch (error) {
    console.error(`[shift-quests] first-morning picture skipped: ${(error as Error)?.message ?? "unknown"}`);
    drawn = null;
  }
  return drawn;
}

/** A fresh attachment for one card (builders are not shared between messages), or none. */
export function morningAttachment(): AttachmentBuilder[] {
  const gif = morningGif();
  return gif ? [new AttachmentBuilder(gif, { name: MORNING_GIF, description: MORNING_ALT })] : [];
}
