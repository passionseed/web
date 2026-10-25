import { cardStartText, isCardKind, type CardKind } from "@/lib/whiteboard/cards";

/**
 * Attendance for a booked session, read from the room board's cards. Counts
 * only: who placed which card is already visible on the board to everyone in
 * the room, and nothing per person is stored or reported beyond that.
 */

type BoardElement = {
  id?: string;
  isDeleted?: boolean;
  containerId?: string | null;
  text?: string;
  /** Excalidraw keeps the text before wrapping here; `text` has line breaks added. */
  originalText?: string;
  customData?: Record<string, unknown> | null;
};

/**
 * Who a card counts for. A card someone placed counts for them. An example card
 * from the template counts only once its text was changed, for whoever changed it.
 */
function cardAuthor(card: BoardElement, kind: CardKind, text: BoardElement | undefined): string | null {
  if (!card.customData?.example) {
    const author = card.customData?.createdBy;
    return typeof author === "string" ? author : null;
  }
  // Compare without whitespace: wrapping adds line breaks that nobody typed.
  const squash = (value: string) => value.replace(/\s+/g, "");
  const written = squash(text?.originalText ?? text?.text ?? "");
  if (!written || written === squash(cardStartText(kind))) return null;
  const editor = text?.customData?.updatedBy;
  return typeof editor === "string" ? editor : null;
}

export type Attendance = {
  booked: number;
  /** Placed an Arrive card. */
  arrived: number;
  /** Of those who booked, how many arrived. */
  bookedArrived: number;
  /** Arrived without booking. */
  walkIns: number;
  askedHelp: number;
  gaveHelp: number;
  /** Placed a Close card (a next action). */
  closed: number;
};

export function attendanceFrom(elements: readonly BoardElement[], bookedIds: readonly string[]): Attendance {
  const by: Record<CardKind, Set<string>> = { arrive: new Set(), help: new Set(), helped: new Set(), close: new Set() };
  const textIn = new Map(elements.filter((el) => el.containerId && !el.isDeleted).map((el) => [el.containerId!, el]));
  for (const el of elements) {
    if (el.isDeleted) continue;
    const kind = el.customData?.card;
    if (!isCardKind(kind)) continue;
    const author = cardAuthor(el, kind, el.id ? textIn.get(el.id) : undefined);
    if (author) by[kind].add(author);
  }
  const booked = new Set(bookedIds);
  // Anyone who put down any card was there, even if they skipped the Arrive card.
  const present = new Set([...by.arrive, ...by.help, ...by.helped, ...by.close]);
  const bookedArrived = [...present].filter((id) => booked.has(id)).length;
  return {
    booked: booked.size,
    arrived: present.size,
    bookedArrived,
    walkIns: present.size - bookedArrived,
    askedHelp: by.help.size,
    gaveHelp: by.helped.size,
    closed: by.close.size,
  };
}
