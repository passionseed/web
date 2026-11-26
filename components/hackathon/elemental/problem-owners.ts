import { ELEMENT_DETAILS, type ElementDetail } from "./challenges";
import { ELEMENT_CHAPTERS, TEASER_MEDIA, type ElementChapter, type ElementKey } from "./media";

/**
 * The problem board on /hackathon/elemental/problems: every problem a team can
 * pick, one column per element, like the challenge board of a CTF.
 *
 * Each column starts with our own starter problem (ELEMENT_DETAILS). Then one
 * tile for each problem owner (เจ้าของโจทย์): an organisation or person who
 * works on the problem and agreed to put their name to it. Big invited them
 * on 2026-11-25 (company-brain private/hackathon-ops/voices-and-speakers.md);
 * the email promised their name as the element's problem owner on the
 * Elemental page.
 *
 * An element with no confirmed owner shows one locked tile until one says yes.
 *
 * To unlock a tile, add an entry to OWNER_PROBLEMS, only when all of these are
 * true:
 * - The owner said yes in writing, and the brain's voices page says so.
 * - Their name, role and problem are in their own words. Never write them for
 *   them, and never name or accuse a company (the hackathon's rule 1).
 * - A clip is used only with written permission, and stored under
 *   public/hackathon/elemental/owners/.
 * - No student, child or face of a minor in anything shown.
 */
export interface OwnerProblem {
  element: ElementKey;
  /** Lowercase letters, digits and _ only: it goes in the link (#water:enlaw) and the funnel. */
  id: string;
  /** The name, as they asked to be credited. */
  ownerTh: string;
  ownerRoleTh?: string;
  /** Their own public page (https). */
  ownerUrl?: string;
  /** The problem in one line, in their words. */
  titleTh: string;
  /** What they told us about it. */
  bodyTh: string;
  /** What they'd like teams to think about, if they said. */
  askTh?: string;
  /** A vertical clip, with written permission. */
  clip?: { src: string; poster?: string };
  /** Who confirmed, and when (YYYY-MM-DD). Not shown; it's the paper trail. */
  confirmed: { by: string; on: string };
  /** Sample tiles for preview links only. Never in OWNER_PROBLEMS. */
  demo?: true;
}

/** Problem owners who said yes. Empty until the first one confirms. */
export const OWNER_PROBLEMS: readonly OwnerProblem[] = [];

/**
 * Two made-up owners, so a reviewer can see an unlocked tile and its panel on
 * a preview link (?demo=1). The page never shows them on passionseed.org.
 */
export const DEMO_OWNER_PROBLEMS: readonly OwnerProblem[] = [
  {
    element: "water",
    id: "demo_water",
    ownerTh: "ชื่อเจ้าของโจทย์ (ตัวอย่าง)",
    ownerRoleTh: "ตำแหน่งหรือองค์กร (ตัวอย่าง)",
    ownerUrl: "https://www.passionseed.org",
    titleTh: "ตัวอย่างโจทย์: ประโยคเดียว ในคำพูดของเจ้าของโจทย์",
    bodyTh: "ตัวอย่างเท่านั้น ยังไม่มีเจ้าของโจทย์ยืนยัน ตรงนี้จะเป็นเรื่องที่เจ้าของโจทย์เล่าเอง",
    askTh: "ตัวอย่าง: สิ่งที่เจ้าของโจทย์อยากให้ทีมคิด",
    clip: { src: TEASER_MEDIA.video9x16, poster: TEASER_MEDIA.poster9x16 },
    confirmed: { by: "demo", on: "2026-11-26" },
    demo: true,
  },
  {
    element: "aether",
    id: "demo_aether",
    ownerTh: "ชื่อเจ้าของโจทย์ (ตัวอย่าง)",
    titleTh: "ตัวอย่างโจทย์ที่ไม่มีคลิป",
    bodyTh: "ตัวอย่างเท่านั้น ยังไม่มีเจ้าของโจทย์ยืนยัน",
    confirmed: { by: "demo", on: "2026-11-26" },
    demo: true,
  },
];

export type BoardTile =
  | { kind: "starter"; key: string; element: ElementKey }
  | { kind: "owner"; key: string; element: ElementKey; problem: OwnerProblem }
  | { kind: "locked"; key: string; element: ElementKey };

export interface BoardColumn {
  chapter: ElementChapter;
  detail: ElementDetail;
  tiles: BoardTile[];
}

/** The link key of an owner's tile: "water:enlaw". A starter tile's key is the element. */
export function ownerTileKey(problem: Pick<OwnerProblem, "element" | "id">): string {
  return `${problem.element}:${problem.id}`;
}

/** One column per element, in the landing page's order: the starter, the owners, or one locked tile. */
export function buildBoard(owners: readonly OwnerProblem[]): BoardColumn[] {
  return ELEMENT_CHAPTERS.map((chapter) => {
    const mine = owners.filter((o) => o.element === chapter.key);
    const tiles: BoardTile[] = [
      { kind: "starter", key: chapter.key, element: chapter.key },
      ...mine.map((problem): BoardTile => ({ kind: "owner", key: ownerTileKey(problem), element: chapter.key, problem })),
    ];
    if (mine.length === 0) tiles.push({ kind: "locked", key: `${chapter.key}:locked`, element: chapter.key });
    return { chapter, detail: ELEMENT_DETAILS[chapter.key], tiles };
  });
}

/** Open and locked tiles, for the count above the board. */
export function boardCounts(columns: readonly BoardColumn[]): { open: number; locked: number } {
  const tiles = columns.flatMap((c) => c.tiles);
  const locked = tiles.filter((t) => t.kind === "locked").length;
  return { open: tiles.length - locked, locked };
}
