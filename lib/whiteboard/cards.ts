import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";

import { STICKY_COLORS } from "./core";

/**
 * Room cards: stickies with a question printed on them, for a session where
 * people booked together. Each card is tagged in customData, so with the
 * author already recorded on every element (stampAuthor), the board itself
 * shows who arrived, asked for help, offered help, and closed with a next step.
 */

export const CARD_KINDS = ["arrive", "help", "helped", "close"] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export const CARDS: Record<CardKind, { title: string; prompt: string; color: string; emoji: string }> = {
  arrive: {
    title: "มาถึงแล้ว · Arrive",
    prompt: "วันนี้อยากทำอะไรให้เสร็จ?",
    color: STICKY_COLORS.find((c) => c.name === "Yellow")!.fill,
    emoji: "👋",
  },
  help: {
    title: "ขอความเห็น · Help",
    prompt: "อยากให้เพื่อนช่วยดูตรงไหน?",
    color: STICKY_COLORS.find((c) => c.name === "Pink")!.fill,
    emoji: "🙏",
  },
  helped: {
    title: "ช่วยได้ · I can help",
    prompt: "ช่วยเรื่องอะไร ให้ใคร?",
    color: STICKY_COLORS.find((c) => c.name === "Green")!.fill,
    emoji: "🙋",
  },
  close: {
    title: "ปิดท้าย · Close",
    prompt: "อะไรเดินหน้าไปแล้ว\nแล้วจะทำอะไรต่อ?",
    color: STICKY_COLORS.find((c) => c.name === "Blue")!.fill,
    emoji: "✅",
  },
};

const SIZE = 220;

/** One card as a sticky with its question as the starting text. */
/** The text a fresh card starts with. */
export const cardStartText = (kind: CardKind) => `${CARDS[kind].emoji} ${CARDS[kind].prompt}`;

/**
 * One card as a sticky with its question as the starting text. `example` cards
 * come with a template and only count once someone writes on them.
 */
export function cardSkeleton(kind: CardKind, x = 0, y = 0, example = false): ExcalidrawElementSkeleton {
  const card = CARDS[kind];
  return {
    type: "rectangle",
    x,
    y,
    width: SIZE,
    height: SIZE,
    backgroundColor: card.color,
    strokeColor: card.color,
    fillStyle: "solid",
    strokeWidth: 1,
    roughness: 0,
    roundness: { type: 3 },
    customData: example ? { card: kind, example: true } : { card: kind },
    label: { text: `${cardStartText(kind)}\n\n`, fontSize: 18, fontFamily: 6, strokeColor: "#1e1e1e" },
  } as ExcalidrawElementSkeleton;
}

export const isCardKind = (value: unknown): value is CardKind =>
  typeof value === "string" && (CARD_KINDS as readonly string[]).includes(value);
