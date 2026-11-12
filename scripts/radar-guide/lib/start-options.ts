/**
 * The "first step" rule checked against a field's start options in
 * `radar:dump`: free, a real thing to make, and under two hours. Warnings
 * only: start options are free-text metadata, so the founder decides.
 */
import type { DumpSkill, DumpStartOption } from "./dump";

/** A first step must take less than this. */
export const FIRST_STEP_MAX_MINUTES = 120;

/** A `metadata.cost` that means free. */
export const FREE_COST = /ฟรี|free|ไม่มีค่าใช้จ่าย|^\s*0\s*(บาท|฿|thb)?\s*$/i;
const CERTIFICATE = /cert|ใบรับรอง|ประกาศนียบัตร|certificate/i;
const MAKES = /ทำ|สร้าง|เขียน|ส่ง|ลงมือ|โปรเจกต์|project|build|write|submit|ผลงาน/i;

/** "30 นาที" → 30, "2 ชม." → 120, "1-2 ชั่วโมง" → 120 (the upper end), "1 สัปดาห์" → 10080. Null when unreadable. */
export function parseDurationMinutes(text: unknown): number | null {
  if (typeof text !== "string" || !text.trim()) return null;
  const numbers = Array.from(text.matchAll(/\d+(?:\.\d+)?/g)).map((m) => Number(m[0]));
  const value = numbers.length ? Math.max(...numbers) : 1;
  if (/นาที|min/i.test(text)) return Math.round(value);
  if (/ชม|ชั่วโมง|hour|hr/i.test(text)) return Math.round(value * 60);
  if (/วัน|day/i.test(text)) return Math.round(value * 60 * 24);
  if (/สัปดาห์|อาทิตย์|week/i.test(text)) return Math.round(value * 60 * 24 * 7);
  if (/เดือน|month/i.test(text)) return Math.round(value * 60 * 24 * 30);
  return null;
}

export interface StartOptionCheck {
  option: Pick<DumpStartOption, "title_th" | "kind"> | null;
  warnings: string[];
}

/** The option a student sees first: the primary skill's first option, else the first skill's. */
export function firstStartOption(skills: readonly DumpSkill[]): DumpStartOption | null {
  const ordered = skills
    .slice()
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
  for (const skill of ordered) {
    const option = skill.start_options
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
    if (option) return option;
  }
  return null;
}

export function checkFirstStartOption(skills: readonly DumpSkill[] | undefined): StartOptionCheck {
  if (!skills || skills.length === 0) {
    return { option: null, warnings: ["No published skills: the deck has no skill rail to point at."] };
  }
  const option = firstStartOption(skills);
  if (!option) return { option: null, warnings: ["No published start options on any skill."] };

  const warnings: string[] = [];
  const label = `First start option "${option.title_th}" (${option.kind})`;
  const cost = option.metadata.cost;
  if (typeof cost !== "string" || !cost.trim()) warnings.push(`${label}: no metadata.cost, so it is not shown as free.`);
  else if (!FREE_COST.test(cost)) warnings.push(`${label}: cost "${cost}" is not free. The first step must be free.`);

  const minutes = parseDurationMinutes(option.metadata.duration);
  if (minutes === null) warnings.push(`${label}: no readable metadata.duration; it must take under 2 hours.`);
  else if (minutes >= FIRST_STEP_MAX_MINUTES) {
    warnings.push(`${label}: takes about ${minutes} minutes; the first step must take under 2 hours.`);
  }

  const text = `${option.title_th} ${option.summary_th ?? ""}`;
  if (CERTIFICATE.test(text)) warnings.push(`${label}: looks like a certificate. Certificates go last.`);
  if (option.kind !== "project" && option.kind !== "pathlab" && !MAKES.test(text)) {
    warnings.push(`${label}: does not say what the student makes at the end.`);
  }
  return { option, warnings };
}
