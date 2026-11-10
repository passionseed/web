import { SPYFALL_LOCATIONS } from "@/lib/content/spyfall-locations";
import { normalizeName, spyfallLocationSchema, type GameStart, type SpyfallLocation } from "@/lib/whiteboard/games";

/** The setup menu's choices, remembered per board so "Play again" starts from the last game. */
export type SetupDraft = {
  /** Online people the host unticked. Anyone not listed, including new arrivals, plays. */
  excluded: string[];
  spyCount: number;
  /** Round length in seconds, or null for no timer. */
  seconds: number | null;
  /** Preset locations switched off, by name. */
  presetOff: string[];
  custom: SpyfallLocation[];
};

export const DEFAULT_DRAFT: SetupDraft = { excluded: [], spyCount: 1, seconds: 480, presetOff: [], custom: [] };

export const TIMER_CHOICES: { label: string; seconds: number | null }[] = [
  { label: "ไม่จับเวลา", seconds: null },
  { label: "5 นาที", seconds: 300 },
  { label: "8 นาที", seconds: 480 },
  { label: "10 นาที", seconds: 600 },
];

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 32;
/** The server's deck limit (gameStartSchema). */
export const MAX_LOCATIONS = 80;

const key = (boardId: string) => `whiteboard-spyfall:${boardId}`;

export function loadDraft(boardId: string): SetupDraft {
  try {
    const saved = JSON.parse(localStorage.getItem(key(boardId)) ?? "null") as Partial<SetupDraft> | null;
    return saved && typeof saved === "object" ? cleanDraft({ ...DEFAULT_DRAFT, ...saved }) : DEFAULT_DRAFT;
  } catch {
    return DEFAULT_DRAFT;
  }
}

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

/** Drops anything in a saved draft the server would reject: bad shapes, bad custom locations, names a preset now uses. */
function cleanDraft(draft: SetupDraft): SetupDraft {
  const taken = new Set(SPYFALL_LOCATIONS.map((l) => normalizeName(l.name)));
  const custom: SpyfallLocation[] = [];
  for (const item of Array.isArray(draft.custom) ? draft.custom : []) {
    const parsed = spyfallLocationSchema.safeParse(item);
    if (!parsed.success || taken.has(normalizeName(parsed.data.name))) continue;
    taken.add(normalizeName(parsed.data.name));
    custom.push(parsed.data);
  }
  return {
    excluded: strings(draft.excluded),
    spyCount: [1, 2, 3].includes(draft.spyCount) ? draft.spyCount : DEFAULT_DRAFT.spyCount,
    seconds: TIMER_CHOICES.some((t) => t.seconds === draft.seconds) ? draft.seconds : DEFAULT_DRAFT.seconds,
    presetOff: strings(draft.presetOff),
    custom: custom.slice(0, MAX_LOCATIONS),
  };
}

export function saveDraft(boardId: string, draft: SetupDraft) {
  try {
    localStorage.setItem(key(boardId), JSON.stringify(draft));
  } catch {
    // Storage blocked: the next game just starts from the defaults.
  }
}

/** The deck the draft deals from: the presets left on, then the custom ones. */
export function draftDeck(draft: SetupDraft): SpyfallLocation[] {
  const off = new Set(draft.presetOff);
  return [...SPYFALL_LOCATIONS.filter((l) => !off.has(l.name)), ...draft.custom];
}

/** Turns the draft into the API body, or says what is missing. */
export function toGameStart(draft: SetupDraft, onlineIds: string[]): { ok: true; body: GameStart } | { ok: false; error: string } {
  const out = new Set(draft.excluded);
  const playerIds = onlineIds.filter((id) => !out.has(id));
  const locations = draftDeck(draft);
  if (playerIds.length < MIN_PLAYERS) return { ok: false, error: `ต้องมีผู้เล่นอย่างน้อย ${MIN_PLAYERS} คน` };
  if (playerIds.length > MAX_PLAYERS) return { ok: false, error: `เล่นได้สูงสุด ${MAX_PLAYERS} คน` };
  if (draft.spyCount >= playerIds.length) return { ok: false, error: "สายลับต้องน้อยกว่าจำนวนผู้เล่น" };
  if (locations.length < 2) return { ok: false, error: "เลือกสถานที่อย่างน้อย 2 แห่ง" };
  if (locations.length > MAX_LOCATIONS) return { ok: false, error: `เลือกสถานที่ได้สูงสุด ${MAX_LOCATIONS} แห่ง ปิดบางที่ก่อน` };
  return { ok: true, body: { locations, playerIds, spyCount: draft.spyCount, seconds: draft.seconds } };
}

/** Parses "name: role, role" style input from the custom location form. */
export function parseCustomLocation(name: string, roles: string): SpyfallLocation | null {
  const cleanName = name.trim().slice(0, 80);
  const cleanRoles = [...new Set(roles.split(/[,،、\n]/).map((r) => r.trim().slice(0, 80)).filter(Boolean))].slice(0, 12);
  if (!cleanName || cleanRoles.length === 0) return null;
  return { name: cleanName, roles: cleanRoles };
}

/** The same pick on every screen: a small string hash of the round id. */
export function pickBySeed<T>(seed: string, items: T[]): T | null {
  if (items.length === 0) return null;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return items[(h >>> 0) % items.length];
}
