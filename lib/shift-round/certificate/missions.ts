/**
 * SHIFT mission titles, shared by the certificate (page + image) and the web
 * admin. Missions are per-round config (`shift_rounds.missions`, v2 spec 2.1):
 * a round may use any keys, any count (1 to 10) and its own titles.
 *
 * Title order: the round's own title (config / snapshot), else the copy for a
 * known key, else the key itself made readable. Known keys are the SHIFT
 * default (steps 1 to 7 of the 9 SHIFT steps) plus the keys used by the first
 * beta build, so certificates issued before v2 still read well.
 *
 * Titles here carry no counts ("talk to 3 people"): the count is round config
 * and a certificate must stay true whatever the round asked for.
 */

export type Bilingual = { th: string; en: string };

/** SHIFT default mission keys, in SHIFT order (v2 spec 2.1). */
export const SHIFT_MISSION_KEYS = [
  "ideas",
  "interviews",
  "problem",
  "prototype",
  "testers",
  "change",
  "demo",
] as const;
export type KnownMissionKey = (typeof SHIFT_MISSION_KEYS)[number];

export const KNOWN_MISSION_TITLES: Record<string, Bilingual> = {
  ideas: { th: "คิด 3 ไอเดีย แล้วเลือก 1", en: "Three ideas, pick one" },
  interviews: { th: "คุยกับคนที่เจอปัญหาจริง", en: "Talk to people who have the problem" },
  problem: { th: "1 ปัญหา 1 กลุ่มคนใช้", en: "One problem, one user group" },
  prototype: { th: "สร้างต้นแบบที่คนอื่นลองได้", en: "A prototype others can try" },
  testers: { th: "ให้คนนอกลองใช้", en: "Outside testers try it" },
  change: { th: "ปรับจากที่คนลองบอก", en: "Change from what testers said" },
  demo: { th: "นำเสนอเดโม", en: "Present the demo" },
  // First beta build (6 missions). Kept so older snapshots keep their titles.
  first_contact: { th: "ติดต่อคนแรก", en: "First contact" },
  interviews_problem: { th: "สัมภาษณ์ + โจทย์", en: "Interviews + problem" },
  mvp: { th: "สร้าง MVP", en: "Build an MVP" },
  demo_post: { th: "โพสต์เดโม", en: "Post your demo" },
};

/** The two computed habits that follow the missions (steps 8 and 9 in SHIFT). */
export const HABIT_TITLES = {
  daily: { th: "โพสต์ความคืบหน้าทุกวัน", en: "Post progress every day" },
  sessions: { th: "เข้าเซสชันทุกครั้ง", en: "Join every session" },
} as const satisfies Record<string, Bilingual>;

/** A mission as it appears in round config, mission counts or a certificate snapshot. */
export interface MissionTitleSource {
  key: string;
  title_th?: string | null;
  title_en?: string | null;
}

const clean = (value: string | null | undefined): string | null => {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : null;
};

function readableKey(key: string): string {
  const text = key.replace(/[_-]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : key;
}

/** Bilingual title of one mission. Never empty. */
export function missionTitle(mission: MissionTitleSource): Bilingual {
  const known = KNOWN_MISSION_TITLES[mission.key];
  const th = clean(mission.title_th);
  const en = clean(mission.title_en);
  const fallback = readableKey(mission.key);
  return {
    th: th ?? known?.th ?? en ?? fallback,
    en: en ?? known?.en ?? th ?? fallback,
  };
}

/** Accepts `"ideas"` or `{key, title_th?, title_en?}` (both appear in snapshots). */
export function toMissionSource(raw: unknown): MissionTitleSource | null {
  if (typeof raw === "string") return raw.trim() ? { key: raw.trim() } : null;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.key !== "string" || !o.key.trim()) return null;
  return {
    key: o.key.trim(),
    title_th: typeof o.title_th === "string" ? o.title_th : null,
    title_en: typeof o.title_en === "string" ? o.title_en : null,
  };
}
