import { z } from "zod";

/**
 * Community calendar: time blocks anyone signed in can add (meetups, work
 * sessions, deadlines) and join. Shown at /calendar and as a window on every
 * whiteboard. The weekly SHIFT alumni session and the viewer's team meetings
 * are merged in read-only. Everything here is Bangkok time.
 */

export const BLOCK_KINDS = ["meetup", "work", "deadline", "other"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

/** Where a block comes from; only "block" can be edited or joined here. */
export type BlockSource = "block" | "alumni" | "team";

export const KIND_STYLE: Record<BlockKind | "alumni" | "team", { label: string; color: string }> = {
  meetup: { label: "นัดเจอ", color: "#f59f00" },
  work: { label: "นั่งทำงานด้วยกัน", color: "#4dabf7" },
  deadline: { label: "เดดไลน์", color: "#fa5252" },
  other: { label: "อื่น ๆ", color: "#868e96" },
  alumni: { label: "SHIFT Alumni", color: "#9775fa" },
  team: { label: "ประชุมทีม", color: "#40c057" },
};

export type BlockPerson = { userId: string; name: string; avatarUrl: string | null };

export type CalendarBlock = {
  id: string;
  source: BlockSource;
  kind: BlockKind | "alumni" | "team";
  title: string;
  startsAt: string;
  endsAt: string;
  place: string | null;
  note: string | null;
  /** Share link of the board the block was made on, when that board has one. */
  boardUrl: string | null;
  createdBy: BlockPerson | null;
  people: BlockPerson[];
  joined: boolean;
  canEdit: boolean;
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

/** A block as typed into the form: a Bangkok date and start/end times. */
export const blockInputSchema = z
  .object({
    title: z.string().trim().min(1, "Give it a name").max(120),
    kind: z.enum(BLOCK_KINDS).default("meetup"),
    date: isoDate,
    start: clock,
    end: clock,
    place: optionalText(200),
    note: optionalText(1000),
    /** Attach the board this block was made on. */
    whiteboardId: z.string().uuid().nullable().optional(),
  })
  .refine((b) => b.end > b.start, { message: "End after it starts", path: ["end"] });

export type BlockInput = z.input<typeof blockInputSchema>;

/** "2026-10-25" + "19:00" in Bangkok, as an ISO instant. */
export function bangkokInstant(date: string, time: string): string {
  return new Date(`${date}T${time}:00+07:00`).toISOString();
}

/** An instant's Bangkok date and time: { date: "2026-10-25", time: "19:00" }. */
export function bangkokParts(iso: string): { date: string; time: string } {
  const shifted = new Date(Date.parse(iso) + 7 * 3600_000).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The Monday on or before a Bangkok date. */
export function weekStart(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

const DAY_NAMES = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** "ส. 25 ต.ค." */
export function shortThaiDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAY_NAMES[weekday]} ${d} ${MONTHS[m - 1]}`;
}

/** "19:00–21:00" for one block, in Bangkok time. */
export function timeRange(block: Pick<CalendarBlock, "startsAt" | "endsAt">): string {
  return `${bangkokParts(block.startsAt).time}–${bangkokParts(block.endsAt).time}`;
}

export type PlacedBlock = CalendarBlock & { day: number; top: number; height: number; lane: number; lanes: number };

/**
 * Lays blocks out on a week grid: which day column, minutes from the top of
 * the visible hours, and side-by-side lanes for blocks that overlap.
 */
export function layoutWeek(blocks: CalendarBlock[], monday: string, firstHour: number, lastHour: number): PlacedBlock[] {
  const placed: PlacedBlock[] = [];
  for (let day = 0; day < 7; day++) {
    const date = addDays(monday, day);
    const today = blocks
      .filter((b) => bangkokParts(b.startsAt).date === date)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || b.endsAt.localeCompare(a.endsAt));
    // Group overlapping blocks into clusters, then give each a lane in its cluster.
    let cluster: PlacedBlock[] = [];
    let clusterEnd = "";
    const flush = () => {
      const lanes = Math.max(1, ...cluster.map((b) => b.lane + 1));
      for (const b of cluster) placed.push({ ...b, lanes });
      cluster = [];
      clusterEnd = "";
    };
    for (const block of today) {
      if (cluster.length && block.startsAt >= clusterEnd) flush();
      const laneEnds = new Map<number, string>();
      for (const b of cluster) if ((laneEnds.get(b.lane) ?? "") < b.endsAt) laneEnds.set(b.lane, b.endsAt);
      let lane = 0;
      while ((laneEnds.get(lane) ?? "") > block.startsAt) lane++;
      const start = bangkokParts(block.startsAt);
      const startMin = Math.max(0, toMinutes(start.time) - firstHour * 60);
      const endParts = bangkokParts(block.endsAt);
      const endMin = endParts.date > date ? (lastHour - firstHour) * 60 : toMinutes(endParts.time) - firstHour * 60;
      const height = Math.max(20, Math.min((lastHour - firstHour) * 60, endMin) - startMin);
      cluster.push({ ...block, day, top: startMin, height, lane, lanes: 1 });
      if (block.endsAt > clusterEnd) clusterEnd = block.endsAt;
    }
    if (cluster.length) flush();
  }
  return placed;
}

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
